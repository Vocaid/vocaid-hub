import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../og-compute', () => ({
  listProviders: vi.fn(),
}));

vi.mock('../../og-broker', () => ({
  callInference: vi.fn(),
}));

vi.mock('../../hedera', () => ({
  logAuditMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../cache', () => ({
  cachedFetch: vi.fn(),
  cacheGet: vi.fn().mockReturnValue(undefined),
  cacheSet: vi.fn(),
}));

import { handleA2A, handleMCP, mcpTools } from '../../agents/seer';
import { cachedFetch } from '../../cache';

const mockCachedFetch = cachedFetch as ReturnType<typeof vi.fn>;

describe('Seer A2A', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProviders returns provider list', async () => {
    const mockProviders = [{ provider: '0xabc', model: 'llama-3', url: 'http://...' }];
    mockCachedFetch.mockResolvedValueOnce({ data: mockProviders, _demo: false });

    const result = await handleA2A({ method: 'getProviders' });
    expect(result.result).toEqual({ providers: mockProviders, count: 1 });
    expect(result._demo).toBeUndefined();
  });

  it('getProviders returns demo flag when broker unreachable', async () => {
    mockCachedFetch.mockResolvedValueOnce({ data: [], _demo: true });

    const result = await handleA2A({ method: 'getProviders' });
    expect(result._demo).toBe(true);
    expect(result._reason).toContain('unreachable');
  });

  it('runInference returns error on empty prompt', async () => {
    const result = await handleA2A({ method: 'runInference', params: { prompt: '' } });
    expect(result.error).toBe('Missing prompt parameter');
  });

  it('runInference returns demo response when no providers', async () => {
    mockCachedFetch.mockResolvedValueOnce({ data: [], _demo: false });

    const result = await handleA2A({ method: 'runInference', params: { prompt: 'test' } });
    expect(result._demo).toBe(true);
    expect(result.result).toHaveProperty('provider', 'mock-seer-fallback');
  });

  it('querySignal delegates to runInference', async () => {
    mockCachedFetch.mockResolvedValueOnce({ data: [], _demo: false });

    const result = await handleA2A({ method: 'querySignal', params: {} });
    expect(result._demo).toBe(true);
    expect(result.result).toHaveProperty('model', 'seer-analysis-v1');
  });

  it('returns error for unknown method', async () => {
    const result = await handleA2A({ method: 'nonexistent' });
    expect(result.error).toContain('Unknown method');
    expect(result.error).toContain('getProviders');
  });
});

describe('Seer MCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes correct tool schemas', () => {
    expect(mcpTools).toHaveLength(2);
    expect(mcpTools.map((t) => t.name)).toEqual(['list_providers', 'run_inference']);
  });

  it('list_providers tool returns provider data', async () => {
    mockCachedFetch.mockResolvedValueOnce({ data: [{ provider: '0x1' }], _demo: false });

    const result = await handleMCP({ tool: 'list_providers' });
    expect(result.output).toHaveProperty('providers');
  });

  it('run_inference tool validates prompt', async () => {
    const result = await handleMCP({ tool: 'run_inference', input: { prompt: '' } });
    expect(result.error).toBe('Missing prompt parameter');
  });

  it('returns error for unknown tool', async () => {
    const result = await handleMCP({ tool: 'nonexistent' });
    expect(result.error).toContain('Unknown tool');
    expect(result.error).toContain('list_providers');
  });

  it('run_inference returns demo when no providers', async () => {
    mockCachedFetch.mockResolvedValueOnce({ data: [], _demo: false });

    const result = await handleMCP({ tool: 'run_inference', input: { prompt: 'analyze GPU market' } });
    expect(result._demo).toBe(true);
  });
});
