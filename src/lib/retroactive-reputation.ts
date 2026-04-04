import type { ProviderActivity, ProviderService } from './og-inference-serving';

export interface ReputationSignals {
  activity: number;
  settlementHealth: number;
  teeCompliance: number;
  pricing: number;
  disputeRate: number;
  longevity: number;
  composite: number;
}

const WEIGHTS = {
  activity: 0.25,
  settlementHealth: 0.20,
  teeCompliance: 0.15,
  pricing: 0.15,
  disputeRate: 0.15,
  longevity: 0.10,
};

/**
 * Compute 6 reputation signals + weighted composite for a provider.
 *
 * Signals:
 *   1. Activity     — min(100, uniqueClients * 5)
 *   2. Settlement   — 100 - (refundCount / txCount * 100)
 *   3. TEE          — 100 if verifiability present, else 0
 *   4. Pricing      — 100 - (providerPrice / medianPrice * 50), clamped
 *   5. Disputes     — 100 - (refunds / txCount * 100)
 *   6. Longevity    — min(100, daysSinceFirst * 2)
 */
export function computeSignals(
  activity: ProviderActivity,
  service: ProviderService | null,
  medianInputPrice: bigint,
  currentBlock: number,
  blockTimeSeconds = 3,
): ReputationSignals {
  const activityScore = Math.min(100, activity.uniqueClients * 5);

  const settlementHealth = activity.txCount > 0
    ? Math.max(0, Math.round(100 - (activity.refundCount / activity.txCount) * 100))
    : 50;

  const teeCompliance = service?.verifiability ? 100 : 0;

  let pricing = 50;
  if (service && medianInputPrice > 0n) {
    const ratio = Number(service.inputPrice * 100n / medianInputPrice);
    pricing = Math.max(0, Math.min(100, 100 - Math.round(ratio / 2)));
  }

  const disputeRate = activity.txCount > 0
    ? Math.max(0, Math.round(100 - (activity.refundCount / activity.txCount) * 100))
    : 100;

  let longevity = 0;
  if (activity.firstSeenBlock) {
    const blocksDiff = currentBlock - activity.firstSeenBlock;
    const daysDiff = (blocksDiff * blockTimeSeconds) / 86400;
    longevity = Math.min(100, Math.round(daysDiff * 2));
  }

  const composite = Math.round(
    activityScore * WEIGHTS.activity +
    settlementHealth * WEIGHTS.settlementHealth +
    teeCompliance * WEIGHTS.teeCompliance +
    pricing * WEIGHTS.pricing +
    disputeRate * WEIGHTS.disputeRate +
    longevity * WEIGHTS.longevity,
  );

  return { activity: activityScore, settlementHealth, teeCompliance, pricing, disputeRate, longevity, composite };
}

/**
 * Compute median input price across providers with active services.
 */
export function computeMedianPrice(services: (ProviderService | null)[]): bigint {
  const prices = services
    .filter((s): s is ProviderService => s !== null && s.inputPrice > 0n)
    .map(s => s.inputPrice)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  if (prices.length === 0) return 1n;
  return prices[Math.floor(prices.length / 2)];
}
