import { describe, expect, it } from "vitest";
import { HubClient } from "../../client.js";
import { edgeTradingCycle } from "../edge.js";
import { shieldRiskCheck } from "../shield.js";
import { lensScout } from "../lens.js";
import type { HiringSignal } from "../../types/index.js";

const hub = new HubClient({
  vocaidApiKey: "voc_test_agent_key_123456789012",
  chains: {
    base: { rpcUrl: "https://base.test", privateKey: "0xabc" },
  },
});

function makeSignal(domain: string, composite: number): HiringSignal {
  return {
    domain: domain as any,
    timeWindow: "30d",
    generatedAt: new Date().toISOString(),
    compositeScore: composite,
    interpretation: composite > 0.6 ? "BULLISH" : composite < 0.3 ? "BEARISH" : "NEUTRAL",
    demand: { openPositions: 50, newPostings: 10, trend: "increasing", trendPct: 20 },
    supply: { totalInterviews: 200, avgScore: 70, passRate: 0.7 },
  };
}

describe("Edge agent", () => {
  it("proposes trades when signal diverges from market price", async () => {
    // Create a market priced at 0.5 (50/50)
    hub.market.createMarket({
      question: "Will backend demand rise?",
      description: "Test",
      resolutionDate: "2026-12-31T00:00:00Z",
    });

    // Signal says BULLISH (0.75) but market is at 0.5 → edge = 0.25
    const signals = [makeSignal("backend", 0.75)];
    const result = await edgeTradingCycle(hub, signals, { dryRun: true, minEdge: 0.1 });

    expect(result.proposals.length).toBeGreaterThan(0);
    expect(result.proposals[0].outcome).toBe("YES");
    expect(result.executed).toHaveLength(0); // dry run
  });

  it("skips markets with no matching signal", async () => {
    hub.market.createMarket({
      question: "Will devops demand rise?",
      description: "Test",
      resolutionDate: "2026-12-31T00:00:00Z",
    });

    const signals = [makeSignal("frontend", 0.5)]; // no devops signal
    const result = await edgeTradingCycle(hub, signals, { dryRun: true });

    const devopsSkipped = result.skipped.some(
      (s) => s.reason === "no matching signal",
    );
    expect(devopsSkipped).toBe(true);
  });
});

describe("Shield agent", () => {
  it("approves trades within risk limits", async () => {
    const proposals = [{
      marketId: "mkt_1",
      outcome: "YES" as const,
      amount: "10.00",
      reason: "test",
      signal: makeSignal("backend", 0.75),
      currentPrice: 0.5,
      expectedValue: 0.75,
    }];

    // Provide existing positions so $10 bet isn't 100% concentration
    const result = await shieldRiskCheck(hub, proposals, {
      currentPositions: [
        { marketId: "mkt_other1", amount: "20.00" },
        { marketId: "mkt_other2", amount: "20.00" },
      ],
    });
    expect(result.approved).toHaveLength(1);
    expect(result.vetoed).toHaveLength(0);
    expect(result.riskScore).toBeLessThan(1.0);
  });

  it("vetoes when daily loss limit exceeded", async () => {
    const proposals = [{
      marketId: "mkt_1",
      outcome: "YES" as const,
      amount: "10.00",
      reason: "test",
      signal: makeSignal("backend", 0.75),
      currentPrice: 0.5,
      expectedValue: 0.75,
    }];

    const result = await shieldRiskCheck(hub, proposals, {
      dailyPnl: "-25.00",
      limits: { maxDailyLoss: "20.00" },
    });

    expect(result.approved).toHaveLength(0);
    expect(result.vetoed).toHaveLength(1);
    expect(result.vetoed[0].reason).toContain("Daily loss limit");
  });

  it("vetoes when edge too small", async () => {
    const proposals = [{
      marketId: "mkt_1",
      outcome: "YES" as const,
      amount: "10.00",
      reason: "test",
      signal: makeSignal("backend", 0.52),
      currentPrice: 0.50,
      expectedValue: 0.52,
    }];

    const result = await shieldRiskCheck(hub, proposals, {
      currentPositions: [
        { marketId: "mkt_other", amount: "40.00" },
      ],
      limits: { minEdge: 0.05 },
    });

    expect(result.vetoed).toHaveLength(1);
    expect(result.vetoed[0].reason).toContain("Edge too small");
  });
});

describe("Lens agent", () => {
  it("detects trend changes and proposes markets", async () => {
    const previous = [makeSignal("ai_engineer", 0.4)];
    const current = [makeSignal("ai_engineer", 0.7)]; // +0.3 shift

    const result = await lensScout(hub, current, {
      previousSignals: previous,
      trendThreshold: 0.15,
    });

    expect(result.trendChanges).toHaveLength(1);
    expect(result.trendChanges[0].domain).toBe("ai_engineer");
    expect(result.trendChanges[0].shift).toBeCloseTo(0.3);
    expect(result.marketProposals.length).toBeGreaterThan(0);
    expect(result.marketProposals[0].question).toContain("ai engineer");
  });

  it("finds arbitrage opportunities", async () => {
    // Create a mispriced market
    hub.market.createMarket({
      question: "Will data science demand rise?",
      description: "Test",
      resolutionDate: "2026-12-31T00:00:00Z",
    }); // priced at 0.5

    const signals = [makeSignal("data_science", 0.8)]; // expects 0.8 vs market 0.5
    const result = await lensScout(hub, signals, { arbitrageMinEdge: 0.1 });

    expect(result.arbitrageOpportunities.length).toBeGreaterThan(0);
    expect(result.arbitrageOpportunities[0].direction).toBe("YES");
  });

  it("returns empty when no significant changes", async () => {
    const previous = [makeSignal("frontend", 0.5)];
    const current = [makeSignal("frontend", 0.52)]; // tiny shift

    const result = await lensScout(hub, current, {
      previousSignals: previous,
      trendThreshold: 0.15,
    });

    expect(result.trendChanges).toHaveLength(0);
    expect(result.marketProposals).toHaveLength(0);
  });
});
