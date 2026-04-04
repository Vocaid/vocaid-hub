# Backend Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add production-grade resilience to the Fastify backend: timeout-wrapped fetches, exponential backoff retry, per-service circuit breakers, server-side response caching, security headers, singleton chain clients, graceful shutdown, and missing env var documentation.

**Architecture:** All utilities live in `server/utils/`. Plugins in `server/plugins/`. Tests in `server/__tests__/`. Utilities are pure functions with zero Fastify coupling so they can be tested in isolation and imported from `src/lib/` code during Wave 3 route migration.

**Tech Stack:** Fastify 5, vitest, AbortController (native), existing `src/lib/cache.ts` patterns

---

## Wave H1: Core Utilities (3 files — independent, no Fastify deps)

**Session:** Can run immediately, no dependencies
**Creates:** `server/utils/fetch-with-timeout.ts`, `server/utils/retry.ts`, `server/utils/circuit-breaker.ts`
**Tests:** `server/__tests__/fetch-with-timeout.test.ts`, `server/__tests__/retry.test.ts`, `server/__tests__/circuit-breaker.test.ts`

### Task 1: `fetch-with-timeout.ts`

**Files:**
- Create: `server/utils/fetch-with-timeout.ts`
- Create: `server/__tests__/fetch-with-timeout.test.ts`

**Step 1: Write the failing test**

```typescript
// server/__tests__/fetch-with-timeout.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout } from '../utils/fetch-with-timeout';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns response when fetch completes within timeout', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const res = await fetchWithTimeout('https://example.com/api', { timeout: 5000 });
    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  });

  it('aborts when timeout expires', async () => {
    vi.mocked(fetch).mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        (opts?.signal as AbortSignal)?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    await expect(
      fetchWithTimeout('https://example.com/slow', { timeout: 100 }),
    ).rejects.toThrow('AbortError');
  });

  it('uses default timeout of 10s when not specified', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    await fetchWithTimeout('https://example.com/api');
    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[1]?.signal).toBeDefined();
  });

  it('passes through fetch options', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    await fetchWithTimeout('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"key":"value"}',
      timeout: 5000,
    });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[1]?.method).toBe('POST');
    expect((callArgs[1]?.headers as Record<string, string>)?.['Content-Type']).toBe('application/json');
    expect(callArgs[1]?.body).toBe('{"key":"value"}');
  });

  it('clears timeout on successful fetch (no leak)', async () => {
    const clearSpy = vi.spyOn(global, 'clearTimeout');
    const mockResponse = new Response('ok', { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    await fetchWithTimeout('https://example.com/api', { timeout: 5000 });
    expect(clearSpy).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run server/__tests__/fetch-with-timeout.test.ts
```
Expected: FAIL — `Cannot find module '../utils/fetch-with-timeout'`

**Step 3: Write minimal implementation**

```typescript
// server/utils/fetch-with-timeout.ts

export interface FetchWithTimeoutOptions extends RequestInit {
  /** Timeout in milliseconds. Default: 10_000 (10 seconds). */
  timeout?: number;
}

/**
 * Fetch wrapper that aborts after a configurable timeout.
 * Prevents indefinite hangs on external API calls.
 *
 * @throws DOMException with name 'AbortError' on timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeout = 10_000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pre-configured timeout budgets per external service.
 * Use these as the `timeout` value in fetchWithTimeout.
 */
export const TIMEOUT_BUDGETS = {
  WORLD_ID_API: 10_000,    // World Developer Portal verification
  HEDERA_MIRROR: 8_000,    // Mirror Node REST queries
  BLOCKY402: 15_000,        // Payment settlement (must complete)
  OG_INFERENCE: 30_000,     // AI inference (can be slow)
  OG_RPC: 10_000,           // Chain RPC reads
  INTERNAL: 5_000,          // Internal API calls
} as const;
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run server/__tests__/fetch-with-timeout.test.ts
```
Expected: 5 tests pass

**Step 5: Commit**

```bash
git add server/utils/fetch-with-timeout.ts server/__tests__/fetch-with-timeout.test.ts
git commit -m "feat: fetchWithTimeout utility with AbortController + timeout budgets"
```

---

### Task 2: `retry.ts` — Exponential Backoff

**Files:**
- Create: `server/utils/retry.ts`
- Create: `server/__tests__/retry.test.ts`

**Step 1: Write the failing test**

```typescript
// server/__tests__/retry.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, isRetryable } from '../utils/retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('retries on transient failure then succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue('recovered');

    const promise = withRetry(fn, { maxRetries: 2, baseDelay: 100 });
    // Advance past first retry delay
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const promise = withRetry(fn, { maxRetries: 2, baseDelay: 50 });
    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).rejects.toThrow('ECONNREFUSED');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'));

    await expect(
      withRetry(fn, { maxRetries: 3, baseDelay: 50 }),
    ).rejects.toThrow('aborted');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('respects maxDelay cap', async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, ms) => {
      if (typeof ms === 'number' && ms > 0) delays.push(ms);
      return originalSetTimeout(fn, 0); // instant for test
    });

    const fnAlwaysFails = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));

    try {
      await withRetry(fnAlwaysFails, { maxRetries: 5, baseDelay: 1000, maxDelay: 4000 });
    } catch { /* expected */ }

    // All delays should be <= maxDelay + jitter(200)
    for (const d of delays) {
      expect(d).toBeLessThanOrEqual(4200);
    }
  });

  it('accepts custom retryOn predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('CUSTOM'));

    await expect(
      withRetry(fn, {
        maxRetries: 2,
        baseDelay: 10,
        retryOn: (err) => err instanceof Error && err.message === 'RETRY_ME',
      }),
    ).rejects.toThrow('CUSTOM');
    expect(fn).toHaveBeenCalledOnce(); // not retried because predicate returned false
  });
});

describe('isRetryable', () => {
  it('returns true for ECONNREFUSED', () => {
    expect(isRetryable(new Error('ECONNREFUSED'))).toBe(true);
  });

  it('returns true for ETIMEDOUT', () => {
    expect(isRetryable(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('returns true for 503 Service Unavailable', () => {
    expect(isRetryable(new Error('503 Service Unavailable'))).toBe(true);
  });

  it('returns false for AbortError', () => {
    expect(isRetryable(new DOMException('aborted', 'AbortError'))).toBe(false);
  });

  it('returns false for 400 Bad Request', () => {
    expect(isRetryable(new Error('400 Bad Request'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isRetryable('string error')).toBe(false);
    expect(isRetryable(null)).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run server/__tests__/retry.test.ts
```
Expected: FAIL — `Cannot find module '../utils/retry'`

**Step 3: Write minimal implementation**

```typescript
// server/utils/retry.ts

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3). */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 500). Doubles each attempt. */
  baseDelay?: number;
  /** Maximum delay cap in ms (default: 10_000). */
  maxDelay?: number;
  /** Custom predicate — return true to retry, false to throw immediately. */
  retryOn?: (error: unknown) => boolean;
}

/**
 * Execute an async function with exponential backoff retry.
 *
 * Delay formula: min(baseDelay * 2^attempt + jitter, maxDelay)
 * Jitter: random 0-200ms to prevent thundering herd.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 500,
    maxDelay = 10_000,
    retryOn = isRetryable,
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !retryOn(error)) throw error;

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 200,
        maxDelay,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Unreachable — loop always returns or throws
  throw new Error('withRetry: unreachable');
}

/**
 * Default retryable error predicate.
 * Retries: network errors, 5xx, 429 rate limit.
 * Does NOT retry: AbortError (timeout), 4xx client errors, non-Error values.
 */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return false;

  const msg = error.message;
  // Network errors
  if (msg.includes('ECONNREFUSED')) return true;
  if (msg.includes('ETIMEDOUT')) return true;
  if (msg.includes('ENOTFOUND')) return true;
  if (msg.includes('ECONNRESET')) return true;
  if (msg.includes('fetch failed')) return true;
  // HTTP 5xx
  if (msg.includes('500')) return true;
  if (msg.includes('502')) return true;
  if (msg.includes('503')) return true;
  if (msg.includes('504')) return true;
  // Rate limited
  if (msg.includes('429')) return true;
  // Hedera BUSY status
  if (msg.includes('BUSY')) return true;

  return false;
}

/**
 * Pre-configured retry policies per service.
 */
export const RETRY_POLICIES = {
  /** Hedera SDK transactions — 2 retries, 1s base (BUSY/network errors) */
  HEDERA_TX: { maxRetries: 2, baseDelay: 1000 } satisfies RetryOptions,
  /** Blocky402 verify — 2 retries, 500ms base */
  BLOCKY402_VERIFY: { maxRetries: 2, baseDelay: 500 } satisfies RetryOptions,
  /** Blocky402 settle — 1 retry only (idempotency risk) */
  BLOCKY402_SETTLE: { maxRetries: 1, baseDelay: 1000 } satisfies RetryOptions,
  /** World ID verify — 1 retry, 500ms base */
  WORLD_ID: { maxRetries: 1, baseDelay: 500 } satisfies RetryOptions,
  /** 0G broker inference — 1 retry, 2s base (slow) */
  OG_INFERENCE: { maxRetries: 1, baseDelay: 2000 } satisfies RetryOptions,
  /** Mirror Node query — 2 retries, 500ms base */
  MIRROR_NODE: { maxRetries: 2, baseDelay: 500 } satisfies RetryOptions,
  /** ethers contract read — 2 retries, 500ms base */
  RPC_READ: { maxRetries: 2, baseDelay: 500 } satisfies RetryOptions,
  /** NEVER retry contract writes (nonce risk) */
  RPC_WRITE: { maxRetries: 0 } satisfies RetryOptions,
} as const;
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run server/__tests__/retry.test.ts
```
Expected: 9 tests pass

**Step 5: Commit**

```bash
git add server/utils/retry.ts server/__tests__/retry.test.ts
git commit -m "feat: exponential backoff retry with jitter + per-service policies"
```

---

### Task 3: `circuit-breaker.ts` — Per-Service Breaker

**Files:**
- Create: `server/utils/circuit-breaker.ts`
- Create: `server/__tests__/circuit-breaker.test.ts`

**Step 1: Write the failing test**

```typescript
// server/__tests__/circuit-breaker.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceBreaker, BREAKER_CONFIGS } from '../utils/circuit-breaker';

describe('ServiceBreaker', () => {
  let breaker: ServiceBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    breaker = new ServiceBreaker({ maxFailures: 3, openDurationMs: 30_000, name: 'test' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in CLOSED state', () => {
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.isOpen).toBe(false);
  });

  it('stays CLOSED below failure threshold', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.isOpen).toBe(false);
  });

  it('opens after reaching failure threshold', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('OPEN');
    expect(breaker.isOpen).toBe(true);
  });

  it('transitions to HALF_OPEN after openDuration expires', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('OPEN');

    vi.advanceTimersByTime(30_001);
    expect(breaker.state).toBe('HALF_OPEN');
    expect(breaker.isOpen).toBe(false); // allows one attempt
  });

  it('resets to CLOSED on success', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.failures).toBe(0);
  });

  it('re-opens on failure in HALF_OPEN state', () => {
    // Open the breaker
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('OPEN');

    // Wait for half-open
    vi.advanceTimersByTime(30_001);
    expect(breaker.state).toBe('HALF_OPEN');

    // Fail again — re-opens
    breaker.recordFailure();
    expect(breaker.state).toBe('OPEN');
  });

  it('execute() runs function when closed', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await breaker.execute(fn, 'fallback');
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('execute() returns fallback when open', async () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    const fn = vi.fn().mockResolvedValue('ok');
    const result = await breaker.execute(fn, 'fallback');
    expect(result).toBe('fallback');
    expect(fn).not.toHaveBeenCalled();
  });

  it('execute() records failure on thrown error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const result = await breaker.execute(fn, 'fallback');
    expect(result).toBe('fallback');
    expect(breaker.failures).toBe(1);
  });

  it('execute() records success on resolved value', async () => {
    breaker.recordFailure();
    breaker.recordFailure();
    const fn = vi.fn().mockResolvedValue('ok');
    await breaker.execute(fn, 'fallback');
    expect(breaker.failures).toBe(0);
  });
});

describe('BREAKER_CONFIGS', () => {
  it('has configs for all expected services', () => {
    expect(BREAKER_CONFIGS).toHaveProperty('hedera');
    expect(BREAKER_CONFIGS).toHaveProperty('blocky402');
    expect(BREAKER_CONFIGS).toHaveProperty('og-broker');
    expect(BREAKER_CONFIGS).toHaveProperty('og-rpc');
    expect(BREAKER_CONFIGS).toHaveProperty('world-id');
    expect(BREAKER_CONFIGS).toHaveProperty('mirror-node');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run server/__tests__/circuit-breaker.test.ts
```
Expected: FAIL — `Cannot find module '../utils/circuit-breaker'`

**Step 3: Write minimal implementation**

```typescript
// server/utils/circuit-breaker.ts

type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface BreakerConfig {
  name: string;
  /** Number of failures before opening (default: 3). */
  maxFailures?: number;
  /** Duration in ms the breaker stays OPEN before transitioning to HALF_OPEN (default: 30_000). */
  openDurationMs?: number;
}

/**
 * Per-service circuit breaker with CLOSED → OPEN → HALF_OPEN state machine.
 *
 * - CLOSED: requests pass through normally
 * - OPEN: requests short-circuit to fallback (no network call)
 * - HALF_OPEN: one probe request allowed; success → CLOSED, failure → OPEN
 */
export class ServiceBreaker {
  readonly name: string;
  private readonly maxFailures: number;
  private readonly openDurationMs: number;
  private _failures = 0;
  private _openUntil = 0;

  constructor(config: BreakerConfig) {
    this.name = config.name;
    this.maxFailures = config.maxFailures ?? 3;
    this.openDurationMs = config.openDurationMs ?? 30_000;
  }

  get failures(): number {
    return this._failures;
  }

  get state(): BreakerState {
    if (this._failures < this.maxFailures) return 'CLOSED';
    if (Date.now() > this._openUntil) return 'HALF_OPEN';
    return 'OPEN';
  }

  get isOpen(): boolean {
    return this.state === 'OPEN';
  }

  recordFailure(): void {
    this._failures++;
    if (this._failures >= this.maxFailures) {
      this._openUntil = Date.now() + this.openDurationMs;
    }
  }

  recordSuccess(): void {
    this._failures = 0;
    this._openUntil = 0;
  }

  /**
   * Execute a function through the breaker.
   * Returns fallback immediately if OPEN. Records success/failure.
   */
  async execute<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (this.isOpen) return fallback;

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch {
      this.recordFailure();
      return fallback;
    }
  }
}

/**
 * Pre-configured breakers for each external service.
 * Import and use: `breakers['hedera'].execute(fn, fallback)`
 */
export const BREAKER_CONFIGS = {
  'hedera':      { name: 'hedera',      maxFailures: 3, openDurationMs: 30_000 },
  'blocky402':   { name: 'blocky402',   maxFailures: 3, openDurationMs: 60_000 },
  'og-broker':   { name: 'og-broker',   maxFailures: 3, openDurationMs: 30_000 },
  'og-rpc':      { name: 'og-rpc',      maxFailures: 5, openDurationMs: 15_000 },
  'world-id':    { name: 'world-id',    maxFailures: 3, openDurationMs: 30_000 },
  'mirror-node': { name: 'mirror-node', maxFailures: 5, openDurationMs: 20_000 },
} as const satisfies Record<string, BreakerConfig>;

/** Singleton breaker instances — shared across requests in the persistent Fastify process. */
const instances = new Map<string, ServiceBreaker>();

export function getBreaker(service: keyof typeof BREAKER_CONFIGS): ServiceBreaker {
  let breaker = instances.get(service);
  if (!breaker) {
    breaker = new ServiceBreaker(BREAKER_CONFIGS[service]);
    instances.set(service, breaker);
  }
  return breaker;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run server/__tests__/circuit-breaker.test.ts
```
Expected: 12 tests pass

**Step 5: Commit**

```bash
git add server/utils/circuit-breaker.ts server/__tests__/circuit-breaker.test.ts
git commit -m "feat: per-service circuit breaker with CLOSED/OPEN/HALF_OPEN state machine"
```

---

## Wave H2: Fastify Plugins + Server Config (independent of H1)

**Session:** Can run in parallel with Wave H1 — no shared files
**Creates:** `server/plugins/response-cache.ts`, `server/plugins/security-headers.ts`, `server/clients.ts`
**Modifies:** `server/index.ts`, `.env.example`

### Task 4: `response-cache.ts` — Server-Side GET Caching Plugin

**Files:**
- Create: `server/plugins/response-cache.ts`
- Create: `server/__tests__/response-cache.test.ts`

**Step 1: Write the failing test**

```typescript
// server/__tests__/response-cache.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResponseCache } from '../plugins/response-cache';

describe('ResponseCache', () => {
  let cache: ResponseCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new ResponseCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns undefined for uncached path', () => {
    expect(cache.get('/api/resources', '')).toBeUndefined();
  });

  it('stores and retrieves a cached response', () => {
    const body = JSON.stringify({ data: [1, 2, 3] });
    cache.set('/api/resources', '', body, 30_000);

    const result = cache.get('/api/resources', '');
    expect(result).toBe(body);
  });

  it('varies cache by query string', () => {
    cache.set('/api/resources', 'sort=quality', '{"quality":true}', 30_000);
    cache.set('/api/resources', 'sort=cost', '{"cost":true}', 30_000);

    expect(cache.get('/api/resources', 'sort=quality')).toBe('{"quality":true}');
    expect(cache.get('/api/resources', 'sort=cost')).toBe('{"cost":true}');
  });

  it('expires after TTL', () => {
    cache.set('/api/resources', '', 'data', 5_000);
    expect(cache.get('/api/resources', '')).toBe('data');

    vi.advanceTimersByTime(5_001);
    expect(cache.get('/api/resources', '')).toBeUndefined();
  });

  it('invalidates by path prefix', () => {
    cache.set('/api/resources', '', 'data1', 30_000);
    cache.set('/api/resources', 'type=gpu', 'data2', 30_000);
    cache.set('/api/agents', '', 'agents', 30_000);

    cache.invalidate('/api/resources');

    expect(cache.get('/api/resources', '')).toBeUndefined();
    expect(cache.get('/api/resources', 'type=gpu')).toBeUndefined();
    expect(cache.get('/api/agents', '')).toBe('agents');
  });

  it('generates correct Cache-Control header', () => {
    expect(cache.getCacheControl(30_000)).toBe('public, max-age=30, stale-while-revalidate=60');
    expect(cache.getCacheControl(300_000)).toBe('public, max-age=300, stale-while-revalidate=600');
    expect(cache.getCacheControl(0)).toBe('no-store');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run server/__tests__/response-cache.test.ts
```
Expected: FAIL — `Cannot find module '../plugins/response-cache'`

**Step 3: Write minimal implementation**

```typescript
// server/plugins/response-cache.ts
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

interface CacheEntry {
  body: string;
  expiresAt: number;
}

/**
 * In-memory response cache for GET endpoints.
 * Cache key = path + sorted query string.
 */
export class ResponseCache {
  private store = new Map<string, CacheEntry>();

  private key(path: string, query: string): string {
    return `${path}?${query}`;
  }

  get(path: string, query: string): string | undefined {
    const entry = this.store.get(this.key(path, query));
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(this.key(path, query));
      return undefined;
    }
    return entry.body;
  }

  set(path: string, query: string, body: string, ttlMs: number): void {
    this.store.set(this.key(path, query), {
      body,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(pathPrefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(pathPrefix)) {
        this.store.delete(key);
      }
    }
  }

  getCacheControl(ttlMs: number): string {
    if (ttlMs <= 0) return 'no-store';
    const maxAge = Math.round(ttlMs / 1000);
    return `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`;
  }
}

/** Per-route cache TTL configuration. 0 = no cache. */
export const ROUTE_CACHE_TTL: Record<string, number> = {
  '/api/resources':                  30_000,
  '/api/agents':                    300_000,
  '/api/predictions':                10_000,
  '/api/activity':                   10_000,
  '/api/agent-decision':             30_000,
  '/api/hedera/audit':               15_000,
  '/api/proposals':                  15_000,
  '/.well-known/agent-card.json':   300_000,
  // POST endpoints and user-specific endpoints: 0 (never cached)
};

declare module 'fastify' {
  interface FastifyInstance {
    responseCache: ResponseCache;
  }
}

async function responseCachePlugin(app: FastifyInstance) {
  const cache = new ResponseCache();
  app.decorate('responseCache', cache);

  // Cleanup expired entries every 2 minutes
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of (cache as unknown as { store: Map<string, CacheEntry> }).store) {
      if (now > entry.expiresAt) {
        (cache as unknown as { store: Map<string, CacheEntry> }).store.delete(key);
      }
    }
  }, 2 * 60 * 1000);

  app.addHook('onClose', () => clearInterval(cleanup));

  // Cache GET responses
  app.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') return;

    const ttl = ROUTE_CACHE_TTL[request.routeOptions?.url ?? ''] ?? 0;
    if (ttl <= 0) return;

    const query = new URL(request.url, 'http://localhost').search.slice(1);
    const cached = cache.get(request.routeOptions?.url ?? request.url, query);

    if (cached) {
      reply
        .header('Content-Type', 'application/json')
        .header('Cache-Control', cache.getCacheControl(ttl))
        .header('X-Cache', 'HIT')
        .send(cached);
    }
  });

  app.addHook('onSend', async (request, reply, payload) => {
    if (request.method !== 'GET') return payload;
    if (reply.statusCode !== 200) return payload;

    const routeUrl = request.routeOptions?.url ?? '';
    const ttl = ROUTE_CACHE_TTL[routeUrl] ?? 0;
    if (ttl <= 0) return payload;

    // Don't re-cache HIT responses
    if (reply.getHeader('X-Cache') === 'HIT') return payload;

    const query = new URL(request.url, 'http://localhost').search.slice(1);
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    cache.set(routeUrl, query, body, ttl);

    reply.header('Cache-Control', cache.getCacheControl(ttl));
    reply.header('X-Cache', 'MISS');

    return payload;
  });
}

export default fp(responseCachePlugin, { name: 'response-cache' });
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run server/__tests__/response-cache.test.ts
```
Expected: 6 tests pass

**Step 5: Commit**

```bash
git add server/plugins/response-cache.ts server/__tests__/response-cache.test.ts
git commit -m "feat: Fastify response cache plugin with TTL + Cache-Control headers"
```

---

### Task 5: `security-headers.ts` + Graceful Shutdown + Env Vars

**Files:**
- Create: `server/plugins/security-headers.ts`
- Modify: `server/index.ts` (register plugins + graceful shutdown)
- Modify: `.env.example` (add missing vars)

**Step 1: Create security headers plugin**

```typescript
// server/plugins/security-headers.ts
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

/**
 * Security headers plugin — helmet-style headers on every response.
 * Prevents clickjacking, MIME sniffing, and enforces HTTPS.
 */
async function securityHeadersPlugin(app: FastifyInstance) {
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '0');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  });
}

export default fp(securityHeadersPlugin, { name: 'security-headers' });
```

**Step 2: Update `server/index.ts`** — register new plugins + add graceful shutdown

Add after the existing plugin registrations (after line 40):

```typescript
import responseCachePlugin from './plugins/response-cache.js';
import securityHeadersPlugin from './plugins/security-headers.js';

await app.register(responseCachePlugin);
await app.register(securityHeadersPlugin);
```

Add before `start()` function:

```typescript
// Graceful shutdown
const shutdownSignals = ['SIGTERM', 'SIGINT'] as const;
for (const signal of shutdownSignals) {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  });
}
```

Update health check to include new plugins:

```typescript
plugins: ['auth', 'world-id-gate', 'rate-limit', 'error-handler', 'x402', 'response-cache', 'security-headers'],
```

**Step 3: Update `.env.example`** — add missing vars

Add at the end of the file:

```bash
# Backend Server (Fastify :5001)
BACKEND_PORT=5001
BACKEND_URL=http://localhost:5001
```

**Step 4: Verify**

```bash
npx vitest run server/__tests__/
# Expected: all tests pass

# Start server and check headers
npx tsx server/index.ts &
sleep 2
curl -sI http://localhost:5001/health | grep -E 'X-Content-Type|X-Frame|Cache-Control|X-Cache'
# Expected: X-Content-Type-Options: nosniff, X-Frame-Options: DENY
kill %1
```

**Step 5: Commit**

```bash
git add server/plugins/security-headers.ts server/index.ts .env.example
git commit -m "feat: security headers plugin + graceful shutdown + response cache registration + env vars"
```

---

### Task 6: `server/clients.ts` — Singleton Chain Providers

**Files:**
- Create: `server/clients.ts`

**Step 1: Create singleton client initializers**

```typescript
// server/clients.ts
/**
 * Singleton chain client factories.
 * Initialize once at server startup, reuse across all request handlers.
 * Eliminates per-request provider creation overhead.
 */

import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// 0G Galileo chain definition
export const ogGalileo = {
  id: 16602,
  name: '0G Galileo Testnet',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: { default: { http: [process.env.OG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai'] } },
  blockExplorers: { default: { name: '0G Explorer', url: 'https://chainscan-galileo.0g.ai' } },
} as const;

const OG_RPC_URL = process.env.OG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';

// ── ethers (for prediction markets, GPU registry, proposals) ──

let _ogProvider: ethers.JsonRpcProvider | null = null;

/** Singleton ethers JsonRpcProvider for 0G Galileo. */
export function getOgProvider(): ethers.JsonRpcProvider {
  if (!_ogProvider) {
    _ogProvider = new ethers.JsonRpcProvider(OG_RPC_URL);
  }
  return _ogProvider;
}

/** Create ethers signer (wallet) using the shared provider. */
export function getOgSigner(): ethers.Wallet {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY not set');
  return new ethers.Wallet(pk, getOgProvider());
}

// ── viem (for ERC-8004 registries, reputation, validation) ──

let _viemPublicClient: ReturnType<typeof createPublicClient> | null = null;

/** Singleton viem PublicClient for 0G Galileo reads. */
export function getViemPublicClient() {
  if (!_viemPublicClient) {
    _viemPublicClient = createPublicClient({
      chain: ogGalileo,
      transport: http(OG_RPC_URL),
    });
  }
  return _viemPublicClient;
}

/** Create viem WalletClient with PRIVATE_KEY. */
export function getViemWalletClient() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY not set');
  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, '')}` as Hex);
  return createWalletClient({
    account,
    chain: ogGalileo,
    transport: http(OG_RPC_URL),
  });
}
```

**Step 2: Commit**

```bash
git add server/clients.ts
git commit -m "feat: singleton chain client factories for ethers + viem (reuse across requests)"
```

---

## Wave H3: Integration Wiring (depends on H1 + H2)

**Session:** Run AFTER both H1 and H2 are complete
**Modifies:** `src/lib/blocky402.ts`, `src/lib/og-broker.ts`, `src/lib/hedera.ts` (apply timeout + retry)

### Task 7: Wire `fetchWithTimeout` + `withRetry` into `src/lib/blocky402.ts`

**Files:**
- Modify: `src/lib/blocky402.ts`

**Step 1: Update all 3 fetch calls**

Replace the raw `fetch()` calls with `fetchWithTimeout` + `withRetry`:

```typescript
// Add at top of src/lib/blocky402.ts
import { fetchWithTimeout, TIMEOUT_BUDGETS } from '../server/utils/fetch-with-timeout';  // TODO: adjust import path during Wave 3 route migration
import { withRetry, RETRY_POLICIES } from '../server/utils/retry';
```

Replace `verifyPayment` fetch (line 40-44):
```typescript
export async function verifyPayment(paymentHeader: string): Promise<PaymentVerification> {
  return withRetry(async () => {
    const res = await fetchWithTimeout(`${BLOCKY402_BASE}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment: paymentHeader }),
      timeout: TIMEOUT_BUDGETS.BLOCKY402,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Blocky402 /verify failed (${res.status}): ${text}`);
    }

    return (await res.json()) as PaymentVerification;
  }, RETRY_POLICIES.BLOCKY402_VERIFY);
}
```

Replace `settlePayment` fetch (line 61-68):
```typescript
export async function settlePayment(paymentPayload: string): Promise<PaymentSettlement> {
  return withRetry(async () => {
    const res = await fetchWithTimeout(`${BLOCKY402_BASE}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment: paymentPayload }),
      timeout: TIMEOUT_BUDGETS.BLOCKY402,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Blocky402 /settle failed (${res.status}): ${text}`);
    }

    return (await res.json()) as PaymentSettlement;
  }, RETRY_POLICIES.BLOCKY402_SETTLE);
}
```

Replace `getSupportedNetworks` fetch (line 80-87):
```typescript
export async function getSupportedNetworks(): Promise<SupportedNetwork[]> {
  const res = await fetchWithTimeout(`${BLOCKY402_BASE}/supported`, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeout: TIMEOUT_BUDGETS.BLOCKY402,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blocky402 /supported failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { networks: SupportedNetwork[] };
  return data.networks;
}
```

**Step 2: Verify existing tests still pass**

```bash
npx vitest run
```
Expected: All tests pass (blocky402 is mocked in existing tests)

**Step 3: Commit**

```bash
git add src/lib/blocky402.ts
git commit -m "feat: add timeout + retry to Blocky402 payment calls"
```

---

### Task 8: Wire `fetchWithTimeout` into `src/lib/og-broker.ts`

**Files:**
- Modify: `src/lib/og-broker.ts`

**Step 1: Add timeout to inference fetch call (line 84)**

Add import at top:
```typescript
import { fetchWithTimeout, TIMEOUT_BUDGETS } from '../server/utils/fetch-with-timeout';
```

Replace the raw fetch in `callInference` (line 84-94):
```typescript
  const res = await fetchWithTimeout(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers as unknown as Record<string, string>),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
    timeout: TIMEOUT_BUDGETS.OG_INFERENCE,
  });
```

**Step 2: Verify**

```bash
npx vitest run
```
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/og-broker.ts
git commit -m "feat: add 30s timeout to 0G broker inference calls"
```

---

### Task 9: Add cache invalidation hooks to route mutation handlers

This task wires `responseCache.invalidate()` into POST routes so cached GET responses are flushed on mutations. This should be done **during or after Wave 3 route migration** when routes exist in `server/routes/`.

**Pattern to apply in every POST handler that mutates data:**

```typescript
// In server/routes/predictions.ts POST handler:
app.responseCache.invalidate('/api/predictions');
app.responseCache.invalidate('/api/agent-decision');

// In server/routes/agents.ts POST register handler:
app.responseCache.invalidate('/api/agents');
app.responseCache.invalidate('/api/resources');

// In server/routes/reputation.ts POST handler:
app.responseCache.invalidate('/api/resources');
app.responseCache.invalidate('/api/reputation');
```

**Commit** (during Wave 3):

```bash
git commit -m "feat: cache invalidation on POST mutations"
```

---

## Wave H3b: Remaining Integration (depends on H1 + H2 — run as single session)

**Session:** Run after H3. Covers: timeout on all remaining raw `fetch()` calls, Hedera SDK retry, singleton client adoption, cache invalidation on all POST routes.

### Task 10: Timeout-wrap World ID API fetches in `server/routes/world-id.ts`

**Files:**
- Modify: `server/routes/world-id.ts:72,85`

**Step 1: Add import at top of file**

```typescript
import { fetchWithTimeout, TIMEOUT_BUDGETS } from '../utils/fetch-with-timeout.js';
```

**Step 2: Replace line 72 — v4 verify fetch**

Replace:
```typescript
const response = await fetch(verifyUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: verifyBody,
});
```

With:
```typescript
const response = await fetchWithTimeout(verifyUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: verifyBody,
  timeout: TIMEOUT_BUDGETS.WORLD_ID_API,
});
```

**Step 3: Replace line 85 — v2 fallback fetch**

Replace:
```typescript
const v2Response = await fetch(v2Url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: v2Body,
});
```

With:
```typescript
const v2Response = await fetchWithTimeout(v2Url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: v2Body,
  timeout: TIMEOUT_BUDGETS.WORLD_ID_API,
});
```

**Step 4: Commit**

```bash
git add server/routes/world-id.ts
git commit -m "fix: add 10s timeout to World ID Developer Portal API calls"
```

---

### Task 11: Timeout-wrap Mirror Node fetches in `src/lib/hedera.ts` and `server/routes/activity.ts`

**Files:**
- Modify: `src/lib/hedera.ts:325`
- Modify: `server/routes/activity.ts:84`

**Step 1: `src/lib/hedera.ts` — queryAuditTrail (line 325)**

Add import at top:
```typescript
import { fetchWithTimeout, TIMEOUT_BUDGETS } from '../server/utils/fetch-with-timeout';
```

Replace line 325:
```typescript
const res = await fetch(url);
```

With:
```typescript
const res = await fetchWithTimeout(url, { timeout: TIMEOUT_BUDGETS.HEDERA_MIRROR });
```

**Step 2: `server/routes/activity.ts` — fetchHCSAuditTrail (line 84)**

Add import at top:
```typescript
import { fetchWithTimeout, TIMEOUT_BUDGETS } from '../utils/fetch-with-timeout.js';
```

Replace line 84-85:
```typescript
const res = await fetch(
  `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=5&order=desc`,
);
```

With:
```typescript
const res = await fetchWithTimeout(
  `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=5&order=desc`,
  { timeout: TIMEOUT_BUDGETS.HEDERA_MIRROR },
);
```

**Step 3: Commit**

```bash
git add src/lib/hedera.ts server/routes/activity.ts
git commit -m "fix: add 8s timeout to Hedera Mirror Node REST queries"
```

---

### Task 12: Add retry to critical Hedera SDK operations in `src/lib/hedera.ts`

**Files:**
- Modify: `src/lib/hedera.ts`

**Step 1: Add import**

```typescript
import { withRetry, RETRY_POLICIES } from '../server/utils/retry';
```

**Step 2: Wrap `logAuditMessage` (line 302-313) — fire-and-forget audit, should retry**

Replace:
```typescript
export async function logAuditMessage(
  topicId: string,
  message: string,
): Promise<void> {
  const client = initClient();

  const tx = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message);

  const response = await tx.execute(client);
  await response.getReceipt(client);
}
```

With:
```typescript
export async function logAuditMessage(
  topicId: string,
  message: string,
): Promise<void> {
  return withRetry(async () => {
    const client = initClient();

    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message);

    const response = await tx.execute(client);
    await response.getReceipt(client);
  }, RETRY_POLICIES.HEDERA_TX);
}
```

**Step 3: Wrap `mintCredential` (line 123-140) — credential mint should retry**

Replace:
```typescript
export async function mintCredential(
  tokenId: string,
  metadata: Uint8Array[],
): Promise<number[]> {
  const client = initClient();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  const tx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata(metadata)
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);

  return receipt.serials.map((s) => Number(s));
}
```

With:
```typescript
export async function mintCredential(
  tokenId: string,
  metadata: Uint8Array[],
): Promise<number[]> {
  return withRetry(async () => {
    const client = initClient();
    const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

    const tx = new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata(metadata)
      .freezeWith(client);

    const signed = await tx.sign(operatorKey);
    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);

    return receipt.serials.map((s) => Number(s));
  }, RETRY_POLICIES.HEDERA_TX);
}
```

**Step 4: Verify existing tests still pass**

```bash
npx vitest run src/lib/__tests__/hedera.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/hedera.ts
git commit -m "feat: add retry with backoff to Hedera SDK operations (mintCredential, logAuditMessage)"
```

---

### Task 13: Adopt singleton clients in routes

**Files:**
- Modify: `server/routes/predictions.ts`
- Modify: `server/routes/edge.ts`
- Modify: `server/routes/proposals.ts`

These 3 routes create their own `new ethers.JsonRpcProvider()` + `new ethers.Wallet()` per-request (or per-singleton). Replace with `getOgProvider()` and `getOgSigner()` from `server/clients.ts`.

**Step 1: `server/routes/predictions.ts`**

Replace the local singleton pattern:
```typescript
import { getOgProvider, getOgSigner } from '../clients.js';
```

Replace the `getProvider()` / `getSigner()` local functions with calls to `getOgProvider()` / `getOgSigner()`.

**Step 2: `server/routes/edge.ts`**

Same pattern — replace `_edgeProvider` local singleton with `getOgProvider()`, replace `new ethers.Wallet(pk, _edgeProvider)` with `getOgSigner()`.

**Step 3: `server/routes/proposals.ts`**

Replace `getProvider()` and the `new ethers.Wallet()` calls with `getOgProvider()` / `getOgSigner()`.

**Step 4: Verify server starts**

```bash
npx tsx server/index.ts &
sleep 4
curl -s http://localhost:5001/api/predictions | head -1
kill %1
```

**Step 5: Commit**

```bash
git add server/routes/predictions.ts server/routes/edge.ts server/routes/proposals.ts
git commit -m "refactor: adopt singleton ethers provider/signer from server/clients.ts"
```

---

### Task 14: Add cache invalidation to all remaining POST routes

**Files:**
- Modify: `server/routes/edge.ts`
- Modify: `server/routes/gpu.ts`
- Modify: `server/routes/payments.ts`
- Modify: `server/routes/proposals.ts`
- Modify: `server/routes/seer.ts`
- Modify: `server/routes/world-id.ts`

**Step 1: Add invalidation calls after successful mutations**

`server/routes/edge.ts` — after hire or bet succeeds:
```typescript
app.responseCache.invalidate('/api/activity');
```

`server/routes/gpu.ts` — after register succeeds:
```typescript
app.responseCache.invalidate('/api/resources');
app.responseCache.invalidate('/api/agents');
```

`server/routes/payments.ts` — after payment settled:
```typescript
app.responseCache.invalidate('/api/activity');
```

`server/routes/proposals.ts` — after submit/approve/reject:
```typescript
app.responseCache.invalidate('/api/proposals');
```

`server/routes/seer.ts` — after inference:
```typescript
app.responseCache.invalidate('/api/activity');
```

`server/routes/world-id.ts` — after verify-proof succeeds:
```typescript
app.responseCache.invalidate('/api/resources');
```

**Step 2: Commit**

```bash
git add server/routes/edge.ts server/routes/gpu.ts server/routes/payments.ts server/routes/proposals.ts server/routes/seer.ts server/routes/world-id.ts
git commit -m "feat: complete cache invalidation on all POST mutation routes"
```

---

## Verification Checklist

After all waves complete:

```bash
# 1. All utility tests pass
npx vitest run server/__tests__/
# Expected: ~25 tests pass (fetch-with-timeout, retry, circuit-breaker, response-cache)

# 2. All existing tests still pass
npx vitest run
# Expected: 91+ tests pass

# 3. Server starts with all plugins
npx tsx server/index.ts &
sleep 2

# 4. Health check shows all plugins
curl -s http://localhost:5001/health | jq .plugins
# Expected: includes "response-cache" and "security-headers"

# 5. Security headers present
curl -sI http://localhost:5001/health | grep X-Content-Type-Options
# Expected: nosniff

# 6. Cache headers on GET endpoints
curl -sI http://localhost:5001/api/resources | grep -E 'Cache-Control|X-Cache'
# Expected: Cache-Control: public, max-age=30, ... + X-Cache: MISS (then HIT on repeat)

# 7. Graceful shutdown works
kill -SIGTERM $(lsof -ti:5001)
# Expected: "shutting down gracefully..." in logs

# 8. TypeScript clean
npx tsc -p server/tsconfig.json --noEmit
# Expected: 0 errors
```
