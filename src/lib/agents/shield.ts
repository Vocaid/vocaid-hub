/**
 * Shield agent handlers — risk management, validation, reputation monitoring.
 * A2A: requestClearance, checkReputation
 * MCP: check_validation, evaluate_risk
 */

import type { A2ARequest, A2AResponse, MCPToolSchema, MCPRequest, MCPResponse } from "../agent-router";
import { cachedFetch } from "../cache";
import { getValidationSummary, getRegisteredProviders } from "../og-chain";
import { getAllReputationScores } from "../reputation";

// ---------------------------------------------------------------------------
// A2A handlers
// ---------------------------------------------------------------------------

const a2aMethods: Record<string, (params: Record<string, unknown>) => Promise<A2AResponse>> = {
  async requestClearance(params) {
    const agentId = BigInt((params.agentId as string) || "0");
    const tag = (params.tag as string) || "gpu-tee-attestation";

    if (agentId === 0n) return { error: "Missing agentId parameter" };

    const { data, _demo } = await cachedFetch(
      `shield:validation:${agentId}:${tag}`,
      "og-chain",
      120_000,
      () => getValidationSummary(agentId, tag),
      { count: 0n, avgResponse: 0 },
    );

    const cleared = Number(data.count) > 0 && data.avgResponse >= 50;

    return {
      result: {
        agentId: agentId.toString(),
        cleared,
        validationCount: Number(data.count),
        avgResponse: data.avgResponse,
        tag,
      },
      ...(_demo && { _demo: true, _reason: "0G chain unreachable — mock clearance" }),
    };
  },

  async checkReputation(params) {
    const agentId = BigInt((params.agentId as string) || "0");
    if (agentId === 0n) return { error: "Missing agentId parameter" };

    const { data, _demo } = await cachedFetch(
      `shield:reputation:${agentId}`,
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

  async getProviders() {
    const { data, _demo } = await cachedFetch(
      "shield:providers",
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
    name: "check_validation",
    description: "Check TEE validation status for a given agent ID on the ValidationRegistry",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "The agent's on-chain identity ID" },
        tag: { type: "string", description: "Validation tag (default: gpu-tee-attestation)" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "evaluate_risk",
    description: "Evaluate risk by checking reputation scores and validation status for an agent",
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
  async check_validation(input) {
    const res = await a2aMethods.requestClearance(input);
    if (res.error) return { error: res.error };
    return { output: res.result, _demo: res._demo, _reason: res._reason };
  },

  async evaluate_risk(input) {
    const agentId = (input.agentId as string) || "0";

    // Combine validation + reputation into a risk assessment
    const [clearance, reputation] = await Promise.all([
      a2aMethods.requestClearance({ agentId }),
      a2aMethods.checkReputation({ agentId }),
    ]);

    const clearanceResult = clearance.result as { cleared: boolean; validationCount: number; avgResponse: number } | undefined;
    const reputationResult = reputation.result as { scores: Array<{ tag: string; averageValue: number; count: number }> } | undefined;

    const riskLevel = clearanceResult?.cleared
      ? (reputationResult?.scores?.length ?? 0) > 0 ? "low" : "medium"
      : "high";

    return {
      output: {
        agentId,
        riskLevel,
        clearance: clearanceResult,
        reputation: reputationResult,
      },
      _demo: clearance._demo || reputation._demo,
      _reason: clearance._reason || reputation._reason,
    };
  },
};

export async function handleMCP(req: MCPRequest): Promise<MCPResponse> {
  const handler = mcpHandlers[req.tool];
  if (!handler) {
    return { error: `Unknown tool: ${req.tool}. Available: ${mcpTools.map((t) => t.name).join(", ")}` };
  }
  return handler(req.input ?? {});
}
