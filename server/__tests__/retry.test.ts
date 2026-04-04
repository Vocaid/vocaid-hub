// server/__tests__/retry.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { withRetry, isRetryable } from '../utils/retry';

describe('withRetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

    const result = await withRetry(fn, { maxRetries: 2, baseDelay: 1 });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelay: 1 }),
    ).rejects.toThrow('ECONNREFUSED');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'));

    await expect(
      withRetry(fn, { maxRetries: 3, baseDelay: 1 }),
    ).rejects.toThrow('aborted');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('respects maxDelay cap', async () => {
    const delays: number[] = [];
    const origSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: TimerHandler, ms?: number) => {
      if (typeof ms === 'number' && ms > 0) delays.push(ms);
      // Execute immediately so test doesn't hang
      if (typeof fn === 'function') fn();
      return origSetTimeout(() => {}, 0);
    });

    const fnAlwaysFails = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));

    try {
      await withRetry(fnAlwaysFails, { maxRetries: 5, baseDelay: 1000, maxDelay: 4000 });
    } catch { /* expected */ }

    // All delays should be <= maxDelay + jitter(200)
    expect(delays.length).toBeGreaterThan(0);
    for (const d of delays) {
      expect(d).toBeLessThanOrEqual(4200);
    }
  });

  it('accepts custom retryOn predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('CUSTOM'));

    await expect(
      withRetry(fn, {
        maxRetries: 2,
        baseDelay: 1,
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
