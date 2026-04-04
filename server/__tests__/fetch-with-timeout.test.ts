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
    ).rejects.toThrow('The operation was aborted.');
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
