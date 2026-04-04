/**
 * Generic TTL cache + per-backend circuit breaker.
 * Shared across A2A/MCP agent endpoints to avoid hammering testnet RPCs.
 */

// ---------------------------------------------------------------------------
// TTL Cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheInvalidate(key: string): void {
  store.delete(key);
}

// ---------------------------------------------------------------------------
// Circuit Breaker (per-backend)
// ---------------------------------------------------------------------------

interface BreakerState {
  failures: number;
  openUntil: number;
}

const breakers = new Map<string, BreakerState>();

const MAX_FAILURES = 3;
const OPEN_DURATION_MS = 30_000;

export function isCircuitOpen(backend: string): boolean {
  const state = breakers.get(backend);
  if (!state) return false;
  if (state.failures < MAX_FAILURES) return false;
  if (Date.now() > state.openUntil) {
    // Half-open: allow one attempt
    breakers.delete(backend);
    return false;
  }
  return true;
}

export function recordFailure(backend: string): void {
  const state = breakers.get(backend) ?? { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= MAX_FAILURES) {
    state.openUntil = Date.now() + OPEN_DURATION_MS;
  }
  breakers.set(backend, state);
}

export function recordSuccess(backend: string): void {
  breakers.delete(backend);
}

// ---------------------------------------------------------------------------
// Cache-through helper (combines cache + circuit breaker)
// ---------------------------------------------------------------------------

export async function cachedFetch<T>(
  key: string,
  backend: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; _demo: boolean }> {
  // Check cache first
  const cached = cacheGet<T>(key);
  if (cached !== undefined) return { data: cached, _demo: false };

  // If circuit is open, return fallback
  if (isCircuitOpen(backend)) {
    return { data: fallback, _demo: true };
  }

  try {
    const data = await fetcher();
    cacheSet(key, data, ttlMs);
    recordSuccess(backend);
    return { data, _demo: false };
  } catch {
    recordFailure(backend);
    return { data: fallback, _demo: true };
  }
}
