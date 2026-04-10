import { describe, expect, it } from "vitest";
import { VocaidModule } from "../vocaid.js";

const config = {
  apiKey: "voc_test_key_12345678901234567890",
  hubUrl: "https://vocaid-hub.vercel.app",
  chains: {},
};

describe("VocaidModule", () => {
  it("exposes a VocaidClient from @vocaid/connect", () => {
    const vocaid = new VocaidModule(config);
    expect(vocaid.client).toBeDefined();
  });

  it("computes hiring signals from raw data", () => {
    const vocaid = new VocaidModule(config);
    const signal = vocaid.computeSignal({
      domain: "ai_engineer",
      timeWindow: "30d",
      jobs: Array.from({ length: 70 }, () => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: Array.from({ length: 300 }, () => ({
        score: 72,
        created_at: new Date().toISOString(),
      })),
    });

    expect(signal.domain).toBe("ai_engineer");
    expect(signal.interpretation).toBeDefined();
    expect(["BULLISH", "NEUTRAL", "BEARISH"]).toContain(signal.interpretation);
  });
});
