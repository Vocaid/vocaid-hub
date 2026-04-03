import { NextRequest, NextResponse } from "next/server";
import { registerAgent } from "@/lib/agentkit";
import { isVerifiedOnChain } from "@/lib/world-id";
import type { Address } from "viem";

interface RegisterRequestBody {
  agentURI: string;
  operatorWorldId: string; // nullifierHash from World ID verification
  operatorAddress: string; // wallet address of the human operator
  role: string;
  agentkitId?: string;
}

/**
 * POST /api/agents/register
 *
 * Register a new AI agent on the 0G IdentityRegistry with ERC-8004 metadata.
 * Requires the operator to have a verified World ID (checked via CredentialGate).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterRequestBody;
    const { agentURI, operatorWorldId, operatorAddress, role, agentkitId } =
      body;

    // Validate required fields
    if (!agentURI || !operatorWorldId || !operatorAddress || !role) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: agentURI, operatorWorldId, operatorAddress, role",
        },
        { status: 400 },
      );
    }

    // Verify the operator has a valid World ID on-chain
    const isVerified = await isVerifiedOnChain(operatorAddress as Address);
    if (!isVerified) {
      return NextResponse.json(
        {
          error:
            "Operator address is not World ID verified. Complete World ID verification first.",
        },
        { status: 403 },
      );
    }

    // Register on 0G Chain IdentityRegistry
    const result = await registerAgent({
      agentURI,
      operatorWorldId,
      role,
      agentkitId,
    });

    return NextResponse.json({
      success: true,
      agentId: result.agentId.toString(),
      txHash: result.txHash,
      registry: process.env.IDENTITY_REGISTRY,
      chain: "0g-galileo-testnet",
    });
  } catch (err) {
    console.error("Agent registration failed:", err);
    return NextResponse.json(
      { error: "Registration failed", details: String(err) },
      { status: 500 },
    );
  }
}
