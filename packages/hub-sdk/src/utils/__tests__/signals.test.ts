import { describe, expect, it } from "vitest";
import { computeHiringSignal } from "../signals.js";

describe("computeHiringSignal", () => {
  it("returns BULLISH when composite > 0.6", () => {
    const signal = computeHiringSignal({
      domain: "ai_engineer",
      timeWindow: "30d",
      jobs: Array.from({ length: 80 }, () => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: Array.from({ length: 400 }, () => ({
        score: 75,
        created_at: new Date().toISOString(),
      })),
    });

    expect(signal.interpretation).toBe("BULLISH");
    expect(signal.compositeScore).toBeGreaterThan(0.6);
    expect(signal.domain).toBe("ai_engineer");
  });

  it("returns BEARISH when composite < 0.3", () => {
    const signal = computeHiringSignal({
      domain: "design",
      timeWindow: "30d",
      jobs: [],
      interviews: [],
    });

    expect(signal.interpretation).toBe("BEARISH");
    expect(signal.compositeScore).toBeLessThan(0.3);
  });

  it("returns NEUTRAL in the middle range", () => {
    const signal = computeHiringSignal({
      domain: "backend",
      timeWindow: "30d",
      jobs: Array.from({ length: 40 }, () => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: Array.from({ length: 100 }, () => ({
        score: 50,
        created_at: new Date().toISOString(),
      })),
    });

    expect(signal.interpretation).toBe("NEUTRAL");
    expect(signal.compositeScore).toBeGreaterThanOrEqual(0.3);
    expect(signal.compositeScore).toBeLessThanOrEqual(0.6);
  });

  it("computes demand score capped at 1.0", () => {
    const signal = computeHiringSignal({
      domain: "frontend",
      timeWindow: "7d",
      jobs: Array.from({ length: 200 }, () => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: [],
    });

    expect(signal.demand.openPositions).toBe(200);
    // demand_score = min(1.0, 200/100) = 1.0
    // composite = 1.0*0.5 + 0*0.3 + 0*0.2 = 0.5
    expect(signal.compositeScore).toBeCloseTo(0.5, 1);
  });

  it("filters jobs by time window", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

    const signal = computeHiringSignal({
      domain: "devops",
      timeWindow: "30d",
      jobs: [
        { status: "active", created_at: new Date().toISOString() },
        { status: "active", created_at: oldDate.toISOString() },
      ],
      interviews: [],
    });

    expect(signal.demand.openPositions).toBe(2);
    expect(signal.demand.newPostings).toBe(1);
  });

  it("matches Python weights: demand=0.5, supply=0.3, quality=0.2", () => {
    const signal = computeHiringSignal({
      domain: "data_science",
      timeWindow: "30d",
      jobs: Array.from({ length: 50 }, () => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: Array.from({ length: 250 }, () => ({
        score: 60,
        created_at: new Date().toISOString(),
      })),
    });

    // demand: min(1, 50/100) = 0.5 -> 0.5 * 0.5 = 0.25
    // supply: min(1, 250/500) = 0.5 -> 0.5 * 0.3 = 0.15
    // quality: 60/100 = 0.6 -> 0.6 * 0.2 = 0.12
    // composite = 0.25 + 0.15 + 0.12 = 0.52
    expect(signal.compositeScore).toBeCloseTo(0.52, 1);
    expect(signal.interpretation).toBe("NEUTRAL");
  });
});
