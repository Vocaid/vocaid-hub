import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../og-chain', () => ({
  getValidationSummary: vi.fn(),
  getRegisteredProviders: vi.fn(),
}));

vi.mock('../../reputation', () => ({
  getAllReputationScores: vi.fn(),
}));

vi.mock('../../cache', () => ({
  cachedFetch: vi.fn(),
  cacheGet: vi.fn().mockReturnValue(undefined),
  cacheSet: vi.fn(),
}));

import { handleA2A, handleMCP, mcpTools } from '../../agents/shield';
import { cachedFetch } from '../../cache';

const mockCachedFetch = cachedFetch as ReturnType<typeof vi.fn>;

describe('Shield A2A', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requestClearance returns cleared=true when validation passes', async () => {
    mockCachedFetch.mockResolvedValueOnce({
      data: { count: 3n, avgResponse: 85 },
      _demo: false,
    });

    const result = await handleA2A({ method: 'requestClearance', params: { agentId: '7' } });
    const res = result.result as Record<string, unknown>;
    expect(res.cleared).toBe(true);
    expect(res.validationCount).toBe(3);
    expect(res.avgResponse).toBe(85);
  });

  it('requestClearance returns cleared=false when avgResponse below threshold', async () => {
    mockCachedFetch.mockResolvedValueOnce({
      data: { count: 1n, avgResponse: 30 },
      _demo: false,
    });

    const result = await handleA2A({ method: 'requestClearance', params: { agentId: '7' } });
    expect((result.result as Record<string, unknown>).cleared).toBe(false);
  });

  it('requestClearance validates missing agentId', async () => {
    const result = await handleA2A({ method: 'requestClearance', params: {} });
    expect(result.error).toContain('Missing agentId');
  });

  it('requestClearance returns demo when chain unreachable', async () => {
    mockCachedFetch.mockResolvedValueOnce({
      data: { count: 0n, avgResponse: 0 },
      _demo: true,
    });

    const result = await handleA2A({ method: 'requestClearance', params: { agentId: '7' } });
    expect(result._demo).toBe(true);
  });

  it('checkReputation returns scores array', async () => {
    const scores = [{ tag: 'starred', averageValue: 90, count: 5 }];
    mockCachedFetch.mockResolvedValueOnce({ data: scores, _demo: false });

    const result = await handleA2A({ method: 'checkReputation', params: { agentId: '7' } });
    expect((result.result as Record<string, unknown>).scores).toEqual(scores);
  });

  it('checkReputation validates missing agentId', async () => {
    const result = await handleA2A({ method: 'checkReputation', params: {} });
    expect(result.error).toContain('Missing agentId');
  });

  it('returns error for unknown method', async () => {
    const result = await handleA2A({ method: 'nonexistent' });
    expect(result.error).toContain('Unknown method');
  });
});

describe('Shield MCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes correct tool schemas', () => {
    expect(mcpTools).toHaveLength(2);
    expect(mcpTools.map((t) => t.name)).toEqual(['check_validation', 'evaluate_risk']);
  });

  it('evaluate_risk returns combined risk assessment', async () => {
    mockCachedFetch
      .mockResolvedValueOnce({ data: { count: 2n, avgResponse: 75 }, _demo: false })
      .mockResolvedValueOnce({ data: [{ tag: 'starred', averageValue: 85 }], _demo: false });

    const result = await handleMCP({ tool: 'evaluate_risk', input: { agentId: '7' } });
    const output = result.output as Record<string, unknown>;
    expect(output.riskLevel).toBe('low');
    expect(output).toHaveProperty('clearance');
    expect(output).toHaveProperty('reputation');
  });

  it('returns error for unknown tool', async () => {
    const result = await handleMCP({ tool: 'nonexistent' });
    expect(result.error).toContain('Unknown tool');
  });
});
