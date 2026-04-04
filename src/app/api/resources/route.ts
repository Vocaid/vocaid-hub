import { NextRequest, NextResponse } from "next/server";
// World ID gate removed for browsing — resources should be publicly discoverable
// Keep gate on write operations (hire, register) only
import type { ResourceCardProps } from "@/components/ResourceCard";
import type { ResourceSignals } from "@/components/ReputationSignals";
import type { OGServiceInfo } from "@/lib/og-compute";
import { type OnChainGPUProvider, type OnChainHumanProvider, type OnChainDePINDevice, getReputationSummary, getRegisteredHumans, getRegisteredDePIN } from "@/lib/og-chain";

type SortField = "quality" | "cost" | "latency" | "uptime";
type FilterType = "gpu" | "agent" | "human" | "depin";

const VALID_SORTS = new Set<SortField>(["quality", "cost", "latency", "uptime"]);
const VALID_TYPES = new Set<FilterType>(["gpu", "agent", "human", "depin"]);
/** Lower-is-better metrics sort ascending; everything else sorts descending. */
const ASC_SORTS = new Set<SortField>(["latency", "cost"]);

/**
 * GET /api/resources
 *
 * Unified resource listing — aggregates agents + GPU providers.
 * Calls library functions directly (no HTTP self-fetch to other routes).
 * Public endpoint — no World ID gate. Resources should be discoverable
 * by anyone (including agents via A2A/MCP).
 *
 * Query params:
 *   ?sort=quality|cost|latency|uptime  (default: quality desc)
 *   ?type=gpu|agent|human              (filter by resource type)
 */
export async function GET(request: NextRequest) {
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
    const [agentsResult, brokerResult, onChainResult, humanResult, depinResult] = await Promise.allSettled([
      listRegisteredAgents(),
      listProviders(),
      getRegisteredProviders(),
      getRegisteredHumans(),
      getRegisteredDePIN(),
    ]);

    const agents = agentsResult.status === "fulfilled" ? agentsResult.value : [];
    const broker = brokerResult.status === "fulfilled" ? brokerResult.value : [];
    const onChain = onChainResult.status === "fulfilled" ? onChainResult.value : [];
    const humans = humanResult.status === "fulfilled" ? humanResult.value : [];
    const depinDevices = depinResult.status === "fulfilled" ? depinResult.value : [];

    const gpuResources = await mapGpuToResources(broker, onChain, getValidationSummary);
    const agentResources = await mapAgentsToResources(agents);
    const humanResources = mapHumanToResources(humans);
    const depinResources = mapDePINToResources(depinDevices);

    const rawResources: ResourceWithAgent[] = [
      ...agentResources,
      ...gpuResources,
      ...humanResources,
      ...depinResources,
      // Demo seed: verified agents tied to operator World ID
      ...(agentResources.length === 0 ? getDemoAgents() : []),
      // Demo seed: DePIN devices
      ...(depinResources.length === 0 ? getDemoDePIN() : []),
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
type ResourceWithAgent = ResourceCardProps & { _agentId?: string; owner?: string; active?: boolean };

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _agentId, ...clean } = r as ResourceWithAgent;
        return { ...clean, signals } as ResourceCardProps;
      } catch {
        // Single resource failure — return without signals
        return r;
      }
    }),
  );

  // Strip _agentId from any resources that didn't get signals
  return enriched.map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _agentId, ...clean } = r as ResourceWithAgent;
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

async function mapAgentsToResources(agents: AgentData[]): Promise<ResourceWithAgent[]> {
  // Only show agents with World ID verification (operator_world_id set)
  const verified = agents.filter((a) => !!a.operatorWorldId);
  return Promise.all(verified.map(async (a) => {
    let reputation = 85;
    try {
      const rep = await getReputationSummary(BigInt(a.agentId));
      if (rep.count > 0n) {
        reputation = Math.min(100, Math.max(0, Math.round(Number(rep.summaryValue) / (10 ** rep.decimals))));
      }
    } catch { /* fallback to 85 */ }

    return {
      type: "agent" as const,
      name: a.role
        ? `${a.role.charAt(0).toUpperCase()}${a.role.slice(1)} Agent`
        : `Agent #${a.agentId}`,
      subtitle: a.agentURI || a.type || "AI Agent",
      reputation,
      verified: !!a.operatorWorldId,
      chain: "world" as const,
      price: "0.002 USDC/call",
      verificationType: "world-id" as const,
      _agentId: a.agentId.toString(),
      owner: a.owner,
      active: true,
    };
  }));
}

function mapHumanToResources(humans: OnChainHumanProvider[]): ResourceWithAgent[] {
  return humans.map((h) => ({
    type: "human" as const,
    name: h.skillName,
    subtitle: `${h.skillLevel} · Agent #${h.agentId}`,
    reputation: 80,
    verified: true,
    chain: "world" as const,
    price: h.hourlyRate,
    verificationType: "world-id" as const,
    _agentId: h.agentId,
    owner: h.address,
    active: h.active,
  }));
}

function mapDePINToResources(devices: OnChainDePINDevice[]): ResourceWithAgent[] {
  return devices.map((d) => ({
    type: "depin" as const,
    name: d.deviceName,
    subtitle: `${d.capacity} · ${d.deviceType}`,
    reputation: 75,
    verified: true,
    chain: "hedera" as const,
    price: d.pricePerUnit,
    verificationType: "tee" as const,
    _agentId: d.agentId,
    owner: d.address,
    active: d.active,
  }));
}

// --- Demo seed data (shown when on-chain registries are empty) ---

const DEMO_OWNER = "0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE";

function getDemoAgents(): ResourceWithAgent[] {
  return [
    { type: "agent", name: "Orion", subtitle: "Signal Analysis · World ID Verified", reputation: 95, verified: true, chain: "0g", price: "0.001 USDC/query", verificationType: "world-id", _agentId: "27", owner: DEMO_OWNER, active: true },
    { type: "agent", name: "Vega", subtitle: "Market Maker · World ID Verified", reputation: 90, verified: true, chain: "0g", price: "0.002 USDC/trade", verificationType: "world-id", _agentId: "28", owner: DEMO_OWNER, active: true },
    { type: "agent", name: "Lyra", subtitle: "Compliance Auditor · World ID Verified", reputation: 93, verified: true, chain: "0g", price: "0.001 USDC/check", verificationType: "world-id", _agentId: "29", owner: DEMO_OWNER, active: true },
  ];
}

function getDemoDePIN(): ResourceWithAgent[] {
  return [
    { type: "depin", name: "Tesla Model Y Fleet", subtitle: "Autonomous · 12 vehicles · Los Angeles", reputation: 88, verified: true, chain: "hedera", price: "0.005 USDC/mi", verificationType: "tee", _agentId: "31", owner: DEMO_OWNER, active: true },
    { type: "depin", name: "SkyLens Satellite", subtitle: "30cm resolution · Global coverage", reputation: 84, verified: true, chain: "hedera", price: "0.003 USDC/photo", verificationType: "tee", _agentId: "32", owner: DEMO_OWNER, active: true },
  ];
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

    // Reputation lookup
    let reputation = 75;
    try {
      const rep = await getReputationSummary(BigInt(p.agentId));
      if (rep.count > 0n) {
        reputation = Math.min(100, Math.max(0, Math.round(Number(rep.summaryValue) / (10 ** rep.decimals))));
      }
    } catch { /* fallback */ }

    resources.push({
      type: "gpu" as const,
      name: b?.model || p.gpuModel || "GPU Provider",
      subtitle: b?.url || `${p.teeType} · Agent #${p.agentId}`,
      reputation,
      verified: validated,
      chain: "0g" as const,
      price: "0.005 USDC/call",
      verificationType: "tee" as const,
      _agentId: p.agentId,
      owner: p.address,
      active: p.active,
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
      price: "0.005 USDC/call",
      verificationType: "tee" as const,
    });
  }

  return resources;
}
