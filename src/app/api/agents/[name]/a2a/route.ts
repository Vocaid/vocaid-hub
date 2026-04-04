import { NextRequest, NextResponse } from "next/server";
import {
  isValidAgent,
  getAgentCard,
  checkRateLimit,
  type AgentName,
  type A2ARequest,
  type A2AResponse,
} from "@/lib/agent-router";
import { handleA2A as seerA2A } from "@/lib/agents/seer";
import { handleA2A as edgeA2A } from "@/lib/agents/edge";
import { handleA2A as shieldA2A } from "@/lib/agents/shield";
import { handleA2A as lensA2A } from "@/lib/agents/lens";

export const maxDuration = 30;

const handlers: Record<AgentName, (req: A2ARequest) => Promise<A2AResponse>> = {
  seer: seerA2A,
  edge: edgeA2A,
  shield: shieldA2A,
  lens: lensA2A,
};

/**
 * GET /api/agents/[name]/a2a — Return agent capability card
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!isValidAgent(name)) {
    return NextResponse.json({ error: `Unknown agent: ${name}` }, { status: 404 });
  }

  const card = await getAgentCard(name);
  return NextResponse.json({
    ...card,
    protocol: "a2a",
    methods: getMethodList(name),
  });
}

/**
 * POST /api/agents/[name]/a2a — Execute A2A task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!isValidAgent(name)) {
    return NextResponse.json({ error: `Unknown agent: ${name}` }, { status: 404 });
  }

  // Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!checkRateLimit(name, ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: A2ARequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.method) {
    return NextResponse.json({ error: "Missing method field" }, { status: 400 });
  }

  const handler = handlers[name];
  const result = await handler(body);

  if (result.error) {
    const status = result.error.includes("Signature rejected") ? 401
      : result.error.includes("Unknown method") ? 400
      : result.error.includes("requires signed") ? 401
      : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// Method listing per agent (for GET capability card)
// ---------------------------------------------------------------------------

function getMethodList(name: AgentName): string[] {
  const methods: Record<AgentName, string[]> = {
    seer: ["querySignal", "getProviders", "runInference"],
    edge: ["requestTrade", "getMarket"],
    shield: ["requestClearance", "checkReputation", "getProviders"],
    lens: ["submitFeedback", "getObservation", "getReputationScores"],
  };
  return methods[name];
}
