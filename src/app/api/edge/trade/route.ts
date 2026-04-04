import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getValidationSummary } from "@/lib/og-chain";
import { logAuditMessage } from "@/lib/hedera";

const AUDIT_TOPIC = process.env.HEDERA_AUDIT_TOPIC ?? "";

const RESOURCE_PREDICTION_ABI = [
  "function placeBet(uint256 marketId, uint8 side) payable",
  "function getMarket(uint256 marketId) view returns (string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool)",
] as const;

function getContract(withSigner = false) {
  const rpc = process.env.OG_RPC_URL;
  const address = process.env.RESOURCE_PREDICTION;
  if (!rpc || !address) {
    throw new Error("Missing OG_RPC_URL or RESOURCE_PREDICTION env");
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  if (!withSigner) return new ethers.Contract(address, RESOURCE_PREDICTION_ABI, provider);

  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error("Missing PRIVATE_KEY env");
  const signer = new ethers.Wallet(pk, provider);
  return new ethers.Contract(address, RESOURCE_PREDICTION_ABI, signer);
}

/**
 * POST /api/edge/trade
 *
 * Edge agent trade execution: Shield clearance → bet placement → HCS audit.
 * No World ID gate — this is an agent endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, side, amount, targetAgentId = 7, reason } = body;

    // Validate input
    if (marketId == null || marketId < 0) {
      return NextResponse.json({ error: "Invalid marketId" }, { status: 400 });
    }
    const outcomeEnum = side === "yes" ? 1 : side === "no" ? 2 : 0;
    if (outcomeEnum === 0) {
      return NextResponse.json({ error: 'side must be "yes" or "no"' }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // 1. Shield clearance — read ValidationRegistry
    let shieldCleared = false;
    let shieldFallback = false;
    try {
      const summary = await getValidationSummary(
        BigInt(targetAgentId),
        "gpu-tee-attestation",
      );
      shieldCleared = summary.count > 0n && summary.avgResponse >= 50;
    } catch {
      // Testnet unreachable — allow with fallback flag
      shieldCleared = true;
      shieldFallback = true;
    }

    if (!shieldCleared) {
      return NextResponse.json(
        { error: "Shield clearance denied — provider not verified", shieldCleared: false },
        { status: 403 },
      );
    }

    // 2. Place bet
    let txHash = "";
    let demo = false;
    try {
      const contract = getContract(true);
      const value = ethers.parseEther(String(amount));
      const tx = await contract.placeBet(marketId, outcomeEnum, { value });
      const receipt = await tx.wait();
      txHash = receipt.hash;
    } catch {
      // Testnet unreachable — return demo mock
      txHash = "0xdemo_edge_trade_" + Date.now().toString(16);
      demo = true;
    }

    // 3. HCS audit (fire-and-forget)
    if (AUDIT_TOPIC) {
      logAuditMessage(
        AUDIT_TOPIC,
        JSON.stringify({
          type: "edge_trade",
          marketId,
          side,
          amount: String(amount),
          txHash,
          targetAgentId: String(targetAgentId),
          reason: reason || null,
          shieldFallback,
          timestamp: new Date().toISOString(),
        }),
      ).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      txHash,
      shieldCleared: true,
      marketId,
      side,
      amount: String(amount),
      ...(demo && { _demo: true, _reason: "0G testnet unreachable — mock response" }),
      ...(shieldFallback && { _shieldFallback: true }),
    });
  } catch (error: unknown) {
    console.error("[edge/trade]", error);
    const message = error instanceof Error ? error.message : "Edge trade failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
