import { describe, it, expect } from 'vitest';
import {
  simulateBet,
  formatOdds,
  formatMultiplier,
  isHighImpact,
  isBlockedImpact,
  formatPool,
} from '../prediction-math';

describe('simulateBet', () => {
  it('returns equal odds on empty pools', () => {
    const result = simulateBet(0n, 0n, 'yes', 100n);
    expect(result.newYesOdds).toBe(1);
    expect(result.newNoOdds).toBe(0);
    expect(result.estimatedPayout).toBe(100n);
    expect(result.estimatedMultiplier).toBe(1);
  });

  it('calculates correct odds for yes bet on balanced pool', () => {
    const result = simulateBet(1000n, 1000n, 'yes', 100n);
    expect(result.newYesOdds).toBeGreaterThan(0.5);
    expect(result.newNoOdds).toBeLessThan(0.5);
    expect(result.newYesOdds + result.newNoOdds).toBeCloseTo(1, 5);
  });

  it('calculates correct odds for no bet on balanced pool', () => {
    const result = simulateBet(1000n, 1000n, 'no', 100n);
    expect(result.newNoOdds).toBeGreaterThan(0.5);
    expect(result.newYesOdds).toBeLessThan(0.5);
  });

  it('payout exceeds bet amount when winning side is smaller', () => {
    const result = simulateBet(900n, 100n, 'no', 50n);
    expect(result.estimatedPayout).toBeGreaterThan(50n);
    expect(result.estimatedMultiplier).toBeGreaterThan(1);
  });

  it('reports price impact', () => {
    const result = simulateBet(1000n, 1000n, 'yes', 500n);
    expect(result.priceImpact).toBeGreaterThan(0);
  });

  it('handles large bets without overflow', () => {
    const large = 10n ** 18n;
    const result = simulateBet(large, large, 'yes', large);
    expect(result.newYesOdds).toBeGreaterThan(0.5);
    expect(result.estimatedMultiplier).toBeGreaterThan(0);
  });
});

describe('formatOdds', () => {
  it('formats 0.5 as 50.0%', () => {
    expect(formatOdds(0.5)).toBe('50.0%');
  });

  it('formats 1.0 as 100.0%', () => {
    expect(formatOdds(1)).toBe('100.0%');
  });

  it('formats 0 as 0.0%', () => {
    expect(formatOdds(0)).toBe('0.0%');
  });
});

describe('formatMultiplier', () => {
  it('formats 2.5 as 2.5x', () => {
    expect(formatMultiplier(2.5)).toBe('2.5x');
  });

  it('formats 1 as 1.0x', () => {
    expect(formatMultiplier(1)).toBe('1.0x');
  });
});

describe('isHighImpact', () => {
  it('returns false at 5%', () => {
    expect(isHighImpact(0.05)).toBe(false);
  });

  it('returns true above 5%', () => {
    expect(isHighImpact(0.051)).toBe(true);
  });
});

describe('isBlockedImpact', () => {
  it('returns false at 10%', () => {
    expect(isBlockedImpact(0.10)).toBe(false);
  });

  it('returns true above 10%', () => {
    expect(isBlockedImpact(0.101)).toBe(true);
  });
});

describe('formatPool', () => {
  it('formats large values with k suffix', () => {
    const oneThousandEth = (1000n * 10n ** 18n).toString();
    expect(formatPool(oneThousandEth)).toBe('1.0k');
  });

  it('formats mid values with 1 decimal', () => {
    const fiveEth = (5n * 10n ** 18n).toString();
    expect(formatPool(fiveEth)).toBe('5.0');
  });

  it('formats small values with 4 decimals', () => {
    const small = (10n ** 14n).toString();
    expect(formatPool(small)).toBe('0.0001');
  });
});
