import { describe, expect, it } from "vitest";
import {
  HubClient,
  HubConfigError,
  computeHiringSignal,
  VALID_DOMAINS,
  SIGNAL_WEIGHTS,
} from "../index.js";

describe("Hub SDK integration", () => {
  const hub = new HubClient({
    vocaidApiKey: "voc_integration_test_key_1234567890",
    chains: {
      base: { rpcUrl: "https://base-sepolia.example.com", privateKey: "0xabc" },
    },
  });

  it("provides all three modules", () => {
    expect(hub.a2a).toBeDefined();
    expect(hub.identity).toBeDefined();
    expect(hub.vocaid).toBeDefined();
  });

  it("a2a: creates agent card and discovers hub card", () => {
    const myCard = hub.a2a.createAgentCard({
      name: "my-bot",
      description: "Test bot",
      url: "https://example.com",
      skills: [{ id: "test", name: "Test", description: "Testing" }],
    });
    expect(myCard.name).toBe("my-bot");

    const hubCard = hub.a2a.getHubAgentCard();
    expect(hubCard.skills.map((s) => s.id)).toContain("hiring-signals");
  });

  it("identity: validates registration against configured chains", () => {
    const valid = hub.identity.validateRegistration({
      name: "my-bot",
      description: "Test",
      capabilities: ["hiring-signals"],
      chain: "base",
    });
    expect(valid.valid).toBe(true);

    const invalid = hub.identity.validateRegistration({
      name: "my-bot",
      description: "Test",
      capabilities: ["hiring-signals"],
      chain: "arbitrum",
    });
    expect(invalid.valid).toBe(false);
  });

  it("vocaid: computes hiring signal with correct interpretation", () => {
    const signal = hub.vocaid.computeSignal({
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
  });

  it("standalone computeHiringSignal works without HubClient", () => {
    const signal = computeHiringSignal({
      domain: "backend",
      timeWindow: "7d",
      jobs: [],
      interviews: [],
    });
    expect(signal.interpretation).toBe("BEARISH");
  });

  it("exports constants", () => {
    expect(VALID_DOMAINS).toContain("ai_engineer");
    expect(SIGNAL_WEIGHTS.demand + SIGNAL_WEIGHTS.supply + SIGNAL_WEIGHTS.quality).toBeCloseTo(1.0);
  });

  it("rejects invalid config", () => {
    expect(() => new HubClient({ vocaidApiKey: "", chains: {} })).toThrow(HubConfigError);
    expect(() => new HubClient({ vocaidApiKey: "sk_bad", chains: {} })).toThrow(HubConfigError);
  });
});
