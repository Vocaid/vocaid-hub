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
