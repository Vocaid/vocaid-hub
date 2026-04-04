/**
 * Lens agent handlers — discovery, transparency, reputation feedback.
 * A2A: submitFeedback, getObservation, getReputationScores
 * MCP: give_feedback, get_reputation_scores
 */

import type { A2ARequest, A2AResponse, MCPToolSchema, MCPRequest, MCPResponse } from "../agent-router";
import { cachedFetch } from "../cache";
import { giveFeedback, getReputation, getAllReputationScores, type ReputationTag } from "../reputation";
import { getRegisteredProviders } from "../og-chain";
import { logAuditMessage } from "../hedera";

const AUDIT_TOPIC = process.env.HEDERA_AUDIT_TOPIC ?? "";

// ---------------------------------------------------------------------------
// A2A handlers
// ---------------------------------------------------------------------------

const a2aMethods: Record<string, (params: Record<string, unknown>) => Promise<A2AResponse>> = {
  async getReputationScores(params) {
    const agentId = BigInt((params.agentId as string) || "0");
    if (agentId === 0n) return { error: "Missing agentId parameter" };

    const { data, _demo } = await cachedFetch(
      `lens:reputation:${agentId}`,
      "og-chain",
      60_000,
      () => getAllReputationScores(agentId),
      [],
    );

    return {
      result: { agentId: agentId.toString(), scores: data },
      ...(_demo && { _demo: true, _reason: "0G chain unreachable — mock response" }),
    };
  },

  async getObservation(params) {
    const agentId = params.agentId ? BigInt(params.agentId as string) : undefined;
    const tag = (params.tag as string) || "";

    if (agentId) {
      // Single agent reputation
      const { data, _demo } = await cachedFetch(
        `lens:reputation:${agentId}:${tag}`,
        "og-chain",
        60_000,
        () => getReputation(agentId, tag as ReputationTag | ""),
        { agentId: agentId.toString(), tag: tag || "starred", count: 0, averageValue: 0, decimals: 0 },
      );

      return {
        result: data,
        ...(_demo && { _demo: true, _reason: "0G chain unreachable — mock response" }),
      };
    }

    // Overview: list registered providers
    const { data, _demo } = await cachedFetch(
      "lens:providers",
      "og-chain",
      30_000,
      () => getRegisteredProviders(),
      [],
    );

    return {
      result: { providers: data, count: data.length },
      ...(_demo && { _demo: true, _reason: "0G chain unreachable — mock response" }),
    };
  },

  async submitFeedback(params) {
    const agentId = BigInt((params.agentId as string) || "0");
    const value = Number(params.value ?? 0);
    const tag1 = (params.tag as string) || "starred";

    if (agentId === 0n) return { error: "Missing agentId parameter" };
    if (value <= 0) return { error: "value must be positive" };

    try {
      const result = await giveFeedback({
        agentId,
        value,
        tag1: tag1 as ReputationTag,
      });

      // HCS audit
      if (AUDIT_TOPIC) {
        logAuditMessage(AUDIT_TOPIC, JSON.stringify({
          type: "lens_feedback",
          agentId: agentId.toString(),
          value,
          tag: tag1,
          txHash: result.txHash,
          timestamp: new Date().toISOString(),
        })).catch(console.error);
      }

      return { result: { success: true, txHash: result.txHash } };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Feedback submission failed",
        _demo: true,
        _reason: "0G chain unreachable or wallet not configured",
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
    name: "give_feedback",
    description: "Write reputation feedback to the ERC-8004 ReputationRegistry for an agent",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "The agent's on-chain identity ID" },
        value: { type: "number", description: "Feedback value (e.g. 85 for 85%)" },
        tag: { type: "string", description: "Feedback tag: starred, uptime, successRate, responseTime" },
      },
      required: ["agentId", "value", "tag"],
    },
  },
  {
    name: "get_reputation_scores",
    description: "Read all reputation scores for an agent from the ReputationRegistry",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "The agent's on-chain identity ID" },
      },
      required: ["agentId"],
    },
  },
];

// ---------------------------------------------------------------------------
// MCP handlers
// ---------------------------------------------------------------------------

const mcpHandlers: Record<string, (input: Record<string, unknown>) => Promise<MCPResponse>> = {
  async give_feedback(input) {
    const res = await a2aMethods.submitFeedback(input);
    if (res.error) return { error: res.error, _demo: res._demo, _reason: res._reason };
    return { output: res.result };
  },

  async get_reputation_scores(input) {
    const res = await a2aMethods.getReputationScores(input);
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
