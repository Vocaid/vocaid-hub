import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  isCircuitOpen,
  recordFailure,
  recordSuccess,
  cachedFetch,
} from '../cache';

describe('TTL Cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cacheInvalidate('test-key');
    cacheInvalidate('ttl-key');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns undefined for missing key', () => {
    expect(cacheGet('nonexistent')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    cacheSet('test-key', { foo: 'bar' }, 10_000);
    expect(cacheGet('test-key')).toEqual({ foo: 'bar' });
  });

  it('expires after TTL', () => {
    cacheSet('ttl-key', 'hello', 5_000);
    expect(cacheGet('ttl-key')).toBe('hello');

    vi.advanceTimersByTime(5_001);
    expect(cacheGet('ttl-key')).toBeUndefined();
  });

  it('invalidates a cached key', () => {
    cacheSet('test-key', 42, 60_000);
    expect(cacheGet('test-key')).toBe(42);

    cacheInvalidate('test-key');
    expect(cacheGet('test-key')).toBeUndefined();
  });
});

describe('Circuit Breaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    recordSuccess('test-backend');
    recordSuccess('og-chain');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts closed (not open)', () => {
    expect(isCircuitOpen('test-backend')).toBe(false);
  });

  it('stays closed after 1-2 failures', () => {
    recordFailure('test-backend');
    expect(isCircuitOpen('test-backend')).toBe(false);
    recordFailure('test-backend');
    expect(isCircuitOpen('test-backend')).toBe(false);
  });

  it('opens after 3 consecutive failures', () => {
    recordFailure('test-backend');
    recordFailure('test-backend');
    recordFailure('test-backend');
    expect(isCircuitOpen('test-backend')).toBe(true);
  });

  it('transitions to half-open after 30s', () => {
    recordFailure('test-backend');
    recordFailure('test-backend');
    recordFailure('test-backend');
    expect(isCircuitOpen('test-backend')).toBe(true);

    vi.advanceTimersByTime(30_001);
    expect(isCircuitOpen('test-backend')).toBe(false);
  });

  it('resets on success', () => {
    recordFailure('test-backend');
    recordFailure('test-backend');
    recordSuccess('test-backend');
    recordFailure('test-backend');
    expect(isCircuitOpen('test-backend')).toBe(false);
  });
});

describe('cachedFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cacheInvalidate('cf-key');
    recordSuccess('cf-backend');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls fetcher on cache miss and caches result', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] });

    const result = await cachedFetch('cf-key', 'cf-backend', 10_000, fetcher, { items: [] });
    expect(result).toEqual({ data: { items: [1, 2, 3] }, _demo: false });
    expect(fetcher).toHaveBeenCalledOnce();

    const result2 = await cachedFetch('cf-key', 'cf-backend', 10_000, fetcher, { items: [] });
    expect(result2).toEqual({ data: { items: [1, 2, 3] }, _demo: false });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('returns fallback when fetcher throws', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'));
    const fallback = { items: [] };

    const result = await cachedFetch('cf-key', 'cf-backend', 10_000, fetcher, fallback);
    expect(result).toEqual({ data: fallback, _demo: true });
  });

  it('returns fallback when circuit is open (skips fetcher)', async () => {
    recordFailure('cf-backend');
    recordFailure('cf-backend');
    recordFailure('cf-backend');

    const fetcher = vi.fn().mockResolvedValue('should not be called');
    const result = await cachedFetch('cf-key', 'cf-backend', 10_000, fetcher, 'fallback');
    expect(result).toEqual({ data: 'fallback', _demo: true });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
