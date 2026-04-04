import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('viem', () => ({
  recoverMessageAddress: vi.fn(),
}));

vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
    Contract: vi.fn().mockImplementation(() => ({
      getMarket: vi.fn().mockResolvedValue([
        'Will H100 exceed $3/hr?',
        BigInt(1720000000),
        0,
        0,
        BigInt('1000000000000000000'),
        BigInt('500000000000000000'),
      ]),
      placeBet: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: '0xreal_tx_hash' }),
      }),
    })),
    Wallet: vi.fn().mockImplementation(() => ({})),
    parseEther: vi.fn().mockReturnValue(BigInt('10000000000000000')),
    formatEther: vi.fn().mockImplementation((v: bigint) => (Number(v) / 1e18).toString()),
  },
}));

vi.mock('../../agentkit', () => ({
  getAgent: vi.fn(),
}));

vi.mock('../../og-chain', () => ({
  getValidationSummary: vi.fn(),
}));

vi.mock('../../hedera', () => ({
  logAuditMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../cache', () => ({
  cachedFetch: vi.fn(),
  cacheGet: vi.fn().mockReturnValue(undefined),
  cacheSet: vi.fn(),
}));

import { verifySignature, handleA2A, handleMCP, mcpTools } from '../../agents/edge';
import { recoverMessageAddress } from 'viem';
import { getAgent } from '../../agentkit';
import { getValidationSummary } from '../../og-chain';
import { cachedFetch } from '../../cache';

const mockRecover = recoverMessageAddress as ReturnType<typeof vi.fn>;
const mockGetAgent = getAgent as ReturnType<typeof vi.fn>;
const mockValidation = getValidationSummary as ReturnType<typeof vi.fn>;
const mockCachedFetch = cachedFetch as ReturnType<typeof vi.fn>;

describe('Edge Signature Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OG_RPC_URL = 'https://evmrpc-testnet.0g.ai';
    process.env.RESOURCE_PREDICTION = '0x6ce572729a5cbc8aa9df7ac25d8076e80665194e';
    process.env.PRIVATE_KEY = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  });

  it('accepts valid signature matching agent wallet', async () => {
    mockRecover.mockResolvedValueOnce('0xAgentWallet123');
    mockGetAgent.mockResolvedValueOnce({ wallet: '0xAgentWallet123' });

    const result = await verifySignature('requestTrade', { marketId: 0 }, '0xsig', '7');
    expect(result.valid).toBe(true);
  });

  it('rejects signature from wrong wallet', async () => {
    mockRecover.mockResolvedValueOnce('0xAttackerWallet');
    mockGetAgent.mockResolvedValueOnce({ wallet: '0xAgentWallet123' });

    const result = await verifySignature('requestTrade', {}, '0xsig', '7');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not match');
  });

  it('rejects when agent not found in registry', async () => {
    mockRecover.mockResolvedValueOnce('0xSomeWallet');
    mockGetAgent.mockResolvedValueOnce(null);

    const result = await verifySignature('requestTrade', {}, '0xsig', '7');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('handles signature recovery failure gracefully', async () => {
    mockRecover.mockRejectedValueOnce(new Error('invalid signature'));

    const result = await verifySignature('requestTrade', {}, '0xbadsig', '7');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('verification failed');
  });
});

describe('Edge A2A', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OG_RPC_URL = 'https://evmrpc-testnet.0g.ai';
    process.env.RESOURCE_PREDICTION = '0x6ce572729a5cbc8aa9df7ac25d8076e80665194e';
    process.env.PRIVATE_KEY = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  });

  it('getMarket returns cached market data', async () => {
    const marketData = { marketId: 0, question: 'Test?', yesPool: '1.0', noPool: '0.5' };
    mockCachedFetch.mockResolvedValueOnce({ data: marketData, _demo: false });

    const result = await handleA2A({ method: 'getMarket', params: { marketId: 0 } });
    expect(result.result).toEqual(marketData);
  });

  it('getMarket returns demo when chain unreachable', async () => {
    mockCachedFetch.mockResolvedValueOnce({ data: { marketId: 0, question: 'Demo market' }, _demo: true });

    const result = await handleA2A({ method: 'getMarket', params: { marketId: 0 } });
    expect(result._demo).toBe(true);
  });

  it('requestTrade requires signature and agentId', async () => {
    const result = await handleA2A({
      method: 'requestTrade',
      params: { marketId: 0, side: 'yes', amount: '0.01' },
    });
    expect(result.error).toContain('requires signed payload');
  });

  it('requestTrade validates missing marketId', async () => {
    mockRecover.mockResolvedValueOnce('0xWallet');
    mockGetAgent.mockResolvedValueOnce({ wallet: '0xWallet' });

    const result = await handleA2A({
      method: 'requestTrade',
      params: { side: 'yes', amount: '0.01' },
      signature: '0xsig',
      agentId: '7',
    });
    expect(result.error).toContain('Missing marketId');
  });

  it('requestTrade validates invalid side', async () => {
    mockRecover.mockResolvedValueOnce('0xWallet');
    mockGetAgent.mockResolvedValueOnce({ wallet: '0xWallet' });

    const result = await handleA2A({
      method: 'requestTrade',
      params: { marketId: 0, side: 'maybe', amount: '0.01' },
      signature: '0xsig',
      agentId: '7',
    });
    expect(result.error).toContain('side must be');
  });

  it('requestTrade denies when Shield clearance fails', async () => {
    mockRecover.mockResolvedValueOnce('0xWallet');
    mockGetAgent.mockResolvedValueOnce({ wallet: '0xWallet' });
    mockValidation.mockResolvedValueOnce({ count: 0n, avgResponse: 0 });

    const result = await handleA2A({
      method: 'requestTrade',
      params: { marketId: 0, side: 'yes', amount: '0.01' },
      signature: '0xsig',
      agentId: '7',
    });
    expect(result.error).toContain('Shield clearance denied');
  });

  it('returns error for unknown method', async () => {
    const result = await handleA2A({ method: 'nonexistent' });
    expect(result.error).toContain('Unknown method');
  });
});

describe('Edge MCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes correct tool schemas', () => {
    expect(mcpTools).toHaveLength(2);
    expect(mcpTools.map((t) => t.name)).toEqual(['place_bet', 'check_clearance']);
  });

  it('place_bet requires signature', async () => {
    const result = await handleMCP({ tool: 'place_bet', input: { marketId: 0 } });
    expect(result.error).toContain('requires signed payload');
  });

  it('check_clearance validates agentId', async () => {
    mockCachedFetch.mockResolvedValueOnce({ data: { count: 0n, avgResponse: 0 }, _demo: false });

    const result = await handleMCP({ tool: 'check_clearance', input: { agentId: '7' } });
    expect(result.output).toHaveProperty('cleared');
  });

  it('returns error for unknown tool', async () => {
    const result = await handleMCP({ tool: 'nonexistent' });
    expect(result.error).toContain('Unknown tool');
  });
});
