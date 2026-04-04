/**
 * Edge agent handlers — trade execution with signature verification.
 * A2A: requestTrade, getMarket
 * MCP: place_bet, check_clearance
 *
 * Security: POST requires signed payload. Signer must match agent's registered wallet.
 */

import { recoverMessageAddress, type Hex } from "viem";
import { ethers } from "ethers";
import type { A2ARequest, A2AResponse, MCPToolSchema, MCPRequest, MCPResponse } from "../agent-router";
import { cachedFetch } from "../cache";
import { getValidationSummary } from "../og-chain";
import { getAgent } from "../agentkit";
import { logAuditMessage } from "../hedera";

const AUDIT_TOPIC = process.env.HEDERA_AUDIT_TOPIC ?? "";

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

export async function verifySignature(
  method: string,
  params: Record<string, unknown>,
  signature: string,
  agentId: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const message = JSON.stringify({ method, params });
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as Hex,
    });

    // Check against IdentityRegistry
    const agent = await getAgent(BigInt(agentId));
    if (!agent?.wallet) {
      return { valid: false, error: "Agent not found in IdentityRegistry" };
    }

    if (recoveredAddress.toLowerCase() !== agent.wallet.toLowerCase()) {
      return { valid: false, error: "Signer does not match agent's registered wallet" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Signature verification failed" };
  }
}

// ---------------------------------------------------------------------------
// Contract helper
// ---------------------------------------------------------------------------

function getContract(withSigner = false) {
  const rpc = process.env.OG_RPC_URL;
  const address = process.env.RESOURCE_PREDICTION;
  if (!rpc || !address) throw new Error("Missing OG_RPC_URL or RESOURCE_PREDICTION env");

  const abi = [
    "function placeBet(uint256 marketId, uint8 side) payable",
    "function getMarket(uint256 marketId) view returns (string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool)",
  ] as const;

  const provider = new ethers.JsonRpcProvider(rpc);
  if (!withSigner) return new ethers.Contract(address, abi, provider);

  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error("Missing PRIVATE_KEY env");
  return new ethers.Contract(address, abi, new ethers.Wallet(pk, provider));
}

// ---------------------------------------------------------------------------
// A2A handlers
// ---------------------------------------------------------------------------

const a2aMethods: Record<string, (params: Record<string, unknown>) => Promise<A2AResponse>> = {
  async getMarket(params) {
    const marketId = Number(params.marketId ?? 0);

    const { data, _demo } = await cachedFetch(
      `edge:market:${marketId}`,
      "og-chain",
      30_000,
      async () => {
        const contract = getContract();
        const [question, resolutionTime, state, winningOutcome, yesPool, noPool] =
          await contract.getMarket(marketId);
        return {
          marketId,
          question,
          resolutionTime: Number(resolutionTime),
          state: Number(state),
          winningOutcome: Number(winningOutcome),
          yesPool: ethers.formatEther(yesPool),
          noPool: ethers.formatEther(noPool),
        };
      },
      {
        marketId,
        question: "Demo market",
        resolutionTime: 0,
        state: 0,
        winningOutcome: 0,
        yesPool: "0",
        noPool: "0",
      },
    );

    return {
      result: data,
      ...(_demo && { _demo: true, _reason: "0G chain unreachable — mock market data" }),
    };
  },

  async requestTrade(params) {
    const { marketId, side, amount, targetAgentId = "7", reason } = params as {
      marketId?: number;
      side?: string;
      amount?: string;
      targetAgentId?: string;
      reason?: string;
    };

    if (marketId == null) return { error: "Missing marketId" };
    const outcomeEnum = side === "yes" ? 1 : side === "no" ? 2 : 0;
    if (outcomeEnum === 0) return { error: 'side must be "yes" or "no"' };
    if (!amount || Number(amount) <= 0) return { error: "Invalid amount" };

    // Shield clearance
    let shieldCleared = false;
    let shieldFallback = false;
    try {
      const summary = await getValidationSummary(BigInt(targetAgentId), "gpu-tee-attestation");
      shieldCleared = summary.count > 0n && summary.avgResponse >= 50;
    } catch {
      shieldCleared = true;
      shieldFallback = true;
    }

    if (!shieldCleared) {
      return { error: "Shield clearance denied — provider not verified" };
    }

    // Place bet
    let txHash = "";
    let demo = false;
    try {
      const contract = getContract(true);
      const value = ethers.parseEther(String(amount));
      const tx = await contract.placeBet(marketId, outcomeEnum, { value });
      const receipt = await tx.wait();
      txHash = receipt.hash;
    } catch {
      txHash = "0xdemo_edge_a2a_trade_" + Date.now().toString(16);
      demo = true;
    }

    // HCS audit
    if (AUDIT_TOPIC) {
      logAuditMessage(AUDIT_TOPIC, JSON.stringify({
        type: "edge_a2a_trade",
        marketId,
        side,
        amount,
        txHash,
        targetAgentId,
        reason: reason || null,
        timestamp: new Date().toISOString(),
      })).catch(console.error);
    }

    return {
      result: { success: true, txHash, shieldCleared: true, marketId, side, amount },
      ...(demo && { _demo: true, _reason: "0G testnet unreachable — mock trade" }),
      ...(shieldFallback && { _demo: true, _reason: "Shield fallback — testnet unreachable" }),
    };
  },
};

export async function handleA2A(req: A2ARequest): Promise<A2AResponse> {
  // Edge requires signature for POST methods that modify state
  if (req.method === "requestTrade") {
    if (!req.signature || !req.agentId) {
      return { error: "Edge trade requires signed payload: { agentId, method, params, signature }" };
    }
    const { valid, error } = await verifySignature(req.method, req.params ?? {}, req.signature, req.agentId);
    if (!valid) return { error: `Signature rejected: ${error}` };
  }

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
    name: "place_bet",
    description: "Place a bet on a prediction market (requires signed payload from authorized agent)",
    inputSchema: {
      type: "object",
      properties: {
        marketId: { type: "number", description: "The prediction market ID" },
        side: { type: "string", description: '"yes" or "no"' },
        amount: { type: "string", description: "Amount in A0GI to bet" },
        targetAgentId: { type: "string", description: "Agent ID for Shield clearance check" },
      },
      required: ["marketId", "side", "amount"],
    },
  },
  {
    name: "check_clearance",
    description: "Check Shield clearance status for a target agent (read-only, no signature needed)",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Agent ID to check clearance for" },
      },
      required: ["agentId"],
    },
  },
];

// ---------------------------------------------------------------------------
// MCP handlers
// ---------------------------------------------------------------------------

const mcpHandlers: Record<string, (input: Record<string, unknown>, req: MCPRequest) => Promise<MCPResponse>> = {
  async place_bet(input, req) {
    // place_bet requires signature
    if (!req.signature || !req.agentId) {
      return { error: "place_bet requires signed payload: { tool, input, signature, agentId }" };
    }
    const { valid, error } = await verifySignature("place_bet", input, req.signature, req.agentId);
    if (!valid) return { error: `Signature rejected: ${error}` };

    const res = await a2aMethods.requestTrade(input);
    if (res.error) return { error: res.error };
    return { output: res.result, _demo: res._demo, _reason: res._reason };
  },

  async check_clearance(input) {
    const agentId = BigInt((input.agentId as string) || "0");
    if (agentId === 0n) return { error: "Missing agentId" };

    const { data, _demo } = await cachedFetch(
      `edge:clearance:${agentId}`,
      "og-chain",
      120_000,
      () => getValidationSummary(agentId, "gpu-tee-attestation"),
      { count: 0n, avgResponse: 0 },
    );

    const cleared = Number(data.count) > 0 && data.avgResponse >= 50;
    return {
      output: { agentId: agentId.toString(), cleared, validationCount: Number(data.count), avgResponse: data.avgResponse },
      ...(_demo && { _demo: true, _reason: "0G chain unreachable — mock clearance" }),
    };
  },
};

export async function handleMCP(req: MCPRequest): Promise<MCPResponse> {
  const handler = mcpHandlers[req.tool];
  if (!handler) {
    return { error: `Unknown tool: ${req.tool}. Available: ${mcpTools.map((t) => t.name).join(", ")}` };
  }
  return handler(req.input ?? {}, req);
}
