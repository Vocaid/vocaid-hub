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
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('edge', '10.0.0.1')).toBe(true);
    }
  });

  it('blocks requests over agent limit', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('edge', '10.0.0.2');
    }
    expect(checkRateLimit('edge', '10.0.0.2')).toBe(false);
  });

  it('isolates rate limits per IP', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('edge', '10.0.0.3');
    }
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
    for (let i = 0; i < 10; i++) {
      checkRateLimit('seer', '10.0.0.6');
    }
    expect(checkRateLimit('seer', '10.0.0.6')).toBe(true);
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
