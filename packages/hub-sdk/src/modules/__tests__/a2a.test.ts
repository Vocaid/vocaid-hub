import { describe, expect, it, vi } from "vitest";
import { A2AModule } from "../a2a.js";
import type { AgentCard } from "../../types/index.js";

const config = {
  apiKey: "voc_test",
  hubUrl: "https://vocaid-hub.vercel.app",
  chains: {},
};

describe("A2AModule", () => {
  describe("createAgentCard", () => {
    it("creates a valid Agent Card with required fields", () => {
      const a2a = new A2AModule(config);
      const card = a2a.createAgentCard({
        name: "my-agent",
        description: "A test agent",
        url: "https://my-agent.example.com",
        skills: [
          { id: "analyze", name: "Analyze Data", description: "Analyzes hiring data" },
        ],
      });

      expect(card.name).toBe("my-agent");
      expect(card.version).toBe("0.1.0");
      expect(card.capabilities.streaming).toBe(false);
      expect(card.skills).toHaveLength(1);
      expect(card.defaultInputModes).toContain("application/json");
    });

    it("merges custom capabilities", () => {
      const a2a = new A2AModule(config);
      const card = a2a.createAgentCard({
        name: "streamer",
        description: "Streams data",
        url: "https://example.com",
        skills: [],
        capabilities: { streaming: true },
      });
      expect(card.capabilities.streaming).toBe(true);
      expect(card.capabilities.pushNotifications).toBe(false);
    });
  });

  describe("getHubAgentCard", () => {
    it("returns the hub's own Agent Card", () => {
      const a2a = new A2AModule(config);
      const card = a2a.getHubAgentCard();

      expect(card.name).toBe("vocaid-hub");
      expect(card.url).toBe("https://vocaid-hub.vercel.app");
      expect(card.skills.length).toBeGreaterThan(0);
      expect(card.skills.map((s) => s.id)).toContain("hiring-signals");
      expect(card.skills.map((s) => s.id)).toContain("prediction-markets");
      expect(card.skills.map((s) => s.id)).toContain("agent-marketplace");
    });
  });

  describe("discoverAgent", () => {
    it("fetches Agent Card from a remote URL", async () => {
      const a2a = new A2AModule(config);
      const mockCard: AgentCard = {
        name: "remote-agent",
        description: "Remote",
        url: "https://remote.example.com",
        version: "1.0.0",
        capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
        skills: [],
        defaultInputModes: ["application/json"],
        defaultOutputModes: ["application/json"],
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCard),
      }));

      const card = await a2a.discoverAgent("https://remote.example.com");
      expect(card.name).toBe("remote-agent");
      expect(fetch).toHaveBeenCalledWith(
        "https://remote.example.com/.well-known/agent.json",
        expect.any(Object),
      );

      vi.restoreAllMocks();
    });

    it("throws on failed discovery", async () => {
      const a2a = new A2AModule(config);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }));

      await expect(a2a.discoverAgent("https://bad.example.com")).rejects.toThrow(
        "Agent discovery failed",
      );

      vi.restoreAllMocks();
    });
  });
});
