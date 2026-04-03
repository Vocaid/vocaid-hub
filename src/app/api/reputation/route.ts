import { NextRequest, NextResponse } from "next/server";
import { getReputation, getAllReputationScores, giveFeedback } from "@/lib/reputation";
import type { ReputationTag } from "@/lib/reputation";

/**
 * GET /api/reputation?agentId=0&tag=starred
 * Returns reputation score(s) for an agent from ERC-8004 ReputationRegistry.
 */
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");
  const tag = req.nextUrl.searchParams.get("tag") || "";

  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  try {
    if (tag) {
      const score = await getReputation(BigInt(agentId), tag as ReputationTag);
      return NextResponse.json(score);
    }
    const scores = await getAllReputationScores(BigInt(agentId));
    return NextResponse.json({ agentId, scores });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Graceful fallback with empty scores
    if (message.includes("env not set") || message.includes("Missing")) {
      return NextResponse.json({
        agentId,
        scores: [],
        warning: "ReputationRegistry not configured — set REPUTATION_REGISTRY in .env",
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/reputation
 * Submit feedback to ERC-8004 ReputationRegistry.
 * Body: { agentId, value, tag1, tag2?, endpoint?, feedbackURI? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, value, tag1, tag2, endpoint, feedbackURI } = body;

    if (agentId === undefined || value === undefined || !tag1) {
      return NextResponse.json(
        { error: "agentId, value, and tag1 required" },
        { status: 400 },
      );
    }

    const result = await giveFeedback({
      agentId: BigInt(agentId),
      value: Number(value),
      tag1,
      tag2,
      endpoint,
      feedbackURI,
    });

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      feedbackHash: result.feedbackHash,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
