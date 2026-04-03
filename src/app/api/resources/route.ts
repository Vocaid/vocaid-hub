import { NextResponse } from "next/server";
import { requireWorldId } from "@/lib/world-id";
import type { ResourceCardProps } from "@/components/ResourceCard";

/**
 * GET /api/resources
 *
 * Unified resource listing — aggregates agents + GPU providers.
 * Gated behind World ID verification. Unverified users get 403.
 */
export async function GET() {
  const gate = await requireWorldId();
  if (gate instanceof NextResponse) return gate;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [agentsRes, gpuRes] = await Promise.all([
      fetch(`${baseUrl}/api/agents`).then((r) => (r.ok ? r.json() : { agents: [] })),
      fetch(`${baseUrl}/api/gpu/list`).then((r) => (r.ok ? r.json() : { providers: [] })),
    ]);

    const resources: ResourceCardProps[] = [
      ...mapAgentsToResources(agentsRes.agents ?? []),
      ...mapGpuToResources(gpuRes.providers ?? []),
    ];

    return NextResponse.json(resources);
  } catch (err) {
    console.error("[api/resources]", err);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

interface AgentData {
  agentId: string;
  owner: string;
  agentURI: string;
  wallet: string;
  operatorWorldId: string;
  role: string;
  type: string;
}

interface GpuProvider {
  provider: string;
  model?: string;
  url?: string;
  teeSignerAcknowledged?: boolean;
}

function mapAgentsToResources(agents: AgentData[]): ResourceCardProps[] {
  return agents.map((a) => ({
    type: "agent" as const,
    name: a.role ? `${a.role.charAt(0).toUpperCase()}${a.role.slice(1)} Agent` : `Agent #${a.agentId}`,
    subtitle: a.agentURI || a.type || "AI Agent",
    reputation: 85,
    verified: !!a.operatorWorldId,
    chain: "world" as const,
    price: "$0.02/call",
    verificationType: "world-id" as const,
  }));
}

function mapGpuToResources(providers: GpuProvider[]): ResourceCardProps[] {
  return providers.map((p) => ({
    type: "gpu" as const,
    name: p.model || "GPU Provider",
    subtitle: p.url || p.provider.slice(0, 10) + "...",
    reputation: 75,
    verified: !!p.teeSignerAcknowledged,
    chain: "0g" as const,
    price: "$0.05/call",
    verificationType: "tee" as const,
  }));
}
