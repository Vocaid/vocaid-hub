import { NextResponse } from "next/server";
import { listRegisteredAgents, getAgent } from "@/lib/agentkit";

/**
 * GET /api/agents
 *
 * List all agents registered in the 0G IdentityRegistry.
 * Optionally filter by ?agentId=<id> to fetch a single agent.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentIdParam = searchParams.get("agentId");

    if (agentIdParam) {
      const agent = await getAgent(BigInt(agentIdParam));
      return NextResponse.json({
        agent: {
          agentId: agent.agentId.toString(),
          owner: agent.owner,
          agentURI: agent.agentURI,
          wallet: agent.wallet,
          operatorWorldId: agent.operatorWorldId,
          role: agent.role,
          type: agent.type,
        },
      });
    }

    const agents = await listRegisteredAgents();

    return NextResponse.json({
      agents: agents.map((a) => ({
        agentId: a.agentId.toString(),
        owner: a.owner,
        agentURI: a.agentURI,
        wallet: a.wallet,
        operatorWorldId: a.operatorWorldId,
        role: a.role,
        type: a.type,
      })),
      count: agents.length,
      registry: process.env.IDENTITY_REGISTRY,
      chain: "0g-galileo-testnet",
    });
  } catch (err) {
    console.error("Failed to list agents:", err);
    return NextResponse.json(
      { error: "Failed to list agents", details: String(err) },
      { status: 500 },
    );
  }
}
