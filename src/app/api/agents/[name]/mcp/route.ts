import { NextRequest, NextResponse } from "next/server";
import {
  isValidAgent,
  getAgentCard,
  checkRateLimit,
  type AgentName,
  type MCPRequest,
  type MCPResponse,
} from "@/lib/agent-router";
import { handleMCP as seerMCP, mcpTools as seerTools } from "@/lib/agents/seer";
import { handleMCP as edgeMCP, mcpTools as edgeTools } from "@/lib/agents/edge";
import { handleMCP as shieldMCP, mcpTools as shieldTools } from "@/lib/agents/shield";
import { handleMCP as lensMCP, mcpTools as lensTools } from "@/lib/agents/lens";

export const maxDuration = 30;

const handlers: Record<AgentName, (req: MCPRequest) => Promise<MCPResponse>> = {
  seer: seerMCP,
  edge: edgeMCP,
  shield: shieldMCP,
  lens: lensMCP,
};

const toolSchemas: Record<AgentName, typeof seerTools> = {
  seer: seerTools,
  edge: edgeTools,
  shield: shieldTools,
  lens: lensTools,
};

/**
 * GET /api/agents/[name]/mcp — Return MCP tool schema
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
    protocol: "mcp",
    tools: toolSchemas[name],
  });
}

/**
 * POST /api/agents/[name]/mcp — Execute MCP tool
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

  let body: MCPRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.tool) {
    return NextResponse.json({ error: "Missing tool field" }, { status: 400 });
  }

  const handler = handlers[name];
  const result = await handler(body);

  if (result.error) {
    const status = result.error.includes("Signature rejected") ? 401
      : result.error.includes("Unknown tool") ? 400
      : result.error.includes("requires signed") ? 401
      : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
