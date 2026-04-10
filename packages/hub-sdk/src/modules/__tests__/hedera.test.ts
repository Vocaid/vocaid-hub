import { describe, expect, it, vi } from "vitest";
import { HederaModule } from "../hedera.js";
import { HubChainError } from "../../errors.js";

describe("HederaModule", () => {
  const configWithHedera = {
    apiKey: "voc_test",
    hubUrl: "https://vocaid-hub.vercel.app",
    chains: {
      hedera: {
        operatorId: "0.0.12345",
        operatorKey: "302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137",
        network: "testnet" as const,
      },
    },
  };

  const configWithoutHedera = {
    apiKey: "voc_test",
    hubUrl: "https://vocaid-hub.vercel.app",
    chains: {
      base: { rpcUrl: "https://base-sepolia.example.com", privateKey: "0xabc" },
    },
  };

  describe("isConfigured", () => {
    it("returns true when hedera chain is configured", () => {
      const hedera = new HederaModule(configWithHedera);
      expect(hedera.isConfigured).toBe(true);
    });

    it("returns false when hedera chain is not configured", () => {
      const hedera = new HederaModule(configWithoutHedera);
      expect(hedera.isConfigured).toBe(false);
    });
  });

  describe("createAuditTopic", () => {
    it("throws HubChainError when hedera is not configured", async () => {
      const hedera = new HederaModule(configWithoutHedera);
      await expect(hedera.createAuditTopic()).rejects.toThrow(HubChainError);
      await expect(hedera.createAuditTopic()).rejects.toThrow("Hedera chain not configured");
    });
  });

  describe("logAudit", () => {
    it("throws HubChainError when hedera is not configured", async () => {
      const hedera = new HederaModule(configWithoutHedera);
      await expect(
        hedera.logAudit("0.0.999", { agentId: "test", action: "test" }),
      ).rejects.toThrow(HubChainError);
    });
  });

  describe("queryAudit", () => {
    it("fetches messages from Mirror Node", async () => {
      const hedera = new HederaModule(configWithHedera);

      const mockMessages = {
        messages: [
          {
            message: Buffer.from(JSON.stringify({ agentId: "seer", action: "signal_read" })).toString("base64"),
            sequence_number: 1,
            consensus_timestamp: "1234567890.000000000",
          },
        ],
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      }));

      const results = await hedera.queryAudit("0.0.999");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        sequenceNumber: 1,
        agentId: "seer",
        action: "signal_read",
      });

      vi.restoreAllMocks();
    });

    it("throws on Mirror Node failure", async () => {
      const hedera = new HederaModule(configWithHedera);

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }));

      await expect(hedera.queryAudit("0.0.999")).rejects.toThrow("Mirror Node query failed");

      vi.restoreAllMocks();
    });
  });

  describe("close", () => {
    it("can be called safely even without init", () => {
      const hedera = new HederaModule(configWithHedera);
      expect(() => hedera.close()).not.toThrow();
    });
  });
});
