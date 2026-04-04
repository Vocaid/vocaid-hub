# A2A/MCP Infrastructure Test Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add ~70 tests across 6 test files covering the entire A2A/MCP agent infrastructure — cache, router, and all 4 agent handlers — with mocked chain calls and time-dependent state machine tests.

**Architecture:** Tests mock all external dependencies (viem, ethers, 0G broker, Hedera SDK) at the module level using `vi.mock()`. Time-dependent tests (cache TTL, circuit breaker, rate limiter) use `vi.useFakeTimers()`. Each agent handler test mocks its upstream lib modules (og-chain, og-compute, reputation, hedera) rather than real chain calls. All tests are pure unit tests — no network, no filesystem.

**Tech Stack:** Vitest 4.1.2, `vi.mock()` for module mocking, `vi.useFakeTimers()` for time control, `vi.stubGlobal('fetch')` for HTTP mocking.

**Existing test pattern reference:** `src/lib/__tests__/hedera.test.ts` (global fetch mock + beforeEach reset)

---

### Task 1: Cache TTL + Circuit Breaker Tests (12 tests)

**Files:**
- Create: `src/lib/__tests__/cache.test.ts`
- Reference: `src/lib/cache.ts`

**Step 1: Write the full test file**

```typescript
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
    // Clear all internal state by invalidating known keys
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
    // Reset breaker state by recording success on test backends
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
    // Half-open: allows one attempt (returns false, resets state)
    expect(isCircuitOpen('test-backend')).toBe(false);
  });

  it('resets on success', () => {
    recordFailure('test-backend');
    recordFailure('test-backend');
    recordSuccess('test-backend');
    // Success clears failure count
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

    // Second call should hit cache, not fetcher
    const result2 = await cachedFetch('cf-key', 'cf-backend', 10_000, fetcher, { items: [] });
    expect(result2).toEqual({ data: { items: [1, 2, 3] }, _demo: false });
    expect(fetcher).toHaveBeenCalledOnce(); // Still 1 call
  });

  it('returns fallback when fetcher throws', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'));
    const fallback = { items: [] };

    const result = await cachedFetch('cf-key', 'cf-backend', 10_000, fetcher, fallback);
    expect(result).toEqual({ data: fallback, _demo: true });
  });

  it('returns fallback when circuit is open (skips fetcher)', async () => {
    // Open the circuit
    recordFailure('cf-backend');
    recordFailure('cf-backend');
    recordFailure('cf-backend');

    const fetcher = vi.fn().mockResolvedValue('should not be called');
    const result = await cachedFetch('cf-key', 'cf-backend', 10_000, fetcher, 'fallback');
    expect(result).toEqual({ data: 'fallback', _demo: true });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/__tests__/cache.test.ts`
Expected: 12 tests PASS

**Step 3: Commit**

```bash
git add src/lib/__tests__/cache.test.ts
git commit -m "test: add cache TTL + circuit breaker tests (12 tests)"
```

---

### Task 2: Agent Router Tests (10 tests)

**Files:**
- Create: `src/lib/__tests__/agent-router.test.ts`
- Reference: `src/lib/agent-router.ts`

**Step 1: Write the full test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isValidAgent, checkRateLimit, getAgentCard } from '../agent-router';

// Mock the cache module (agent-router imports cacheGet/cacheSet from ./cache)
vi.mock('../cache', () => ({
  cacheGet: vi.fn().mockReturnValue(undefined),
  cacheSet: vi.fn(),
}));

// Mock fs and path for getAgentCard
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue(JSON.stringify({
    name: 'Seer',
    version: '1.0.0',
    protocol: 'erc-8004-registration-v1',
    services: [],
  })),
}));

vi.mock('path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
}));

describe('isValidAgent', () => {
  it('returns true for valid agent names', () => {
    expect(isValidAgent('seer')).toBe(true);
    expect(isValidAgent('edge')).toBe(true);
    expect(isValidAgent('shield')).toBe(true);
    expect(isValidAgent('lens')).toBe(true);
  });

  it('returns false for invalid agent names', () => {
    expect(isValidAgent('unknown')).toBe(false);
    expect(isValidAgent('')).toBe(false);
    expect(isValidAgent('SEER')).toBe(false);
    expect(isValidAgent('seer ')).toBe(false);
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows first request', () => {
    expect(checkRateLimit('seer', '1.2.3.4')).toBe(true);
  });

  it('allows requests up to agent limit', () => {
    // Edge limit is 5
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('edge', '10.0.0.1')).toBe(true);
    }
  });

  it('blocks requests over agent limit', () => {
    // Edge limit is 5
    for (let i = 0; i < 5; i++) {
      checkRateLimit('edge', '10.0.0.2');
    }
    expect(checkRateLimit('edge', '10.0.0.2')).toBe(false);
  });

  it('isolates rate limits per IP', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('edge', '10.0.0.3');
    }
    // Different IP should still be allowed
    expect(checkRateLimit('edge', '10.0.0.4')).toBe(true);
  });

  it('resets window after 60 seconds', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('edge', '10.0.0.5');
    }
    expect(checkRateLimit('edge', '10.0.0.5')).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit('edge', '10.0.0.5')).toBe(true);
  });

  it('has different limits per agent', () => {
    // Seer allows 30, Edge allows 5
    for (let i = 0; i < 10; i++) {
      checkRateLimit('seer', '10.0.0.6');
    }
    expect(checkRateLimit('seer', '10.0.0.6')).toBe(true); // Still under 30
  });
});

describe('getAgentCard', () => {
  it('returns parsed card JSON', async () => {
    const card = await getAgentCard('seer');
    expect(card).toHaveProperty('name', 'Seer');
    expect(card).toHaveProperty('protocol', 'erc-8004-registration-v1');
  });

  it('uses cache for repeated calls', async () => {
    const { cacheGet } = await import('../cache');
    (cacheGet as ReturnType<typeof vi.fn>).mockReturnValueOnce({ name: 'CachedSeer', cached: true });

    const card = await getAgentCard('seer');
    expect(card).toHaveProperty('name', 'CachedSeer');
    expect(card).toHaveProperty('cached', true);
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/__tests__/agent-router.test.ts`
Expected: 10 tests PASS

**Step 3: Commit**

```bash
git add src/lib/__tests__/agent-router.test.ts
git commit -m "test: add agent-router validation + rate limiter tests (10 tests)"
```

---

### Task 3: Seer Agent Handler Tests (12 tests)

**Files:**
- Create: `src/lib/__tests__/agents/seer.test.ts`
- Reference: `src/lib/agents/seer.ts`

**Step 1: Write the full test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies BEFORE importing the module under test
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
    // querySignal calls runInference with a default prompt
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
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/__tests__/agents/seer.test.ts`
Expected: 12 tests PASS (note: the mock pattern bypasses real 0G calls)

**Step 3: Commit**

```bash
git add src/lib/__tests__/agents/seer.test.ts
git commit -m "test: add Seer agent A2A + MCP handler tests (12 tests)"
```

---

### Task 4: Edge Agent Handler Tests (15 tests)

**Files:**
- Create: `src/lib/__tests__/agents/edge.test.ts`
- Reference: `src/lib/agents/edge.ts`

**Step 1: Write the full test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock viem signature recovery
vi.mock('viem', () => ({
  recoverMessageAddress: vi.fn(),
}));

// Mock ethers for contract interaction
vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
    Contract: vi.fn().mockImplementation(() => ({
      getMarket: vi.fn().mockResolvedValue([
        'Will H100 exceed $3/hr?', // question
        BigInt(1720000000),        // resolutionTime
        0,                         // state
        0,                         // winningOutcome
        BigInt('1000000000000000000'), // yesPool (1 ETH)
        BigInt('500000000000000000'),  // noPool (0.5 ETH)
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

// Mock agentkit for identity lookup
vi.mock('../../agentkit', () => ({
  getAgent: vi.fn(),
}));

// Mock og-chain for validation checks
vi.mock('../../og-chain', () => ({
  getValidationSummary: vi.fn(),
}));

// Mock hedera for audit logging
vi.mock('../../hedera', () => ({
  logAuditMessage: vi.fn().mockResolvedValue(undefined),
}));

// Mock cache module
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
    // Set required env vars
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
      // No signature or agentId
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
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/__tests__/agents/edge.test.ts`
Expected: 15 tests PASS

**Step 3: Commit**

```bash
git add src/lib/__tests__/agents/edge.test.ts
git commit -m "test: add Edge agent handler tests with signature verification (15 tests)"
```

---

### Task 5: Shield Agent Handler Tests (10 tests)

**Files:**
- Create: `src/lib/__tests__/agents/shield.test.ts`
- Reference: `src/lib/agents/shield.ts`

**Step 1: Write the full test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
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
    // Two cachedFetch calls: clearance + reputation
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
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/__tests__/agents/shield.test.ts`
Expected: 10 tests PASS

**Step 3: Commit**

```bash
git add src/lib/__tests__/agents/shield.test.ts
git commit -m "test: add Shield agent handler tests with clearance logic (10 tests)"
```

---

### Task 6: Lens Agent Handler Tests (11 tests)

**Files:**
- Create: `src/lib/__tests__/agents/lens.test.ts`
- Reference: `src/lib/agents/lens.ts`

**Step 1: Write the full test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
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
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/__tests__/agents/lens.test.ts`
Expected: 11 tests PASS

**Step 3: Commit**

```bash
git add src/lib/__tests__/agents/lens.test.ts
git commit -m "test: add Lens agent handler tests with feedback flow (11 tests)"
```

---

### Task 7: Update README Lib Listing + Run Full Suite

**Files:**
- Modify: `README.md:268-282` (lib listing)
- Modify: `docs/PENDING_WORK.md` (log new gap item for test suite)

**Step 1: Update README lib listing to include new files**

In `README.md`, replace the lib section (lines 268-282) to include cache.ts, agent-router.ts, and agents/:

```markdown
│   ├── lib/                    # Shared server utilities (18 files)
│   │   ├── hedera.ts           # @hashgraph/sdk wrapper
│   │   ├── hedera-agent.ts     # Hedera Agent Kit wrapper
│   │   ├── blocky402.ts        # x402 facilitator client
│   │   ├── og-chain.ts         # 0G Chain + ERC-8004
│   │   ├── og-compute.ts       # 0G inference broker
│   │   ├── og-broker.ts        # 0G broker types + helpers
│   │   ├── og-storage.ts       # 0G Storage KV persistence
│   │   ├── agentkit.ts         # World AgentKit registration
│   │   ├── world-id.ts         # World ID verification
│   │   ├── x402-middleware.ts   # x402 payment middleware
│   │   ├── reputation.ts       # ERC-8004 reputation queries
│   │   ├── prediction-math.ts  # Prediction market math
│   │   ├── contracts.ts        # ABIs + addresses
│   │   ├── cache.ts            # TTL cache + circuit breaker
│   │   ├── agent-router.ts     # Agent dispatch + rate limiter
│   │   ├── agents/             # Per-agent A2A + MCP handlers
│   │   │   ├── seer.ts         # Signal analysis (0G Compute)
│   │   │   ├── edge.ts         # Trade execution (signed payloads)
│   │   │   ├── shield.ts       # Risk management (validation)
│   │   │   └── lens.ts         # Discovery + reputation feedback
│   │   └── types.ts            # Shared TypeScript types
```

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: 92 tests PASS (22 existing + 70 new)

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: 0 new errors (pre-existing seed-demo-data errors only)

**Step 4: Commit all**

```bash
git add src/lib/__tests__/ README.md
git commit -m "test: add A2A/MCP infrastructure test suite (70 tests) + update README lib listing"
```

---

## Verification Checklist

After all tasks complete, run:

```bash
# Full test suite
npx vitest run

# Expected output:
# Test Files  8 passed (8)
#      Tests  92 passed (92)

# TypeScript check
npx tsc --noEmit --skipLibCheck
# Expected: 0 new errors

# Verify test file structure
ls -la src/lib/__tests__/
# cache.test.ts
# agent-router.test.ts
# hedera.test.ts (existing)
# prediction-math.test.ts (existing)

ls -la src/lib/__tests__/agents/
# seer.test.ts
# edge.test.ts
# shield.test.ts
# lens.test.ts
```

## Test Count Summary

| File | Tests | What's Covered |
|------|-------|----------------|
| `cache.test.ts` | 12 | TTL expiry, circuit breaker state machine, cachedFetch integration |
| `agent-router.test.ts` | 10 | Name validation, rate limiter windows/limits/isolation, card caching |
| `agents/seer.test.ts` | 12 | Provider listing, inference fallback, A2A dispatch, MCP schemas |
| `agents/edge.test.ts` | 15 | Signature verification (4 cases), trade validation, Shield clearance, MCP auth |
| `agents/shield.test.ts` | 10 | Clearance logic (pass/fail/demo), reputation, risk assessment |
| `agents/lens.test.ts` | 11 | Feedback validation/execution, observation modes, MCP delegation |
| **TOTAL NEW** | **70** | **Full A2A/MCP infrastructure coverage** |
| **+ Existing** | **22** | **prediction-math (18) + hedera (4)** |
| **GRAND TOTAL** | **92** | |
