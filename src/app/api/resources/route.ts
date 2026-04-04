import { NextRequest, NextResponse } from "next/server";
import { requireWorldId } from "@/lib/world-id";
import type { ResourceCardProps } from "@/components/ResourceCard";
import type { ResourceSignals } from "@/components/ReputationSignals";
import type { OGServiceInfo } from "@/lib/og-compute";
import type { OnChainGPUProvider } from "@/lib/og-chain";

type SortField = "quality" | "cost" | "latency" | "uptime";
type FilterType = "gpu" | "agent" | "human";

const VALID_SORTS = new Set<SortField>(["quality", "cost", "latency", "uptime"]);
const VALID_TYPES = new Set<FilterType>(["gpu", "agent", "human"]);
/** Lower-is-better metrics sort ascending; everything else sorts descending. */
const ASC_SORTS = new Set<SortField>(["latency", "cost"]);

/**
 * GET /api/resources
 *
 * Unified resource listing — aggregates agents + GPU providers.
 * Calls library functions directly (no HTTP self-fetch to other routes).
 * Gated behind World ID verification.
 *
 * Query params:
 *   ?sort=quality|cost|latency|uptime  (default: quality desc)
 *   ?type=gpu|agent|human              (filter by resource type)
 */
export async function GET(request: NextRequest) {
  const gate = await requireWorldId();
  if (gate instanceof NextResponse) return gate;

  const { searchParams } = request.nextUrl;
  const sortParam = searchParams.get("sort") as SortField | null;
  const typeParam = searchParams.get("type") as FilterType | null;

  const sortField: SortField = sortParam && VALID_SORTS.has(sortParam) ? sortParam : "quality";
  const filterType: FilterType | null = typeParam && VALID_TYPES.has(typeParam) ? typeParam : null;

  try {
    // Dynamic imports to avoid SSG initialization failures
    const { listRegisteredAgents } = await import("@/lib/agentkit");
    const { listProviders } = await import("@/lib/og-compute");
    const { getRegisteredProviders, getValidationSummary } = await import("@/lib/og-chain");

    // Fetch from all sources in parallel — each can fail independently
    const [agentsResult, brokerResult, onChainResult] = await Promise.allSettled([
      listRegisteredAgents(),
      listProviders(),
      getRegisteredProviders(),
    ]);

    const agents = agentsResult.status === "fulfilled" ? agentsResult.value : [];
    const broker = brokerResult.status === "fulfilled" ? brokerResult.value : [];
    const onChain = onChainResult.status === "fulfilled" ? onChainResult.value : [];

    const gpuResources = await mapGpuToResources(broker, onChain, getValidationSummary);
    const rawResources: ResourceWithAgent[] = [
      ...mapAgentsToResources(agents),
      ...gpuResources,
    ];

    // Enrich with reputation signals (best-effort, never fails the whole request)
    let resources = await enrichWithSignals(rawResources);

    // Filter by type
    if (filterType) {
      resources = resources.filter((r) => r.type === filterType);
    }

    // Sort by selected signal
    resources.sort((a, b) => {
      const aVal = a.signals?.[sortField]?.value ?? -Infinity;
      const bVal = b.signals?.[sortField]?.value ?? -Infinity;
      return ASC_SORTS.has(sortField) ? aVal - bVal : bVal - aVal;
    });

    return NextResponse.json(resources);
  } catch (err) {
    console.error("[api/resources]", err);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

// --- Reputation signal enrichment ---

/** Tracked alongside each resource so we can look up on-chain reputation. */
type ResourceWithAgent = ResourceCardProps & { _agentId?: string };

async function enrichWithSignals(
  resources: ResourceCardProps[],
): Promise<ResourceCardProps[]> {
  let getAllReputationScores: typeof import("@/lib/reputation").getAllReputationScores;
  try {
    ({ getAllReputationScores } = await import("@/lib/reputation"));
  } catch {
    // reputation module unavailable — return resources as-is
    return resources;
  }

  const enriched = await Promise.all(
    resources.map(async (r) => {
      const agentIdStr = (r as ResourceWithAgent)._agentId;
      if (!agentIdStr) return r;

      try {
        const scores = await getAllReputationScores(BigInt(agentIdStr));
        if (scores.length === 0) return r;

        const signals: ResourceSignals = {};
        for (const s of scores) {
          switch (s.tag) {
            case "starred":
              signals.quality = { value: Math.round(s.averageValue), unit: "score" };
              break;
            case "uptime":
              signals.uptime = { value: Number(s.averageValue.toFixed(1)), unit: "%", tag2: "30d" };
              break;
            case "responseTime":
              signals.latency = { value: Math.round(s.averageValue), unit: "ms", tag2: "p50" };
              break;
            case "successRate":
              // Map to quality if starred wasn't present
              if (!signals.quality) {
                signals.quality = { value: Math.round(s.averageValue), unit: "score" };
              }
              break;
          }
        }

        // Strip internal _agentId before returning
        const { _agentId: _, ...clean } = r as ResourceWithAgent;
        return { ...clean, signals } as ResourceCardProps;
      } catch {
        // Single resource failure — return without signals
        return r;
      }
    }),
  );

  // Strip _agentId from any resources that didn't get signals
  return enriched.map((r) => {
    const { _agentId: _, ...clean } = r as ResourceWithAgent;
    return clean as ResourceCardProps;
  });
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

function mapAgentsToResources(agents: AgentData[]): ResourceWithAgent[] {
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
    _agentId: a.agentId.toString(),
  }));
}

type ValidateFn = (agentId: bigint, tag: string) => Promise<{ count: bigint; avgResponse: number }>;

async function mapGpuToResources(
  broker: OGServiceInfo[],
  onChain: OnChainGPUProvider[],
  validateFn: ValidateFn,
): Promise<ResourceWithAgent[]> {
  // Merge: on-chain providers first, enriched with broker data where available
  const brokerByAddr = new Map(
    broker.map((b) => [b.provider.toLowerCase(), b]),
  );
  const seen = new Set<string>();
  const resources: ResourceWithAgent[] = [];

  // On-chain registered providers (from GPUProviderRegistry)
  for (const p of onChain) {
    const addr = p.address.toLowerCase();
    seen.add(addr);
    const b = brokerByAddr.get(addr);

    // Shield check: query ValidationRegistry for this provider's agentId
    let validated = false;
    try {
      const summary = await validateFn(BigInt(p.agentId), "gpu-tee-attestation");
      validated = summary.count > 0n && summary.avgResponse >= 50;
    } catch {
      // ValidationRegistry unreachable — fall back to broker TEE acknowledgment
      validated = b?.teeSignerAcknowledged ?? false;
    }

    resources.push({
      type: "gpu" as const,
      name: b?.model || p.gpuModel || "GPU Provider",
      subtitle: b?.url || `${p.teeType} · Agent #${p.agentId}`,
      reputation: 75,
      verified: validated,
      chain: "0g" as const,
      price: "$0.05/call",
      verificationType: "tee" as const,
      _agentId: p.agentId,
    });
  }

  // Broker-only providers (not registered via our stepper) — always unverified
  for (const b of broker) {
    if (seen.has(b.provider.toLowerCase())) continue;
    resources.push({
      type: "gpu" as const,
      name: b.model || "GPU Provider",
      subtitle: b.url || b.provider.slice(0, 10) + "...",
      reputation: 75,
      verified: false,
      chain: "0g" as const,
      price: "$0.05/call",
      verificationType: "tee" as const,
    });
  }

  return resources;
}
