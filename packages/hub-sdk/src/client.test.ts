import { describe, expect, it } from "vitest";
import { HubClient } from "./client.js";
import { HubConfigError } from "./errors.js";

describe("HubClient", () => {
  const validOptions = {
    vocaidApiKey: "voc_test_key_12345678901234567890",
    chains: {
      base: { rpcUrl: "https://base-sepolia.example.com", privateKey: "0xabc" } as const,
    },
  };

  it("creates client with valid options", () => {
    const hub = new HubClient(validOptions);
    expect(hub).toBeDefined();
    expect(hub.a2a).toBeDefined();
    expect(hub.hedera).toBeDefined();
    expect(hub.identity).toBeDefined();
    expect(hub.payment).toBeDefined();
    expect(hub.vocaid).toBeDefined();
  });

  it("throws HubConfigError when vocaidApiKey is missing", () => {
    expect(() => new HubClient({ vocaidApiKey: "", chains: {} })).toThrow(HubConfigError);
  });

  it("throws HubConfigError when vocaidApiKey has bad prefix", () => {
    expect(() => new HubClient({ vocaidApiKey: "sk_bad", chains: {} })).toThrow(HubConfigError);
  });

  it("uses default hubUrl when not provided", () => {
    const hub = new HubClient(validOptions);
    expect(hub.hubUrl).toBe("https://vocaid-hub.vercel.app");
  });

  it("accepts custom hubUrl", () => {
    const hub = new HubClient({ ...validOptions, hubUrl: "https://custom.example.com" });
    expect(hub.hubUrl).toBe("https://custom.example.com");
  });
});
