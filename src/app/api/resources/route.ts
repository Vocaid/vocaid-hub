import { NextResponse } from "next/server";
import { requireWorldId } from "@/lib/world-id";
import type { ResourceCardProps } from "@/components/ResourceCard";
import type { OGServiceInfo } from "@/lib/og-compute";
import type { OnChainGPUProvider } from "@/lib/og-chain";

/**
 * GET /api/resources
 *
 * Unified resource listing — aggregates agents + GPU providers.
 * Calls library functions directly (no HTTP self-fetch to other routes).
 * Gated behind World ID verification.
 */
export async function GET() {
  const gate = await requireWorldId();
  if (gate instanceof NextResponse) return gate;

  try {
    // Dynamic imports to avoid SSG initialization failures
    const { listRegisteredAgents } = await import("@/lib/agentkit");
    const { listProviders } = await import("@/lib/og-compute");
    const { getRegisteredProviders } = await import("@/lib/og-chain");

    // Fetch from all sources in parallel — each can fail independently
    const [agentsResult, brokerResult, onChainResult] = await Promise.allSettled([
      listRegisteredAgents(),
      listProviders(),
      getRegisteredProviders(),
    ]);

    const agents = agentsResult.status === "fulfilled" ? agentsResult.value : [];
    const broker = brokerResult.status === "fulfilled" ? brokerResult.value : [];
    const onChain = onChainResult.status === "fulfilled" ? onChainResult.value : [];

    const resources: ResourceCardProps[] = [
      ...mapAgentsToResources(agents),
      ...mapGpuToResources(broker, onChain),
    ];

    return NextResponse.json(resources);
  } catch (err) {
    console.error("[api/resources]", err);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

// --- Mappers ---

interface AgentData {
  agentId: bigint | string;
  owner: string;
  agentURI: string;
  wallet: string;
  operatorWorldId: string;
  role: string;
  type: string;
}

function mapAgentsToResources(agents: AgentData[]): ResourceCardProps[] {
  return agents.map((a) => ({
    type: "agent" as const,
    name: a.role
      ? `${a.role.charAt(0).toUpperCase()}${a.role.slice(1)} Agent`
      : `Agent #${a.agentId}`,
    subtitle: a.agentURI || a.type || "AI Agent",
    reputation: 85,
    verified: !!a.operatorWorldId,
    chain: "world" as const,
    price: "$0.02/call",
    verificationType: "world-id" as const,
  }));
}

function mapGpuToResources(
  broker: OGServiceInfo[],
  onChain: OnChainGPUProvider[],
): ResourceCardProps[] {
  // Merge: on-chain providers first, enriched with broker data where available
  const brokerByAddr = new Map(
    broker.map((b) => [b.provider.toLowerCase(), b]),
  );
  const seen = new Set<string>();
  const resources: ResourceCardProps[] = [];

  // On-chain registered providers (from GPUProviderRegistry)
  for (const p of onChain) {
    const addr = p.address.toLowerCase();
    seen.add(addr);
    const b = brokerByAddr.get(addr);

    resources.push({
      type: "gpu" as const,
      name: b?.model || p.gpuModel || "GPU Provider",
      subtitle: b?.url || `${p.teeType} · Agent #${p.agentId}`,
      reputation: 75,
      verified: b?.teeSignerAcknowledged ?? true,
      chain: "0g" as const,
      price: "$0.05/call",
      verificationType: "tee" as const,
    });
  }

  // Broker-only providers (not registered via our stepper)
  for (const b of broker) {
    if (seen.has(b.provider.toLowerCase())) continue;
    resources.push({
      type: "gpu" as const,
      name: b.model || "GPU Provider",
      subtitle: b.url || b.provider.slice(0, 10) + "...",
      reputation: 75,
      verified: !!b.teeSignerAcknowledged,
      chain: "0g" as const,
      price: "$0.05/call",
      verificationType: "tee" as const,
    });
  }

  return resources;
}
