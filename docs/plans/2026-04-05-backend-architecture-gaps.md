# Backend Architecture Gap Analysis & System Design Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the Fastify backend with production-grade patterns: exponential backoff, timeouts, server-side caching, efficient route handling, and secure client communication.

**Architecture:** Fastify (:5001) owns all API routes. This plan covers gaps discovered during migration audit.

---

## 1. Critical Gaps Found

### 1.1 Missing Env Variables (not in `.env.example`)

| Variable | Used By | Type | Action |
|---|---|---|---|
| `BACKEND_PORT` | server/index.ts | Config | Add to .env.example |
| `BACKEND_URL` | next.config.ts rewrites | Config | Add to .env.example |
| `OG_BROKER_PRIVATE_KEY` | og-broker.ts, og-compute.ts, gpu/register | Secret | Add to .env.example |
| `OG_STORAGE_RPC` | og-storage.ts | Config | Add to .env.example |
| `NEXT_PUBLIC_OG_EXPLORER_URL` | GPUStepper.tsx | Frontend config | Add to .env.example |
| `NEXT_PUBLIC_APP_ENV` | Eruda provider | Frontend config | Add to .env.example |

### 1.2 No Timeouts on ANY External HTTP Call

**Zero** `AbortController` or `AbortSignal` usage across the entire codebase. All `fetch()` calls can hang indefinitely:

| File | Call | Risk |
|---|---|---|
| `og-broker.ts:84` | Provider inference endpoint | Hangs if provider down |
| `blocky402.ts:40,61,80` | Blocky402 verify/settle/networks | Hangs if facilitator down |
| `hedera.ts:325` | Mirror Node REST API | Hangs if mirror node slow |
| `verify-proof route` | World ID Developer Portal API | Hangs if API slow |
| `activity route` | Mirror Node messages query | Hangs if mirror node slow |
| `agent-decision route` | Self-fetch to /api/resources | Hangs if own server overloaded |

### 1.3 No Retry or Exponential Backoff

Only retry pattern: World ID v4→v2 fallback (immediate, not backoff).
Hedera SDK, Blocky402 payments, 0G broker inference — all fail on first error with no recovery.

### 1.4 Circuit Breaker Only on Cache Layer

`src/lib/cache.ts` circuit breaker protects cached fetch paths (seer providers, shield reputation). But these have no protection:
- Hedera SDK transactions (mint, transfer, audit)
- Blocky402 payment verification/settlement
- Direct ethers contract calls (predictions, GPU, proposals)

### 1.5 Client Communication Inefficiencies

| Issue | Impact | Location |
|---|---|---|
| **Duplicate activity polling** | 2 components poll `/api/activity` every 15s independently | predictions-content + ActivityFeed |
| **Sequential waterfall** in TradingDesk | Shield→Lens→Seer→Edge (4 serial calls + 1s artificial delay) | TradingDesk.tsx |
| **N+1 proposal queries** | `GET /api/proposals?agentId=X` called per agent | ProposalQueue.tsx |
| **No client cache** | Every fetch hits server, no SWR/React Query/localStorage | All components |
| **No HTTP cache headers** | Server returns no Cache-Control on cacheable responses | All GET endpoints |
| **ISR mismatch** | activity revalidate=10s, client polls every 15s — gap window | activity route |

---

## 2. System Design: Fastify Utility Layer

### 2.1 Timeout Wrapper (`server/utils/fetch-with-timeout.ts`)

```typescript
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const { timeout = 10_000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}
```

**Timeout budgets:**
| Operation | Timeout | Reason |
|---|---|---|
| World ID Developer Portal API | 10s | External API, can be slow |
| Hedera Mirror Node | 8s | REST query, read-only |
| Blocky402 verify/settle | 15s | Payment settlement, must complete |
| 0G Broker inference | 30s | AI inference can be slow |
| 0G Chain RPC (ethers) | 10s | Contract reads |
| Self-fetch (agent-decision) | 5s | Internal, should be fast |

### 2.2 Exponential Backoff Retry (`server/utils/retry.ts`)

```typescript
interface RetryOptions {
  maxRetries?: number;     // default: 3
  baseDelay?: number;      // default: 500ms
  maxDelay?: number;       // default: 10_000ms
  retryOn?: (error: unknown) => boolean;  // default: retry on network/5xx
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 500, maxDelay = 10_000 } = options;
  const retryOn = options.retryOn ?? isRetryable;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !retryOn(error)) throw error;
      const delay = Math.min(baseDelay * 2 ** attempt + jitter(), maxDelay);
      await sleep(delay);
    }
  }
  throw new Error('unreachable');
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return false;  // timeout, don't retry
    if (error.message.includes('429')) return true;  // rate limited
    if (error.message.includes('5')) return true;    // 5xx
    if (error.message.includes('ECONNREFUSED')) return true;
    if (error.message.includes('ETIMEDOUT')) return true;
  }
  return false;
}

function jitter(): number { return Math.random() * 200; }
function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
```

**Retry policies by operation:**
| Operation | Retries | Base Delay | Retryable Errors |
|---|---|---|---|
| Hedera SDK transactions | 2 | 1000ms | Network errors, BUSY status |
| Blocky402 verify | 2 | 500ms | Network errors, 5xx |
| Blocky402 settle | 1 | 1000ms | Network only (idempotency risk) |
| World ID verify | 1 | 500ms | Network errors, 5xx |
| 0G broker inference | 1 | 2000ms | Network errors |
| Mirror Node query | 2 | 500ms | Network, 5xx |
| ethers contract read | 2 | 500ms | Network errors |
| ethers contract write | 0 | N/A | **Never retry writes** (nonce risk) |

### 2.3 Enhanced Circuit Breaker (`server/utils/circuit-breaker.ts`)

Extend existing `src/lib/cache.ts` circuit breaker to protect ALL external services:

```typescript
// Per-service circuit breakers
const breakers = {
  'hedera-sdk': new CircuitBreaker({ maxFailures: 3, openDuration: 30_000 }),
  'blocky402':  new CircuitBreaker({ maxFailures: 3, openDuration: 60_000 }),
  'og-broker':  new CircuitBreaker({ maxFailures: 3, openDuration: 30_000 }),
  'og-rpc':     new CircuitBreaker({ maxFailures: 5, openDuration: 15_000 }),
  'world-id':   new CircuitBreaker({ maxFailures: 3, openDuration: 30_000 }),
  'mirror-node': new CircuitBreaker({ maxFailures: 5, openDuration: 20_000 }),
};
```

### 2.4 Server-Side Response Cache (`server/plugins/response-cache.ts`)

Fastify plugin that caches GET endpoint responses in-memory with configurable TTL:

```typescript
// Per-route cache config
const CACHE_CONFIG: Record<string, { ttl: number; varyBy?: string[] }> = {
  '/api/resources':       { ttl: 30_000, varyBy: ['sort', 'type'] },
  '/api/agents':          { ttl: 300_000 },  // 5 min
  '/api/predictions':     { ttl: 10_000 },
  '/api/activity':        { ttl: 10_000 },
  '/api/agent-decision':  { ttl: 30_000, varyBy: ['type'] },
  '/api/hedera/audit':    { ttl: 15_000, varyBy: ['topicId'] },
  '/api/proposals':       { ttl: 15_000, varyBy: ['agentId'] },
  '/.well-known/agent-card.json': { ttl: 300_000 },  // 5 min
};
```

Also sets proper HTTP cache headers:
```
Cache-Control: public, max-age=30, stale-while-revalidate=60
ETag: <hash of response body>
```

### 2.5 HTTP Cache Headers for Client Efficiency

| Endpoint | Cache-Control | Reason |
|---|---|---|
| `GET /api/resources` | `public, max-age=30, s-maxage=30` | Changes on registration (~hourly) |
| `GET /api/agents` | `public, max-age=300` | Agent list rarely changes |
| `GET /api/predictions` | `public, max-age=10` | Market data, moderate staleness ok |
| `GET /api/activity` | `public, max-age=10` | Ticker, moderate staleness ok |
| `GET /api/agent-decision` | `public, max-age=30` | Ranking updates ~hourly |
| `GET /.well-known/agent-card.json` | `public, max-age=300` | Static metadata |
| `GET /api/hedera/audit` | `public, max-age=15` | Mirror node data, slight delay ok |
| `GET /api/proposals` | `public, max-age=15` | Proposal state changes on action |
| `GET /api/payments` | `private, no-cache` | Financial data, always fresh |
| `POST /*` | `no-store` | Mutations never cached |

---

## 3. Security-as-Design

### 3.1 Request Validation (Already Planned via Zod)

Every route gets Zod schema validation via `fastify-type-provider-zod`. This covers:
- Body parsing with strict types
- Query param coercion + validation
- Path param validation (`:id`, `:name`)
- Automatic 400 responses with field-level error details

### 3.2 Rate Limiting Enhancement

Current: Per-IP per-path sliding window (60s).

Enhance with tiered limits:

| Tier | Endpoints | Limit | Window |
|---|---|---|---|
| Public read | /api/resources, /api/predictions, /api/agents, /api/activity | 60 req | 60s |
| Auth read | /api/world-id/check, /api/payments GET, /api/reputation GET | 30 req | 60s |
| Write (cheap) | /api/predictions POST, /api/reputation POST | 10 req | 60s |
| Write (expensive) | /api/verify-proof, /api/gpu/register, /api/agents/register | 5 req | 60s |
| Payment | /api/payments POST, /api/initiate-payment | 3 req | 60s |
| Agent A2A/MCP | Per-agent: seer:30, edge:5, shield:30, lens:10 | Varies | 60s |

### 3.3 Helmet-Style Security Headers

Add via Fastify `onSend` hook:

```typescript
app.addHook('onSend', async (_request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '0');
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});
```

### 3.4 Request Size Limits

```typescript
const app = Fastify({
  bodyLimit: 1_048_576,  // 1MB max body (default is 1MB, explicit)
  maxParamLength: 200,   // URL param length cap
});
```

### 3.5 CORS Tightening (Production)

Current: `origin: true` (allows all). Production should restrict:

```typescript
await app.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.NEXT_PUBLIC_APP_URL!, 'https://vocaid-hub.vercel.app']
    : true,
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-PAYMENT'],
});
```

---

## 4. Route Handling Efficiency

### 4.1 Batch Endpoints (Reduce N+1)

**New: `GET /api/proposals/batch?agentIds=1,2,3,4,5`**
- Replaces N separate `/api/proposals?agentId=X` calls
- Single contract read loop, single response

**New: `GET /api/resources/summary`**
- Lightweight endpoint returning counts + top resource per type
- Used by dashboard without fetching full resource list

### 4.2 Refactor Agent-Decision Self-Fetch

Current: `agent-decision/route.ts` self-fetches `${baseUrl}/api/resources?sort=quality` via HTTP.
Fix: Import and call the resources logic directly as a function, eliminating the network round-trip.

### 4.3 Fastify Route Registration Order

Register routes from most-specific to least-specific to avoid conflicts:
```typescript
// Specific param routes first
await app.register(predictionSubRoutes);  // /api/predictions/:id/bet|claim|resolve
await app.register(agentSubRoutes);       // /api/agents/:name/a2a|mcp

// Then general routes
await app.register(predictionRoutes);     // /api/predictions
await app.register(agentRoutes);          // /api/agents

// Well-known last (different prefix)
await app.register(wellKnownRoutes);      // /.well-known/*
```

### 4.4 Graceful Shutdown

```typescript
const signals = ['SIGTERM', 'SIGINT'] as const;
for (const signal of signals) {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  });
}
```

---

## 5. Caching Strategy (Server-Side)

### 5.1 What to Cache on Fastify

| Data | Cache Layer | TTL | Invalidation |
|---|---|---|---|
| Agent list (IdentityRegistry) | In-memory Map | 5 min | On register POST |
| Resource list (aggregated) | In-memory Map | 30s | On register POST |
| Prediction markets | In-memory Map | 10s | On create/resolve POST |
| Reputation scores | In-memory Map | 60s | On feedback POST |
| Agent cards (filesystem) | In-memory Map | 5 min | Never (static files) |
| Hedera audit trail | In-memory Map | 15s | Time-based only |
| 0G provider list | In-memory Map | 30s | Already in cache.ts |
| World ID verification | In-memory Map | 15s | Already in world-id.ts |

### 5.2 Cache Invalidation Strategy

**Write-through invalidation:** When a POST/mutation succeeds, invalidate related cache keys:

```typescript
// After successful prediction creation
cacheInvalidate('predictions:list');

// After agent registration
cacheInvalidate('agents:list');
cacheInvalidate('resources:*');  // Resources includes agents

// After reputation feedback
cacheInvalidate(`reputation:${agentId}`);
cacheInvalidate('resources:*');  // Resources includes reputation signals
```

### 5.3 Singleton Initialization Cache

These SDK clients should initialize ONCE at server startup and persist:

| Client | Current | Fastify Benefit |
|---|---|---|
| Hedera `Client` | Singleton in hedera.ts | Survives across requests (no cold start) |
| 0G `ZGComputeNetworkBroker` | Singleton in og-broker.ts | Survives across requests |
| World ID `IDKit.initServer()` | Called at startup | WASM loaded once, stays in memory |
| ethers `JsonRpcProvider` | Created per-request in route files | **Move to singleton** in server startup |
| viem `PublicClient` | Created per-call in og-chain.ts | **Move to singleton** |

**Action:** Create `server/clients.ts` that initializes singleton chain clients at startup:

```typescript
// server/clients.ts
import { ethers } from 'ethers';
import { createPublicClient, http } from 'viem';

export const ogProvider = new ethers.JsonRpcProvider(process.env.OG_RPC_URL);
export const ogPublicClient = createPublicClient({ chain: ogGalileo, transport: http(OG_RPC_URL) });
// Reuse across all routes instead of creating per-request
```

---

## 6. Client Communication Efficiency

### 6.1 Eliminate Duplicate Polling

**Activity feed:** Only one component should own the polling interval. Pass data down via React context or props.

### 6.2 Parallelize TradingDesk Pipeline

Current: Shield → Lens → Seer → Edge (sequential + artificial delays)
Proposed: Shield + Lens in parallel → Seer → Edge (user-triggered)

### 6.3 Batch Proposal Queries

New endpoint: `GET /api/proposals/batch?agentIds=1,2,3,4,5` returns all proposals in one response.

### 6.4 ETag + Conditional Requests

Server returns `ETag` header on cacheable GET responses. Client sends `If-None-Match`. Server returns `304 Not Modified` if unchanged — saves bandwidth on polling endpoints.

---

## 7. Implementation Priority

### Wave 2.5 (Before Route Migration)

| Task | Files | Effort |
|---|---|---|
| Create `server/utils/fetch-with-timeout.ts` | 1 new file | 30 min |
| Create `server/utils/retry.ts` | 1 new file | 30 min |
| Create `server/utils/circuit-breaker.ts` | 1 new file | 30 min |
| Create `server/plugins/response-cache.ts` | 1 new file | 1 hr |
| Create `server/plugins/security-headers.ts` | 1 new file | 15 min |
| Create `server/clients.ts` (singleton providers) | 1 new file | 30 min |
| Add missing env vars to `.env.example` | 1 file | 15 min |
| Add graceful shutdown to `server/index.ts` | 1 file modify | 15 min |

### During Wave 3 Routes

- Apply `fetchWithTimeout` to all external fetch calls during port
- Apply `withRetry` to critical paths (Hedera, Blocky402, World ID)
- Use singleton clients from `server/clients.ts` instead of per-request creation
- Set Cache-Control headers on all GET responses
- Apply tiered rate limits per endpoint category

### Wave 4.5 (Post-Migration Polish)

- Batch proposals endpoint
- Resources summary endpoint
- ETag conditional responses
- CORS production tightening
- Client-side SWR/React Query adoption
