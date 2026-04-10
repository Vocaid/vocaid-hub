import { describe, expect, it } from "vitest";
import type { HubClientOptions, SupportedChain } from "../index.js";

describe("HubClientOptions type", () => {
  it("accepts valid options", () => {
    const options: HubClientOptions = {
      vocaidApiKey: "voc_test123",
      chains: {
        hedera: { operatorId: "0.0.123", operatorKey: "302e..." },
      },
    };
    expect(options.vocaidApiKey).toBe("voc_test123");
    expect(options.chains.hedera).toBeDefined();
  });

  it("supports multiple chains", () => {
    const options: HubClientOptions = {
      vocaidApiKey: "voc_test123",
      chains: {
        base: { rpcUrl: "https://base-sepolia.example.com", privateKey: "0x..." },
        arbitrum: { rpcUrl: "https://arb-sepolia.example.com", privateKey: "0x..." },
      },
    };
    expect(Object.keys(options.chains)).toHaveLength(2);
  });

  it("accepts optional hubUrl override", () => {
    const options: HubClientOptions = {
      vocaidApiKey: "voc_test123",
      chains: {},
      hubUrl: "https://custom-hub.example.com",
    };
    expect(options.hubUrl).toBe("https://custom-hub.example.com");
  });
});

describe("SupportedChain type", () => {
  it("includes all expected chains", () => {
    const chains: SupportedChain[] = [
      "hedera", "base", "arbitrum", "optimism", "ethereum", "polygon",
    ];
    expect(chains).toHaveLength(6);
  });
});
