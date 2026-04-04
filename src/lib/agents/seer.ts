/**
 * Seer agent handlers — signal analysis via 0G Compute inference.
 * A2A: querySignal, getProviders, runInference
 * MCP: list_providers, run_inference
 */

import type { A2ARequest, A2AResponse, MCPToolSchema, MCPRequest, MCPResponse } from "../agent-router";
import { cachedFetch } from "../cache";
// Dynamic imports — @0glabs/0g-serving-broker ESM broken on Node 24
const loadOgCompute = () => import("../og-compute");
const loadOgBroker = () => import("../og-broker");
import { logAuditMessage } from "../hedera";

const AUDIT_TOPIC = process.env.HEDERA_AUDIT_TOPIC ?? "";

// ---------------------------------------------------------------------------
// A2A handlers
// ---------------------------------------------------------------------------

const a2aMethods: Record<string, (params: Record<string, unknown>) => Promise<A2AResponse>> = {
  async getProviders() {
    const { data, _demo } = await cachedFetch(
      "seer:providers",
      "og-broker",
      30_000,
      async () => { const m = await loadOgCompute(); return m.listProviders(); },
      [],
    );
    return {
      result: { providers: data, count: data.length },
      ...(_demo && { _demo: true, _reason: "0G broker unreachable — cached/mock response" }),
    };
  },

  async querySignal(params) {
    const prompt = (params.prompt as string) || "Analyze current GPU compute market conditions";
    return a2aMethods.runInference({ prompt });
  },

  async runInference(params) {
    const prompt = (params.prompt as string) || "";
    if (!prompt) return { error: "Missing prompt parameter" };

    try {
      const { data: providers } = await cachedFetch(
        "seer:providers",
        "og-broker",
        30_000,
        async () => { const m = await loadOgCompute(); return m.listProviders(); },
        [],
      );

      if (providers.length > 0) {
        const { callInference } = await loadOgBroker();
        const result = await callInference(providers[0].provider, prompt);

        if (AUDIT_TOPIC) {
          logAuditMessage(AUDIT_TOPIC, JSON.stringify({
            type: "seer_a2a_inference",
            provider: providers[0].provider,
            model: providers[0].model,
            verified: result.verified,
            timestamp: new Date().toISOString(),
          })).catch(console.error);
        }

        return {
          result: {
            response: result.response,
            provider: providers[0].provider,
            model: providers[0].model,
            verified: result.verified,
          },
        };
      }

      // Fallback
      return {
        result: {
          response: `[Seer Analysis] Based on current data, inference demand is moderate. No active providers on 0G Galileo testnet.`,
          provider: "mock-seer-fallback",
          model: "seer-analysis-v1",
          verified: null,
        },
        _demo: true,
        _reason: "No providers on 0G testnet. SDK integration is production-ready.",
      };
    } catch {
      return {
        error: "Inference failed",
      };
    }
  },
};

export async function handleA2A(req: A2ARequest): Promise<A2AResponse> {
  const handler = a2aMethods[req.method];
  if (!handler) {
    return { error: `Unknown method: ${req.method}. Available: ${Object.keys(a2aMethods).join(", ")}` };
  }
  return handler(req.params ?? {});
}

// ---------------------------------------------------------------------------
// MCP tool schemas
// ---------------------------------------------------------------------------

export const mcpTools: MCPToolSchema[] = [
  {
    name: "list_providers",
    description: "List available GPU inference providers on the 0G compute network",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max providers to return (default 50)" },
      },
    },
  },
  {
    name: "run_inference",
    description: "Run AI inference on a 0G compute provider and verify the response",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The prompt to send to the inference provider" },
      },
      required: ["prompt"],
    },
  },
];

// ---------------------------------------------------------------------------
// MCP handlers
// ---------------------------------------------------------------------------

const mcpHandlers: Record<string, (input: Record<string, unknown>) => Promise<MCPResponse>> = {
  async list_providers() {
    const res = await a2aMethods.getProviders({});
    return { output: res.result, _demo: res._demo, _reason: res._reason };
  },

  async run_inference(input) {
    const res = await a2aMethods.runInference(input);
    if (res.error) return { error: res.error };
    return { output: res.result, _demo: res._demo, _reason: res._reason };
  },
};

export async function handleMCP(req: MCPRequest): Promise<MCPResponse> {
  const handler = mcpHandlers[req.tool];
  if (!handler) {
    return { error: `Unknown tool: ${req.tool}. Available: ${mcpTools.map((t) => t.name).join(", ")}` };
  }
  return handler(req.input ?? {});
}
