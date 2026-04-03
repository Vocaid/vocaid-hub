import { NextRequest, NextResponse } from "next/server";
import { queryAuditTrail } from "@/lib/hedera";

const DEFAULT_TOPIC = process.env.HEDERA_AUDIT_TOPIC ?? "";

/**
 * GET /api/hedera/audit — Query HCS audit trail via Mirror Node REST API.
 *
 * Demonstrates HCS + Mirror Node integration for the "No Solidity" track.
 * Three native Hedera services used: HTS (tokens) + HCS (topics) + Mirror Node (queries).
 *
 * Query params:
 *   - topicId: HCS topic ID (defaults to HEDERA_AUDIT_TOPIC env)
 *   - limit: max messages to return (default 100)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId") ?? DEFAULT_TOPIC;
  const limit = Number(searchParams.get("limit") ?? "100");

  if (!topicId) {
    return NextResponse.json(
      { error: "Missing topicId param and no HEDERA_AUDIT_TOPIC configured" },
      { status: 400 },
    );
  }

  try {
    const messages = await queryAuditTrail(topicId, limit);
    return NextResponse.json({ topicId, count: messages.length, messages });
  } catch (err) {
    console.error("Audit trail query failed:", err);
    return NextResponse.json(
      { error: "Failed to query audit trail from Mirror Node" },
      { status: 500 },
    );
  }
}
