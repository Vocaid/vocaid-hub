import { describe, expect, it } from "vitest";
import type { HiringSignal } from "../index.js";
import { VALID_DOMAINS, SIGNAL_WEIGHTS } from "../signals.js";

describe("Signal types", () => {
  it("has 7 valid domains", () => {
    expect(VALID_DOMAINS).toHaveLength(7);
    expect(VALID_DOMAINS).toContain("ai_engineer");
    expect(VALID_DOMAINS).toContain("backend");
  });

  it("weights sum to 1.0", () => {
    const sum = SIGNAL_WEIGHTS.demand + SIGNAL_WEIGHTS.supply + SIGNAL_WEIGHTS.quality;
    expect(sum).toBeCloseTo(1.0);
  });

  it("models a complete hiring signal", () => {
    const signal: HiringSignal = {
      domain: "ai_engineer",
      timeWindow: "30d",
      generatedAt: new Date().toISOString(),
      compositeScore: 0.72,
      interpretation: "BULLISH",
      demand: { openPositions: 45, newPostings: 12, trend: "increasing", trendPct: 26.7 },
      supply: { totalInterviews: 230, avgScore: 68.5, passRate: 0.69 },
    };
    expect(signal.interpretation).toBe("BULLISH");
    expect(signal.compositeScore).toBeGreaterThan(0.6);
  });
});
