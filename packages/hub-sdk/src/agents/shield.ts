/**
 * Shield — Risk Manager
 *
 * Validates Edge's trade proposals against risk limits.
 * Approves or vetoes before execution.
 * Frequency: every 5 minutes (runs after Edge).
 */
import type { HubClient } from "../client.js";
import type { TradeProposal } from "./edge.js";

export interface RiskLimits {
  maxPositionPct: number;       // Max % of portfolio in one market (default 0.2)
  maxTotalExposure: string;     // Max total USDC across all positions (default "100.00")
  maxCorrelation: number;       // Max correlation between positions (default 0.7)
  minEdge: number;              // Minimum edge to approve (default 0.05)
  maxDailyLoss: string;         // Max daily loss before halt (default "20.00")
}

export interface RiskCheckResult {
  approved: TradeProposal[];
  vetoed: Array<{ proposal: TradeProposal; reason: string }>;
  currentExposure: string;
  riskScore: number;            // 0-1, higher = riskier
  timestamp: string;
}

const DEFAULT_LIMITS: RiskLimits = {
  maxPositionPct: 0.2,
  maxTotalExposure: "100.00",
  maxCorrelation: 0.7,
  minEdge: 0.05,
  maxDailyLoss: "20.00",
};

export async function shieldRiskCheck(
  hub: HubClient,
  proposals: TradeProposal[],
  options?: {
    limits?: Partial<RiskLimits>;
    currentPositions?: Array<{ marketId: string; amount: string }>;
    dailyPnl?: string;
    auditTopicId?: string;
  },
): Promise<RiskCheckResult> {
  const limits = { ...DEFAULT_LIMITS, ...options?.limits };
  const currentPositions = options?.currentPositions ?? [];
  const dailyPnl = parseFloat(options?.dailyPnl ?? "0");

  const approved: TradeProposal[] = [];
  const vetoed: Array<{ proposal: TradeProposal; reason: string }> = [];

  // Calculate current exposure
  const currentExposure = currentPositions.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0,
  );

  // Check daily loss limit
  if (dailyPnl < -parseFloat(limits.maxDailyLoss)) {
    for (const proposal of proposals) {
      vetoed.push({ proposal, reason: `Daily loss limit hit: ${dailyPnl.toFixed(2)} USDC` });
    }
    return {
      approved: [],
      vetoed,
      currentExposure: currentExposure.toFixed(2),
      riskScore: 1.0,
      timestamp: new Date().toISOString(),
    };
  }

  for (const proposal of proposals) {
    const betAmount = parseFloat(proposal.amount);

    // Check total exposure limit
    if (currentExposure + betAmount > parseFloat(limits.maxTotalExposure)) {
      vetoed.push({
        proposal,
        reason: `Would exceed max exposure: ${(currentExposure + betAmount).toFixed(2)} > ${limits.maxTotalExposure}`,
      });
      continue;
    }

    // Check position concentration
    const existingPosition = currentPositions.find((p) => p.marketId === proposal.marketId);
    const positionSize = (existingPosition ? parseFloat(existingPosition.amount) : 0) + betAmount;
    const totalAfterBet = currentExposure + betAmount;
    if (totalAfterBet > 0 && positionSize / totalAfterBet > limits.maxPositionPct) {
      vetoed.push({
        proposal,
        reason: `Position concentration too high: ${((positionSize / totalAfterBet) * 100).toFixed(1)}% > ${(limits.maxPositionPct * 100).toFixed(1)}%`,
      });
      continue;
    }

    // Check minimum edge
    const edge = Math.abs(proposal.expectedValue - proposal.currentPrice);
    if (edge < limits.minEdge) {
      vetoed.push({
        proposal,
        reason: `Edge too small: ${(edge * 100).toFixed(1)}% < ${(limits.minEdge * 100).toFixed(1)}%`,
      });
      continue;
    }

    approved.push(proposal);
  }

  // Calculate risk score
  const exposureRatio = currentExposure / parseFloat(limits.maxTotalExposure);
  const lossRatio = Math.abs(dailyPnl) / parseFloat(limits.maxDailyLoss);
  const riskScore = Math.min(1.0, (exposureRatio + lossRatio) / 2);

  // Audit log
  if (options?.auditTopicId && hub.hedera.isConfigured) {
    await hub.hedera.logAudit(options.auditTopicId, {
      agentId: "shield",
      action: "risk_check",
      details: {
        approvedCount: approved.length,
        vetoedCount: vetoed.length,
        riskScore,
        currentExposure: currentExposure.toFixed(2),
      },
    });
  }

  return {
    approved,
    vetoed,
    currentExposure: currentExposure.toFixed(2),
    riskScore,
    timestamp: new Date().toISOString(),
  };
}
