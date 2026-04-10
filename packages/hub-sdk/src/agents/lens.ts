/**
 * Lens — Market Intelligence
 *
 * Monitors hiring signal trends, proposes new prediction markets
 * when significant changes detected, scouts arbitrage opportunities.
 * Frequency: every 30 minutes.
 */
import type { HubClient } from "../client.js";
import type { HiringSignal } from "../types/index.js";

export interface MarketProposal {
  question: string;
  description: string;
  resolutionDate: string;
  confidence: number;       // 0-1 how confident Lens is this is a good market
  basedOn: HiringSignal;
}

export interface ArbitrageOpportunity {
  marketId: string;
  yesPrice: number;
  expectedPrice: number;
  edge: number;
  direction: "YES" | "NO";
}

export interface LensScoutResult {
  marketProposals: MarketProposal[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  trendChanges: Array<{
    domain: string;
    previousInterpretation: string;
    currentInterpretation: string;
    shift: number;
  }>;
  timestamp: string;
}

export async function lensScout(
  hub: HubClient,
  currentSignals: HiringSignal[],
  options?: {
    previousSignals?: HiringSignal[];
    trendThreshold?: number;   // Minimum composite shift to flag (default 0.15)
    arbitrageMinEdge?: number; // Minimum edge for arbitrage (default 0.1)
    auditTopicId?: string;
  },
): Promise<LensScoutResult> {
  const trendThreshold = options?.trendThreshold ?? 0.15;
  const arbitrageMinEdge = options?.arbitrageMinEdge ?? 0.1;
  const previousSignals = options?.previousSignals ?? [];

  const marketProposals: MarketProposal[] = [];
  const trendChanges: LensScoutResult["trendChanges"] = [];

  // Detect trend changes
  for (const current of currentSignals) {
    const previous = previousSignals.find((p) => p.domain === current.domain);
    if (!previous) continue;

    const shift = current.compositeScore - previous.compositeScore;
    if (Math.abs(shift) >= trendThreshold) {
      trendChanges.push({
        domain: current.domain,
        previousInterpretation: previous.interpretation,
        currentInterpretation: current.interpretation,
        shift,
      });

      // Propose a market for significant trend changes
      const direction = shift > 0 ? "rise" : "fall";
      const pctChange = Math.round(Math.abs(shift) * 100);
      const resolutionDate = new Date();
      resolutionDate.setMonth(resolutionDate.getMonth() + 3);

      marketProposals.push({
        question: `Will ${current.domain.replace("_", " ")} demand ${direction} ${pctChange}%+ in the next quarter?`,
        description: `Based on a ${(shift * 100).toFixed(1)}% composite score shift from ${previous.interpretation} to ${current.interpretation}.`,
        resolutionDate: resolutionDate.toISOString(),
        confidence: Math.min(1.0, Math.abs(shift) / 0.3),
        basedOn: current,
      });
    }
  }

  // Scout arbitrage on existing markets
  const openMarkets = hub.market.listMarkets({ status: "open" });
  const arbitrageOpportunities: ArbitrageOpportunity[] = [];

  for (const market of openMarkets) {
    const matchingSignal = currentSignals.find((s) =>
      market.question.toLowerCase().includes(s.domain.replace("_", " ")),
    );
    if (!matchingSignal) continue;

    const expectedPrice = Math.max(0.05, Math.min(0.95, matchingSignal.compositeScore));
    const yesEdge = expectedPrice - market.yesPrice;

    if (Math.abs(yesEdge) >= arbitrageMinEdge) {
      arbitrageOpportunities.push({
        marketId: market.id,
        yesPrice: market.yesPrice,
        expectedPrice,
        edge: yesEdge,
        direction: yesEdge > 0 ? "YES" : "NO",
      });
    }
  }

  // Audit log
  if (options?.auditTopicId && hub.hedera.isConfigured) {
    await hub.hedera.logAudit(options.auditTopicId, {
      agentId: "lens",
      action: "scout_cycle",
      details: {
        trendChangesCount: trendChanges.length,
        marketProposalsCount: marketProposals.length,
        arbitrageCount: arbitrageOpportunities.length,
      },
    });
  }

  return {
    marketProposals,
    arbitrageOpportunities,
    trendChanges,
    timestamp: new Date().toISOString(),
  };
}
