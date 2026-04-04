import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../reputation', () => ({
  giveFeedback: vi.fn(),
  getReputation: vi.fn(),
  getAllReputationScores: vi.fn(),
}));

vi.mock('../../og-chain', () => ({
  getRegisteredProviders: vi.fn(),
}));

vi.mock('../../hedera', () => ({
  logAuditMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../cache', () => ({
  cachedFetch: vi.fn(),
  cacheGet: vi.fn().mockReturnValue(undefined),
  cacheSet: vi.fn(),
}));

import { handleA2A, handleMCP, mcpTools } from '../../agents/lens';
import { giveFeedback } from '../../reputation';
import { cachedFetch } from '../../cache';

const mockGiveFeedback = giveFeedback as ReturnType<typeof vi.fn>;
const mockCachedFetch = cachedFetch as ReturnType<typeof vi.fn>;

describe('Lens A2A', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getReputationScores returns scores for agent', async () => {
    const scores = [
      { tag: 'starred', averageValue: 90, count: 5 },
      { tag: 'uptime', averageValue: 99, count: 3 },
    ];
    mockCachedFetch.mockResolvedValueOnce({ data: scores, _demo: false });

    const result = await handleA2A({ method: 'getReputationScores', params: { agentId: '7' } });
    const res = result.result as Record<string, unknown>;
    expect(res.agentId).toBe('7');
    expect(res.scores).toEqual(scores);
  });

  it('getReputationScores validates missing agentId', async () => {
    const result = await handleA2A({ method: 'getReputationScores', params: {} });
    expect(result.error).toContain('Missing agentId');
  });

  it('getObservation with agentId returns single reputation', async () => {
    const rep = { agentId: '7', tag: 'uptime', count: 3, averageValue: 99, decimals: 2 };
    mockCachedFetch.mockResolvedValueOnce({ data: rep, _demo: false });

    const result = await handleA2A({ method: 'getObservation', params: { agentId: '7', tag: 'uptime' } });
    expect(result.result).toEqual(rep);
  });

  it('getObservation without agentId returns provider list', async () => {
    const providers = [{ address: '0xabc', gpuModel: 'H100' }];
    mockCachedFetch.mockResolvedValueOnce({ data: providers, _demo: false });

    const result = await handleA2A({ method: 'getObservation', params: {} });
    expect((result.result as Record<string, unknown>).providers).toEqual(providers);
  });

  it('submitFeedback validates missing agentId', async () => {
    const result = await handleA2A({ method: 'submitFeedback', params: { value: 85 } });
    expect(result.error).toContain('Missing agentId');
  });

  it('submitFeedback validates zero value', async () => {
    const result = await handleA2A({ method: 'submitFeedback', params: { agentId: '7', value: 0 } });
    expect(result.error).toContain('value must be positive');
  });

  it('submitFeedback calls giveFeedback and returns txHash', async () => {
    mockGiveFeedback.mockResolvedValueOnce({ txHash: '0xfeedback_tx', feedbackHash: '0xhash' });

    const result = await handleA2A({
      method: 'submitFeedback',
      params: { agentId: '7', value: 85, tag: 'starred' },
    });
    const res = result.result as Record<string, unknown>;
    expect(res.success).toBe(true);
    expect(res.txHash).toBe('0xfeedback_tx');
    expect(mockGiveFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: BigInt(7), value: 85, tag1: 'starred' }),
    );
  });

  it('returns error for unknown method', async () => {
    const result = await handleA2A({ method: 'nonexistent' });
    expect(result.error).toContain('Unknown method');
  });
});

describe('Lens MCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes correct tool schemas', () => {
    expect(mcpTools).toHaveLength(2);
    expect(mcpTools.map((t) => t.name)).toEqual(['give_feedback', 'get_reputation_scores']);
  });

  it('give_feedback delegates to submitFeedback', async () => {
    mockGiveFeedback.mockResolvedValueOnce({ txHash: '0xtx', feedbackHash: '0xhash' });

    const result = await handleMCP({
      tool: 'give_feedback',
      input: { agentId: '7', value: 90, tag: 'uptime' },
    });
    expect(result.output).toHaveProperty('success', true);
  });

  it('returns error for unknown tool', async () => {
    const result = await handleMCP({ tool: 'nonexistent' });
    expect(result.error).toContain('Unknown tool');
  });
});
