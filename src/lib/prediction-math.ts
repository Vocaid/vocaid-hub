const PRECISION = 10_000n;

export interface BetSimulation {
  newYesOdds: number;
  newNoOdds: number;
  priceImpact: number;
  estimatedPayout: bigint;
  estimatedMultiplier: number;
}

export function simulateBet(
  yesPool: bigint,
  noPool: bigint,
  side: 'yes' | 'no',
  amount: bigint,
): BetSimulation {
  const totalBefore = yesPool + noPool;
  if (totalBefore === 0n) {
    return {
      newYesOdds: side === 'yes' ? 1 : 0,
      newNoOdds: side === 'no' ? 1 : 0,
      priceImpact: 0,
      estimatedPayout: amount,
      estimatedMultiplier: 1,
    };
  }

  const oldYesOdds = Number(yesPool * PRECISION / totalBefore) / Number(PRECISION);

  const newYesPool = side === 'yes' ? yesPool + amount : yesPool;
  const newNoPool = side === 'no' ? noPool + amount : noPool;
  const totalAfter = newYesPool + newNoPool;

  const newYesOdds = Number(newYesPool * PRECISION / totalAfter) / Number(PRECISION);
  const newNoOdds = 1 - newYesOdds;

  const priceImpact = Math.abs(newYesOdds - oldYesOdds);

  const winningPool = side === 'yes' ? newYesPool : newNoPool;
  const estimatedPayout = winningPool > 0n
    ? (amount * totalAfter) / winningPool
    : 0n;

  const estimatedMultiplier = amount > 0n
    ? Number(estimatedPayout * PRECISION / amount) / Number(PRECISION)
    : 0;

  return {
    newYesOdds,
    newNoOdds,
    priceImpact,
    estimatedPayout,
    estimatedMultiplier,
  };
}

export function formatOdds(odds: number): string {
  return `${(odds * 100).toFixed(1)}%`;
}

export function formatMultiplier(m: number): string {
  return `${m.toFixed(1)}x`;
}

export function isHighImpact(impact: number): boolean {
  return impact > 0.05;
}

export function isBlockedImpact(impact: number): boolean {
  return impact > 0.10;
}

export function formatPool(wei: string): string {
  const val = Number(BigInt(wei)) / 1e18;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  if (val >= 1) return val.toFixed(1);
  return val.toFixed(4);
}
