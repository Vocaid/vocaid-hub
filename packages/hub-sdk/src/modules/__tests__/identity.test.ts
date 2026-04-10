import { describe, expect, it } from "vitest";
import { IdentityModule } from "../identity.js";

const config = {
  apiKey: "voc_test",
  hubUrl: "https://vocaid-hub.vercel.app",
  chains: {
    base: { rpcUrl: "https://base-sepolia.example.com", privateKey: "0xabc123" },
  },
};

describe("IdentityModule", () => {
  describe("validateRegistration", () => {
    it("validates a well-formed registration request", () => {
      const identity = new IdentityModule(config);
      const result = identity.validateRegistration({
        name: "my-trading-bot",
        description: "Trades hiring signals",
        capabilities: ["hiring-signals", "prediction-markets"],
        chain: "base",
      });
      expect(result.valid).toBe(true);
    });

    it("rejects empty name", () => {
      const identity = new IdentityModule(config);
      const result = identity.validateRegistration({
        name: "",
        description: "Test",
        capabilities: ["test"],
        chain: "base",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name is required");
    });

    it("rejects unconfigured chain", () => {
      const identity = new IdentityModule(config);
      const result = identity.validateRegistration({
        name: "test",
        description: "Test",
        capabilities: ["test"],
        chain: "arbitrum",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("chain 'arbitrum' is not configured");
    });

    it("rejects empty capabilities", () => {
      const identity = new IdentityModule(config);
      const result = identity.validateRegistration({
        name: "test",
        description: "Test",
        capabilities: [],
        chain: "base",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("at least one capability is required");
    });
  });

  describe("buildRegistrationMetadata", () => {
    it("produces ERC-8004 compatible metadata", () => {
      const identity = new IdentityModule(config);
      const meta = identity.buildRegistrationMetadata({
        name: "seer-agent",
        description: "Hiring signal oracle",
        capabilities: ["hiring-signals"],
        owner: "0x1234567890123456789012345678901234567890",
      });

      expect(meta.name).toBe("seer-agent");
      expect(meta.capabilities).toEqual(["hiring-signals"]);
      expect(meta.owner).toBe("0x1234567890123456789012345678901234567890");
      expect(meta.registeredAt).toBeDefined();
      expect(meta.version).toBe("0.1.0");
    });
  });
});
