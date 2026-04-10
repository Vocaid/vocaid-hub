/**
 * Edge — Quantitative Trader
 *
 * Reads Seer signals, compares to prediction market prices,
 * and proposes trades when mispricing detected.
 * Frequency: every 5 minutes.
 */
import type { HubClient } from "../client.js";
import type { HiringSignal } from "../types/index.js";
import type { BetReceipt } from "../modules/market.js";

export interface TradeProposal {
  marketId: string;
  outcome: "YES" | "NO";
  amount: string;
  reason: string;
  signal: HiringSignal;
  currentPrice: number;
  expectedValue: number;
}

export interface EdgeTradingResult {
  proposals: TradeProposal[];
  executed: BetReceipt[];
  skipped: Array<{ marketId: string; reason: string }>;
  timestamp: string;
}

function signalToExpectedPrice(signal: HiringSignal): number {
  // Map composite score to expected YES probability
  // BULLISH (>0.6) → expect YES price 0.7-0.9
  // NEUTRAL (0.3-0.6) → expect YES price 0.4-0.6
  // BEARISH (<0.3) → expect YES price 0.1-0.3
  return Math.max(0.05, Math.min(0.95, signal.compositeScore));
}

export async function edgeTradingCycle(
  hub: HubClient,
  signals: HiringSignal[],
  options?: {
    minEdge?: number;      // Minimum edge to trade (default 0.1 = 10%)
    maxBetSize?: string;   // Max USDC per bet (default "10.00")
    dryRun?: boolean;      // If true, only propose, don't execute
    auditTopicId?: string;
  },
): Promise<EdgeTradingResult> {
  const minEdge = options?.minEdge ?? 0.1;
  const maxBetSize = options?.maxBetSize ?? "10.00";
  const dryRun = options?.dryRun ?? true;
  const proposals: TradeProposal[] = [];
  const executed: BetReceipt[] = [];
  const skipped: Array<{ marketId: string; reason: string }> = [];

  const openMarkets = hub.market.listMarkets({ status: "open" });

  for (const market of openMarkets) {
    // Find matching signal for this market
    const matchingSignal = signals.find((s) =>
      market.question.toLowerCase().includes(s.domain.replace("_", " ")),
    );

    if (!matchingSignal) {
      skipped.push({ marketId: market.id, reason: "no matching signal" });
      continue;
    }

    const expectedPrice = signalToExpectedPrice(matchingSignal);
    const yesEdge = expectedPrice - market.yesPrice;
    const noEdge = (1 - expectedPrice) - market.noPrice;

    if (Math.abs(yesEdge) >= minEdge) {
      const outcome: "YES" | "NO" = yesEdge > 0 ? "YES" : "NO";
      const edge = outcome === "YES" ? yesEdge : noEdge;

      const proposal: TradeProposal = {
        marketId: market.id,
        outcome,
        amount: maxBetSize,
        reason: `${matchingSignal.interpretation} signal (${matchingSignal.compositeScore}) vs market price ${market.yesPrice.toFixed(2)}. Edge: ${(edge * 100).toFixed(1)}%`,
        signal: matchingSignal,
        currentPrice: outcome === "YES" ? market.yesPrice : market.noPrice,
        expectedValue: expectedPrice,
      };

      proposals.push(proposal);

      if (!dryRun) {
        const receipt = hub.market.placeBet({
          marketId: market.id,
          outcome,
          amount: maxBetSize,
        });
        executed.push(receipt);
      }
    } else {
      skipped.push({
        marketId: market.id,
        reason: `edge too small: ${(Math.max(Math.abs(yesEdge), Math.abs(noEdge)) * 100).toFixed(1)}% < ${(minEdge * 100).toFixed(1)}%`,
      });
    }
  }

  // Audit log
  if (options?.auditTopicId && hub.hedera.isConfigured) {
    await hub.hedera.logAudit(options.auditTopicId, {
      agentId: "edge",
      action: "trading_cycle",
      details: {
        proposalsCount: proposals.length,
        executedCount: executed.length,
        skippedCount: skipped.length,
        dryRun,
      },
    });
  }

  return {
    proposals,
    executed,
    skipped,
    timestamp: new Date().toISOString(),
  };
}
