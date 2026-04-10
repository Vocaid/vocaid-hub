import { describe, expect, it } from "vitest";
import { MarketModule } from "../market.js";
import { HubPaymentError } from "../../errors.js";

const config = {
  apiKey: "voc_test",
  hubUrl: "https://hub.test",
  chains: { base: { rpcUrl: "https://base.test", privateKey: "0xabc" } },
};

describe("MarketModule", () => {
  describe("createMarket", () => {
    it("creates a market with default values", () => {
      const market = new MarketModule(config);
      const m = market.createMarket({
        question: "Will Rust demand rise 20% in Q3?",
        description: "Based on Vocaid hiring signals",
        resolutionDate: "2026-09-30T00:00:00Z",
      });

      expect(m.id).toMatch(/^mkt_/);
      expect(m.question).toBe("Will Rust demand rise 20% in Q3?");
      expect(m.status).toBe("open");
      expect(m.yesPrice).toBe(0.5);
      expect(m.noPrice).toBe(0.5);
      expect(m.takerFeeBps).toBe(200);
    });

    it("allows custom taker fee", () => {
      const market = new MarketModule(config);
      const m = market.createMarket({
        question: "Test?",
        description: "Test",
        resolutionDate: "2026-12-31T00:00:00Z",
        takerFeeBps: 315,
      });
      expect(m.takerFeeBps).toBe(315);
    });
  });

  describe("listMarkets", () => {
    it("lists all markets", () => {
      const market = new MarketModule(config);
      market.createMarket({ question: "Q1?", description: "D1", resolutionDate: "2026-12-01T00:00:00Z" });
      market.createMarket({ question: "Q2?", description: "D2", resolutionDate: "2026-12-01T00:00:00Z" });
      expect(market.listMarkets()).toHaveLength(2);
    });

    it("filters by status", () => {
      const market = new MarketModule(config);
      const m = market.createMarket({ question: "Q?", description: "D", resolutionDate: "2026-12-01T00:00:00Z" });
      market.resolveMarket({ marketId: m.id, outcome: "YES", evidence: "data", resolvedBy: "seer", resolvedAt: new Date().toISOString() });

      expect(market.listMarkets({ status: "open" })).toHaveLength(0);
      expect(market.listMarkets({ status: "resolved_yes" })).toHaveLength(1);
    });
  });

  describe("placeBet", () => {
    it("places a YES bet and adjusts prices", () => {
      const market = new MarketModule(config);
      const m = market.createMarket({
        question: "Test?",
        description: "Test",
        resolutionDate: "2026-12-01T00:00:00Z",
        initialLiquidity: "100",
      });

      const receipt = market.placeBet({
        marketId: m.id,
        outcome: "YES",
        amount: "10.00",
      });

      expect(receipt.outcome).toBe("YES");
      expect(parseFloat(receipt.shares)).toBeGreaterThan(0);
      expect(parseFloat(receipt.fee)).toBeGreaterThan(0);

      // Price should have shifted up for YES
      const updated = market.getMarket(m.id)!;
      expect(updated.yesPrice).toBeGreaterThan(0.5);
      expect(updated.noPrice).toBeLessThan(0.5);
    });

    it("throws for non-existent market", () => {
      const market = new MarketModule(config);
      expect(() =>
        market.placeBet({ marketId: "mkt_fake", outcome: "YES", amount: "10" }),
      ).toThrow(HubPaymentError);
    });

    it("throws for resolved market", () => {
      const market = new MarketModule(config);
      const m = market.createMarket({ question: "Q?", description: "D", resolutionDate: "2026-12-01T00:00:00Z" });
      market.resolveMarket({ marketId: m.id, outcome: "NO", evidence: "data", resolvedBy: "seer", resolvedAt: new Date().toISOString() });

      expect(() =>
        market.placeBet({ marketId: m.id, outcome: "YES", amount: "10" }),
      ).toThrow("not open");
    });
  });

  describe("resolveMarket", () => {
    it("resolves YES and sets prices to 1/0", () => {
      const market = new MarketModule(config);
      const m = market.createMarket({ question: "Q?", description: "D", resolutionDate: "2026-12-01T00:00:00Z" });

      const resolved = market.resolveMarket({
        marketId: m.id,
        outcome: "YES",
        evidence: "Vocaid data confirms",
        resolvedBy: "seer",
        resolvedAt: new Date().toISOString(),
      });

      expect(resolved.status).toBe("resolved_yes");
      expect(resolved.yesPrice).toBe(1.0);
      expect(resolved.noPrice).toBe(0.0);
    });
  });

  describe("estimateFee", () => {
    it("returns probability-weighted fee", () => {
      const market = new MarketModule(config);
      const m = market.createMarket({ question: "Q?", description: "D", resolutionDate: "2026-12-01T00:00:00Z" });

      // At 50/50 odds, fee is highest (full weight)
      const fee = market.estimateFee(m.id, "YES", "100");
      expect(parseFloat(fee)).toBeGreaterThan(0);
      expect(parseFloat(fee)).toBeLessThanOrEqual(2); // max 2% of 100
    });
  });
});
