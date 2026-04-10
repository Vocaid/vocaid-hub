import { describe, expect, it, vi } from "vitest";
import { PaymentModule } from "../payment.js";
import { HubChainError, HubPaymentError } from "../../errors.js";

const config = {
  apiKey: "voc_test",
  hubUrl: "https://vocaid-hub.vercel.app",
  chains: {
    hedera: { operatorId: "0.0.12345", operatorKey: "302e..." },
    base: { rpcUrl: "https://base-sepolia.example.com", privateKey: "0xabc" },
  },
};

describe("PaymentModule", () => {
  describe("getSupportedChains", () => {
    it("returns configured chains", () => {
      const payment = new PaymentModule(config);
      const chains = payment.getSupportedChains();
      expect(chains).toContain("hedera");
      expect(chains).toContain("base");
      expect(chains).toHaveLength(2);
    });
  });

  describe("getFacilitatorUrl", () => {
    it("returns Blocky402 for hedera", () => {
      const payment = new PaymentModule(config);
      expect(payment.getFacilitatorUrl("hedera")).toBe("https://api.testnet.blocky402.com");
    });

    it("returns undefined for unconfigured chain", () => {
      const payment = new PaymentModule(config);
      expect(payment.getFacilitatorUrl("polygon")).toBeUndefined();
    });
  });

  describe("getUsdcToken", () => {
    it("returns USDC token for hedera", () => {
      const payment = new PaymentModule(config);
      expect(payment.getUsdcToken("hedera")).toBe("0.0.456858");
    });

    it("returns USDC token for base", () => {
      const payment = new PaymentModule(config);
      expect(payment.getUsdcToken("base")).toBeDefined();
    });
  });

  describe("createPaymentRequest", () => {
    it("creates request for specified chain", () => {
      const payment = new PaymentModule(config);
      const req = payment.createPaymentRequest({
        amount: "0.05",
        chain: "hedera",
        recipient: "0.0.98765",
      });
      expect(req.chain).toBe("hedera");
      expect(req.amount).toBe("0.05");
      expect(req.currency).toBe("USDC");
    });

    it("auto-selects cheapest chain when none specified", () => {
      const payment = new PaymentModule(config);
      const req = payment.createPaymentRequest({
        amount: "1.00",
        recipient: "0.0.98765",
      });
      // hedera is cheapest in priority list
      expect(req.chain).toBe("hedera");
    });

    it("throws for unconfigured chain", () => {
      const payment = new PaymentModule(config);
      expect(() =>
        payment.createPaymentRequest({
          amount: "1.00",
          chain: "polygon",
          recipient: "0x123",
        }),
      ).toThrow(HubChainError);
    });
  });

  describe("payment header encoding", () => {
    it("encodes and decodes symmetrically", () => {
      const payment = new PaymentModule(config);
      const header = {
        version: "x402-v2" as const,
        chain: "hedera" as const,
        transactionId: "0.0.12345@1234567890.000",
        amount: "0.05",
        currency: "USDC",
      };
      const encoded = payment.encodePaymentHeader(header);
      const decoded = payment.decodePaymentHeader(encoded);
      expect(decoded).toEqual(header);
    });

    it("throws on invalid encoded header", () => {
      const payment = new PaymentModule(config);
      expect(() => payment.decodePaymentHeader("not-valid-base64!!!")).toThrow(HubPaymentError);
    });
  });

  describe("estimateSettlementFee", () => {
    it("calculates 0.3% fee by default", () => {
      const payment = new PaymentModule(config);
      expect(payment.estimateSettlementFee("100.00")).toBe("0.300000");
    });

    it("accepts custom fee rate", () => {
      const payment = new PaymentModule(config);
      expect(payment.estimateSettlementFee("100.00", 0.005)).toBe("0.500000");
    });
  });

  describe("verifyPayment", () => {
    it("calls facilitator verify endpoint", async () => {
      const payment = new PaymentModule(config);

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ verified: true }),
      }));

      const result = await payment.verifyPayment({
        version: "x402-v2",
        chain: "hedera",
        transactionId: "0.0.12345@123",
        amount: "0.05",
        currency: "USDC",
      });

      expect(result.verified).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.testnet.blocky402.com/verify",
        expect.any(Object),
      );

      vi.restoreAllMocks();
    });

    it("returns error for unknown chain", async () => {
      const payment = new PaymentModule(config);
      const result = await payment.verifyPayment({
        version: "x402-v2",
        chain: "polygon",
        transactionId: "0x123",
        amount: "1.00",
        currency: "USDC",
      });
      expect(result.verified).toBe(false);
      expect(result.error).toContain("No facilitator");
    });
  });
});
