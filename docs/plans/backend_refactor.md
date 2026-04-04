# Backend Refactor — Fastify + Zod + PM2 Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all 25 API routes from Next.js serverless to a standalone Fastify server with Zod validation, managed by PM2 — fixes WASM crash, satisfies World ID bounty requirement, enables persistent process for SDK singletons.

**Architecture:** Next.js (:3000) serves SSR/UI only. Fastify (:5001) owns all `/api/*` routes. `next.config.ts` rewrites proxy transparently. PM2 manages all processes. Shared code stays in `src/lib/` — no duplication.

**Tech Stack:** Fastify 5, fastify-type-provider-zod, Zod 3, PM2, tsx (dev runner), fastify-plugin, @fastify/cors, @fastify/cookie, pino-pretty

```text
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Next.js    │     │  Fastify     │     │  OpenClaw    │
│  :3000      │��───▶│  :5001       │     │  :18789      │
│  (frontend) │     │  (backend)   │     │  (agents)    │
│  SSR + UI   │     │  All /api/*  │     │  Soul + Skills│
└─────────────┘     └──────────────┘     └──────────────┘
      │                    │                     │
      └────────────────────┼─────────────────────┘
                           │
              ┌────────���───┼────────────┐
              │            │            │
         World Chain    0G Chain    Hedera
         (Trust)        (Verify)    (Settle)
```

---

## Private Keys & Security (Backend-Only Env Vars)

| Env Variable | Used By | Operation |
|---|---|---|
| `PRIVATE_KEY` | predictions, edge/trade, gpu/register, agents/register, proposals, world-id | Signs 0G + World Chain txs via ethers.Wallet / viem walletClient |
| `HEDERA_OPERATOR_KEY` / `HEDERA_PRIVATE_KEY` | hedera.ts | Signs ALL Hedera ops: HTS mint/transfer, HCS messages, scheduled txs |
| `OG_BROKER_PRIVATE_KEY` | og-broker.ts, og-compute.ts, gpu/register | ZGComputeNetworkBroker, inference billing/settlement |
| `RP_SIGNING_KEY` | rp-signature | Signs World ID RP requests via WASM signRequest() |
| `NEXTAUTH_SECRET` | auth | JWT signing/verification |
| `DEMO_WALLET_KEY` | og-chain.ts | Alt signer for reputation feedback |

---

## Wave 1: Foundation

**Session:** Sequential, must complete before all other waves
**Creates:** Fastify skeleton + Zod provider + WASM init + PM2 config + dev.sh + rewrites

### Files

- Create: `server/index.ts`
- Create: `server/tsconfig.json`
- Create: `ecosystem.config.cjs`
- Modify: `package.json` (add deps + scripts)
- Modify: `scripts/dev.sh` (add `[api]` tagged process)
- Modify: `next.config.ts` (add rewrites)

### Details

**Dependencies:** `fastify @fastify/cors @fastify/cookie fastify-type-provider-zod zod pm2 fastify-plugin pino-pretty`

**`server/index.ts`:** Fastify app on :5001 with Zod type provider, CORS, cookie parsing, `/health` endpoint, `IDKit.initServer()` at startup for WASM.

**`server/tsconfig.json`:** Extends root tsconfig, adds `@/*` → `../src/*` path alias, ESNext module, bundler resolution.

**`ecosystem.config.cjs`:** PM2 config with 3 apps: `api` (tsx watch server/index.ts), `next` (next dev --turbopack), `claw` (openclaw). Each with autorestart, merge_logs, log_date_format.

**`package.json` scripts:**
```json
"dev:backend": "npx tsx watch server/index.ts",
"dev:pm2": "npx pm2 start ecosystem.config.cjs",
"dev:logs": "npx pm2 logs --lines 50",
"dev:stop": "npx pm2 delete all",
"build:backend": "npx tsc -p server/tsconfig.json",
"start:backend": "node dist/server/index.js"
```

**`next.config.ts` rewrites:**
```typescript
async rewrites() {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5001';
  return {
    fallback: [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/.well-known/:path*', destination: `${backendUrl}/.well-known/:path*` },
    ],
  };
},
```

**`scripts/dev.sh`:** Add `[api]` section between ngrok and Next.js, start `npm run dev:backend` with tagged output, health check loop, add to status summary.

### Verify

```bash
npm run dev:backend
curl http://localhost:5001/health
# Expected: { "status": "ok", "wasm": true, "port": 5001 }
```

### Commit

```bash
git add server/ ecosystem.config.cjs package.json package-lock.json scripts/dev.sh next.config.ts
git commit -m "feat: Fastify backend skeleton + Zod provider + WASM init + PM2 config"
```

---

## Wave 2: Plugins + Lib Refactor

**Session:** Sequential, depends on Wave 1
**Creates:** Auth, World ID gate, rate limit, error handler, x402 plugins + Zod common schemas
**Refactors:** src/lib files that import Next.js types

### Files

- Create: `server/plugins/auth.ts`
- Create: `server/plugins/world-id-gate.ts`
- Create: `server/plugins/rate-limit.ts`
- Create: `server/plugins/error-handler.ts`
- Create: `server/plugins/x402.ts`
- Create: `server/schemas/common.ts`
- Modify: `server/index.ts` (register plugins)
- Refactor: `src/lib/world-id.ts` (remove requireWorldId + withWorldIdGate, keep chain logic)
- Delete: `src/lib/rate-limit.ts` (replaced by plugin)
- Move: `src/lib/x402-middleware.ts` → `server/plugins/x402.ts` (rewrite for Fastify)

### Plugin Details

**`server/plugins/auth.ts`:** Fastify plugin that decodes NextAuth JWT from cookie (`next-auth.session-token` or `__Secure-next-auth.session-token`) or `Authorization` header. Uses `decode` from `next-auth/jwt` with `NEXTAUTH_SECRET`. Decorates `request.session` with `{ user: { id, walletAddress, username } | null }`.

**`server/plugins/world-id-gate.ts`:** Fastify plugin that decorates `app.requireWorldId` as a preHandler hook. Checks `request.session.user.id`, calls `isVerifiedOnChain()` from `src/lib/world-id.ts`, sets `request.verifiedAddress`. Returns 401 (no auth) or 403 (not verified). Depends on auth plugin.

**`server/plugins/rate-limit.ts`:** In-memory sliding window per IP+path. `app.checkRateLimit(ip, path, max, windowMs)` returns null (allowed) or `{ retryAfter, limit, resetAt }`. Stale entry cleanup every 5 min.

**`server/plugins/error-handler.ts`:** `app.setErrorHandler` — ZodError → 400 with field details, Fastify validation → 400, everything else → log server-side + generic 500 to client (P-080 pattern).

**`server/plugins/x402.ts`:** Port `withX402Payment()` from `src/lib/x402-middleware.ts` as Fastify preHandler. Reads `X-PAYMENT` header, verifies via `verifyPayment()`, settles via `settlePayment()` from `src/lib/blocky402.ts`.

**`server/schemas/common.ts`:** Shared Zod schemas — `AddressSchema`, `PaginationSchema`, `ErrorResponseSchema`, `SuccessResponseSchema`.

### src/lib Refactor

**`src/lib/world-id.ts`** — Remove lines 4, 6, 107-145:
- Delete: `import { NextResponse } from "next/server"`, `import { auth } from "@/auth"`
- Delete: `requireWorldId()` function (→ moved to `server/plugins/world-id-gate.ts`)
- Delete: `withWorldIdGate()` function (→ moved to plugin)
- Keep: `getPublicClient()`, `getWalletClient()`, `registerOnChain()`, `isVerifiedOnChain()`, `clearVerificationCache()`, `getGateAddress()`

**`src/lib/rate-limit.ts`** — Delete entirely, replaced by `server/plugins/rate-limit.ts`.

**`src/lib/x402-middleware.ts`** — Delete entirely, ported to `server/plugins/x402.ts`.

### Verify

```bash
npm run dev:backend
# Plugins should load without errors
curl http://localhost:5001/health
npx tsc --noEmit --skipLibCheck  # No TS errors in src/lib after refactor
```

### Commit

```bash
git add server/plugins/ server/schemas/ server/index.ts src/lib/world-id.ts
git rm src/lib/rate-limit.ts src/lib/x402-middleware.ts
git commit -m "feat: Fastify plugins (auth, world-id, rate-limit, error, x402) + refactor src/lib"
```

---

## Wave 3A: World ID + Auth Routes

**Session:** Parallel with 3B and 3C, depends on Wave 2

### Files

- Create: `server/schemas/world-id.ts`
- Create: `server/routes/world-id.ts`
- Create: `server/routes/auth.ts`
- Modify: `server/index.ts` (register routes)

### Routes (4 endpoints)

| Route | Method | Chain | Keys | Gate |
|---|---|---|---|---|
| `/api/rp-signature` | POST | World ID WASM | `RP_SIGNING_KEY` | Rate limit |
| `/api/verify-proof` | POST | World Chain + Hedera | `PRIVATE_KEY` + `HEDERA_OPERATOR_KEY` | Rate limit 10/min |
| `/api/world-id/check` | GET | World Chain (read) | None | Auth session |
| `/api/auth/*` | GET/POST | None | `NEXTAUTH_SECRET` | None |

### Chain Operations Detail

**POST `/api/rp-signature`** — `signRequest(action, SIGNING_KEY)` via WASM (already initialized in server/index.ts). Returns `{ rp_id, sig, nonce, created_at, expires_at }`.

**POST `/api/verify-proof`** — Multi-chain:
1. Call World Developer Portal API v4 (`/api/v4/verify/${rp_id}`) with fallback to v2 (`/api/v2/verify/${app_id}`)
2. On success: `registerOnChain()` → CredentialGate.verifyAndRegister on World Chain (writeContract, `PRIVATE_KEY`)
3. `mintCredential()` ��� HTS NFT mint on Hedera (`HEDERA_OPERATOR_KEY`)
4. `logAuditMessage()` → HCS TopicMessageSubmit on Hedera (`HEDERA_OPERATOR_KEY`)
5. Port `decodeProof()` helper (ABI-encoded proof → 8-element bigint tuple)

**GET `/api/world-id/check`** — `isVerifiedOnChain()` → CredentialGate.isVerified readContract on World Chain. Requires auth session to prevent address enumeration.

**`/api/auth/*`** — Proxy to Next.js :3000 for full NextAuth flow (signin, signout, callback). Add GET `/api/auth/session` that returns decoded JWT from Fastify auth plugin.

### Zod Schemas

```typescript
// server/schemas/world-id.ts
RpSignatureBodySchema = z.object({ action: z.string().min(1) })
VerifyProofBodySchema = z.object({
  payload: z.object({ merkle_root: z.string().optional(), nullifier_hash: z.string().optional(), proof: z.string().optional() }).passthrough(),
  action: z.string(),
  signal: z.string().optional(),
})
WorldIdCheckQuerySchema = z.object({ address: AddressSchema })
```

### Reuse from src/lib

- `signRequest`, `IDKit` from `@worldcoin/idkit`
- `isVerifiedOnChain`, `registerOnChain`, `clearVerificationCache` from `src/lib/world-id.ts`
- `mintCredential`, `logAuditMessage` from `src/lib/hedera.ts`

### Source Files to Port

- `src/app/api/rp-signature/route.ts` (44 lines)
- `src/app/api/verify-proof/route.ts` (146 lines)
- `src/app/api/world-id/check/route.ts` (47 lines)
- `src/app/api/auth/[...nextauth]/route.ts`

### Commit

```bash
git add server/schemas/world-id.ts server/routes/world-id.ts server/routes/auth.ts server/index.ts
git commit -m "feat: migrate World ID + auth routes to Fastify with Zod validation"
```

---

## Wave 3B: Chain Interaction Routes

**Session:** Parallel with 3A and 3C, depends on Wave 2

### Files

- Create: `server/schemas/predictions.ts`, `server/schemas/gpu.ts`
- Create: `server/routes/predictions.ts`, `server/routes/gpu.ts`, `server/routes/edge.ts`, `server/routes/seer.ts`, `server/routes/reputation.ts`
- Modify: `server/index.ts` (register routes)

### Routes (9 endpoints)

| Route | Method | Chain | Keys | Gate |
|---|---|---|---|---|
| `/api/predictions` | GET | 0G (read) | None | None |
| `/api/predictions` | POST | 0G (write) | `PRIVATE_KEY` | None |
| `/api/predictions/:id/bet` | POST | 0G (write+value) | `PRIVATE_KEY` | None |
| `/api/predictions/:id/claim` | POST | 0G (write) | `PRIVATE_KEY` | None |
| `/api/predictions/:id/resolve` | POST | 0G (write) + Hedera (HCS) | `PRIVATE_KEY` + `HEDERA_OPERATOR_KEY` | None |
| `/api/gpu/list` | GET | 0G broker (TEE) | `OG_BROKER_PRIVATE_KEY` | World ID |
| `/api/gpu/register` | POST | 0G (write×2) | `OG_BROKER_PRIVATE_KEY` | World ID |
| `/api/edge/trade` | POST | 0G (write) + Hedera (HCS) | `PRIVATE_KEY` + `HEDERA_OPERATOR_KEY` | World ID |
| `/api/seer/inference` | POST | 0G broker + Hedera (HCS) | `OG_BROKER_PRIVATE_KEY` + `HEDERA_OPERATOR_KEY` | World ID |
| `/api/reputation` | GET | 0G (read) | None | World ID |
| `/api/reputation` | POST | 0G (write) | `PRIVATE_KEY` | World ID |

### Chain Operations Detail

**Predictions (5 endpoints):** All use ethers.Wallet with `PRIVATE_KEY` on 0G Chain for ResourcePrediction contract. GET is read-only with demo fallback. resolve also writes to Hedera HCS audit trail.

**GPU (2 endpoints):** list uses og-compute `listProviders()` + `verifyProvider()` (TEE attestation via OG_BROKER_PRIVATE_KEY). register does TEE verify + IdentityRegistry.register (ERC-8004) + GPUProviderRegistry.registerProvider (writeContract×2).

**Edge trade:** Two actions — `hire` (Shield clearance → x402 settlement → HCS audit) and `bet` (Shield clearance → placeBet on 0G → HCS audit). Uses `getValidationSummary()` from og-chain for Shield checks.

**Seer inference:** `listProviders()` → `callInference()` (0G broker with signed billing headers) → `logAuditMessage()` (Hedera HCS). Demo fallback when no testnet providers.

**Reputation:** GET reads from ReputationRegistry (readContract). POST calls `giveFeedback()` (writeContract via og-chain walletClient).

### Zod Schemas

```typescript
// server/schemas/predictions.ts
CreateMarketSchema = z.object({ question: z.string().min(5).max(500), resolutionTime: z.number().int().positive(), initialSide: z.enum(['yes','no']).optional(), initialAmount: z.number().positive().optional() })
PlaceBetSchema = z.object({ side: z.enum(['yes','no']), amount: z.number().min(0.001) })
MarketIdParamsSchema = z.object({ id: z.coerce.number().int().min(0) })
ResolveMarketSchema = z.object({ outcome: z.enum(['yes','no']) })

// server/schemas/gpu.ts
GpuRegisterSchema = z.object({ providerAddress: AddressSchema, gpuModel: z.string().min(1), endpoint: z.string().url().optional() })
GpuListQuerySchema = z.object({ address: AddressSchema.optional() })
```

### Reuse from src/lib

- `ethers` — contract calls for predictions, GPU, edge
- `src/lib/og-compute.ts` — listProviders, verifyProvider, getProviderMetadata
- `src/lib/og-broker.ts` — callInference
- `src/lib/og-chain.ts` — getValidationSummary, getRegisteredProviders, getWalletClient
- `src/lib/hedera.ts` — logAuditMessage
- `src/lib/reputation.ts` — giveFeedback, getReputation, getAllReputationScores
- `src/lib/contracts.ts` — addresses, ABIs, OG_RPC_URL
- `src/abi/GPUProviderRegistry.json` — ABI for GPU registration

### Source Files to Port

- `src/app/api/predictions/route.ts` (149 lines)
- `src/app/api/predictions/[id]/bet/route.ts` (72 lines)
- `src/app/api/predictions/[id]/claim/route.ts` (66 lines)
- `src/app/api/predictions/[id]/resolve/route.ts` (78 lines)
- `src/app/api/gpu/list/route.ts` (76 lines)
- `src/app/api/gpu/register/route.ts` (246 lines)
- `src/app/api/edge/trade/route.ts` (176 lines)
- `src/app/api/seer/inference/route.ts` (88 lines)
- `src/app/api/reputation/route.ts` (84 lines)

### Commit

```bash
git add server/schemas/ server/routes/predictions.ts server/routes/gpu.ts server/routes/edge.ts server/routes/seer.ts server/routes/reputation.ts server/index.ts
git commit -m "feat: migrate chain interaction routes to Fastify (predictions, GPU, edge, seer, reputation)"
```

---

## Wave 3C: Agent + Payment + Discovery Routes

**Session:** Parallel with 3A and 3B, depends on Wave 2

### Files

- Create: `server/schemas/agents.ts`, `server/schemas/payments.ts`, `server/schemas/resources.ts`
- Create: `server/routes/agents.ts`, `server/routes/payments.ts`, `server/routes/resources.ts`, `server/routes/activity.ts`, `server/routes/hedera.ts`, `server/routes/proposals.ts`, `server/routes/agent-decision.ts`, `server/routes/well-known.ts`
- Modify: `server/index.ts` (register routes)

### Routes (12 endpoints)

| Route | Method | Chain | Keys | Gate |
|---|---|---|---|---|
| `/api/agents` | GET | 0G (read) | None | None |
| `/api/agents/register` | POST | 0G (write) + World Chain (read) | `PRIVATE_KEY` | In-route World ID check |
| `/api/agents/:name/a2a` | GET/POST | 0G (indirect via handlers) | Various | Per-agent rate limit |
| `/api/agents/:name/mcp` | GET/POST | 0G (indirect via handlers) | Various | Per-agent rate limit |
| `/api/payments` | GET | None (in-memory ledger) | None | None |
| `/api/payments` | POST | Hedera (x402 settlement) | `HEDERA_OPERATOR_KEY` + `PRIVATE_KEY` | World ID |
| `/api/initiate-payment` | POST | None (setup) | None | None |
| `/api/resources` | GET | 0G (multi-source read) | None | None (public) |
| `/api/activity` | GET | 0G + Hedera (read) | None | None |
| `/api/hedera/audit` | GET | Hedera Mirror Node | None | None |
| `/api/proposals` | GET | 0G (read) | None | None |
| `/api/proposals` | POST | 0G (write) | `PRIVATE_KEY` | None |
| `/api/agent-decision` | GET | 0G (indirect) | None | None |
| `/.well-known/agent-card.json` | GET | None (filesystem) | None | None |

### Chain Operations Detail

**Agents (4 endpoints):** list reads IdentityRegistry. register checks World ID on-chain + writes to IdentityRegistry. A2A/MCP dispatch to agent handlers (seer→og-broker, edge→predictions, shield→ValidationRegistry, lens→ReputationRegistry).

**Payments (3 endpoints):** POST /payments does x402 flow: `verifyPayment()` + `settlePayment()` via Blocky402 → Hedera, `executeAgentAction()` for HCS audit via Agent Kit, `giveFeedback()` for reputation. Initiate-payment just generates requirements.

**Resources:** Aggregates 5 sources in parallel: agentkit agents, og-compute broker, on-chain GPU providers, registered humans, DePIN devices. Enriches with reputation signals. ~330 lines with mappers + demo seeds. **Note:** imports `ResourceCardProps` type from `src/components/ResourceCard` — either extract type to `src/types/resource.ts` or inline.

**Activity:** Reads 0G ReputationRegistry events + Hedera Mirror Node HCS messages. Demo signals for variety.

**Proposals:** GET reads AgentProposalRegistry + enriches with market question from ResourcePrediction. POST writes submit/approve/reject with ABI encoding.

**Agent-decision:** Currently self-fetches `/api/resources` via HTTP — **refactor to import resources logic directly** instead of HTTP self-call.

### Zod Schemas

```typescript
// server/schemas/agents.ts
AgentNameParamsSchema = z.object({ name: z.enum(['seer','edge','shield','lens']) })
AgentRegisterSchema = z.object({ agentURI: z.string().min(1), operatorWorldId: z.string(), operatorAddress: AddressSchema, role: z.string().min(1), agentkitId: z.string().optional() })
A2ATaskSchema = z.object({ method: z.string().min(1), params: z.record(z.unknown()).optional() })
McpToolCallSchema = z.object({ tool: z.string().min(1), arguments: z.record(z.unknown()).optional() })

// server/schemas/payments.ts
InitiatePaymentSchema = z.object({ resourceName: z.string().min(1), resourceType: z.enum(['gpu','agent','human','depin']), amount: z.string().optional() })

// server/schemas/resources.ts
ResourceQuerySchema = z.object({ sort: z.enum(['quality','cost','latency','uptime']).default('quality'), type: z.enum(['gpu','agent','human','depin']).optional() })
HederaAuditQuerySchema = z.object({ topicId: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(20) })
ProposalQuerySchema = z.object({ agentId: z.coerce.number().int().optional() })
```

### Reuse from src/lib

- `src/lib/agent-router.ts` — isValidAgent, getAgentCard, checkRateLimit, types
- `src/lib/agents/*.ts` — seerA2A/MCP, edgeA2A/MCP, shieldA2A/MCP, lensA2A/MCP + mcpTools
- `src/lib/agentkit.ts` — listRegisteredAgents, registerAgent, getAgent
- `src/lib/blocky402.ts` — verifyPayment, settlePayment
- `src/lib/hedera.ts` — logAuditMessage, queryAuditTrail
- `src/lib/hedera-agent.ts` — executeAgentAction
- `src/lib/payment-ledger.ts` — readPayments, addPayment
- `src/lib/reputation.ts` — giveFeedback, getAllReputationScores
- `src/lib/og-chain.ts` — getRegisteredProviders, getRegisteredHumans, getRegisteredDePIN, getReputationSummary, getValidationSummary, getPublicClient
- `src/lib/og-compute.ts` — listProviders
- `src/lib/cache.ts` — cachedFetch, circuit breaker

### Source Files to Port

- `src/app/api/agents/route.ts` (54 lines)
- `src/app/api/agents/register/route.ts` (84 lines)
- `src/app/api/agents/[name]/a2a/route.ts` (100 lines)
- `src/app/api/agents/[name]/mcp/route.ts` (93 lines)
- `src/app/api/payments/route.ts` (168 lines)
- `src/app/api/initiate-payment/route.ts` (72 lines)
- `src/app/api/resources/route.ts` (325 lines)
- `src/app/api/activity/route.ts` (204 lines)
- `src/app/api/hedera/audit/route.ts` (39 lines)
- `src/app/api/proposals/route.ts` (154 lines)
- `src/app/api/agent-decision/route.ts` (95 lines)
- `src/app/.well-known/agent-card.json/route.ts` (44 lines)

### Commit

```bash
git add server/schemas/ server/routes/ server/index.ts
git commit -m "feat: migrate agent, payment, discovery routes to Fastify with Zod schemas"
```

---

## Wave 4: Cleanup + Docs

**Session:** Sequential, depends on Waves 3A + 3B + 3C

### Files

- Delete: `src/app/api/` (all route files)
- Refactor: `middleware.ts` (remove API route exclusions)
- Extract: `src/types/resource.ts` (shared types between frontend + backend)
- Modify: `docs/ARCHITECTURE.md`, `docs/PENDING_WORK.md`, `docs/ACTIVE_WORK.md`, `README.md`

### Steps

1. **Delete Next.js API routes:** `rm -rf src/app/api/`
2. **Update `middleware.ts`:** Remove regex exclusions for `api/agents/[^/]+/a2a|api/agents/[^/]+/mcp`
3. **Extract shared types:** Create `src/types/resource.ts` with `ResourceCardProps`, `ResourceType`, `ResourceSignals` types (imported by both `src/components/ResourceCard.tsx` and `server/routes/resources.ts`)
4. **Update docs/ARCHITECTURE.md:** Update file tree (remove app/api/, add server/), add "Backend Architecture (Fastify :5001)" section, update rendering strategy table, add PM2 process management
5. **Update README.md:** Update architecture diagram, add PM2 commands, add server/ to project structure, update API routes table
6. **Update docs/PENDING_WORK.md + ACTIVE_WORK.md:** Mark backend migration done

### Verify

```bash
./scripts/dev.sh  # All services start
npx pm2 status  # api, next, claw all online
curl http://localhost:5001/health  # WASM ok
curl -X POST http://localhost:5001/api/rp-signature -H 'Content-Type: application/json' -d '{"action":"verify-human"}'  # 200
curl -X POST http://localhost:5001/api/rp-signature -H 'Content-Type: application/json' -d '{}'  # 400 Zod error
curl http://localhost:5001/api/predictions  # 200
curl http://localhost:5001/api/resources  # 200
curl http://localhost:5001/api/agents  # 200
curl http://localhost:3000/api/predictions  # 200 (proxied)
npx vitest run  # All tests pass
npx tsc --noEmit --skipLibCheck  # 0 errors
npx tsc -p server/tsconfig.json --noEmit  # 0 errors
```

### Commit

```bash
git add -A
git commit -m "feat: complete backend migration — remove Next.js API routes, refactor src/lib, update docs"
```
