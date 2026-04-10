import { describe, expect, it, vi } from "vitest";
import { InferenceModule } from "../inference.js";
import { HubConnectionError } from "../../errors.js";

const config = { apiKey: "voc_test", hubUrl: "https://hub.test", chains: {} };

describe("InferenceModule", () => {
  describe("provider management", () => {
    it("starts with no providers", () => {
      const inference = new InferenceModule(config);
      expect(inference.getProviders()).toHaveLength(0);
    });

    it("adds and lists providers", () => {
      const inference = new InferenceModule(config);
      inference.addProvider({
        name: "together",
        baseUrl: "https://api.together.xyz",
        apiKey: "tog_xxx",
        type: "together",
      });
      expect(inference.getProviders()).toHaveLength(1);
      expect(inference.getProviders()[0].name).toBe("together");
    });
  });

  describe("chat", () => {
    it("throws when no providers configured", async () => {
      const inference = new InferenceModule(config);
      await expect(
        inference.chat([{ role: "user", content: "hello" }]),
      ).rejects.toThrow(HubConnectionError);
    });

    it("sends OpenAI-compatible request and returns response", async () => {
      const inference = new InferenceModule(config);
      inference.addProvider({
        name: "test-provider",
        baseUrl: "https://api.test.com",
        apiKey: "test_key",
        type: "together",
      });

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: "Hello back!" } }],
          model: "llama-3-70b",
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      }));

      const result = await inference.chat([{ role: "user", content: "hello" }]);
      expect(result.content).toBe("Hello back!");
      expect(result.model).toBe("llama-3-70b");
      expect(result.provider).toBe("test-provider");
      expect(result.usage.totalTokens).toBe(15);
      expect(result.verified).toBe(false);

      vi.restoreAllMocks();
    });

    it("selects Ritual provider when verified=true", async () => {
      const inference = new InferenceModule(config);
      inference.addProvider({ name: "together", baseUrl: "https://together.test", type: "together" });
      inference.addProvider({ name: "ritual", baseUrl: "https://ritual.test", type: "ritual" });

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: "verified" } }],
          model: "llama-3-70b",
        }),
      }));

      const result = await inference.chat(
        [{ role: "user", content: "test" }],
        { verified: true },
      );
      expect(result.verified).toBe(true);
      expect(result.provider).toBe("ritual");
      expect(fetch).toHaveBeenCalledWith(
        "https://ritual.test/v1/chat/completions",
        expect.any(Object),
      );

      vi.restoreAllMocks();
    });
  });

  describe("estimateCost", () => {
    it("estimates cost for known model", () => {
      const inference = new InferenceModule(config);
      inference.addProvider({ name: "test", baseUrl: "https://test.com", type: "together" });

      const estimate = inference.estimateCost("llama-3-70b", 1000, 500);
      expect(parseFloat(estimate.estimatedCost)).toBeGreaterThan(0);
      expect(estimate.currency).toBe("USD");
    });

    it("uses default pricing for unknown model", () => {
      const inference = new InferenceModule(config);
      inference.addProvider({ name: "test", baseUrl: "https://test.com", type: "custom" });

      const estimate = inference.estimateCost("unknown-model", 1000, 500);
      expect(parseFloat(estimate.estimatedCost)).toBeGreaterThan(0);
    });
  });
});
