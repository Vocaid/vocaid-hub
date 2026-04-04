import { NextResponse } from "next/server";

export const revalidate = 10;

export async function GET() {
  try {
    // Fetch ALL resource types (GPU, Agent, Human, DePIN) from unified endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resourcesRes = await fetch(`${baseUrl}/api/resources?sort=quality`, {
      next: { revalidate: 10 },
    });

    if (!resourcesRes.ok) {
      return NextResponse.json(getDemoDecision());
    }

    const data = await resourcesRes.json();
    const resources = data.resources ?? data ?? [];

    if (!Array.isArray(resources) || resources.length === 0) {
      return NextResponse.json(getDemoDecision());
    }

    // Map resources to provider format for AgentDecisionContent
    const providers = resources.map((r: Record<string, unknown>, i: number) => {
      const signals = r.signals as Record<string, { value: number }> | undefined;
      const reputation = {
        starred: signals?.quality?.value ?? (r.reputation as number) ?? 0,
        uptime: signals?.uptime?.value ?? 0,
        successRate: 0,
        responseTime: signals?.latency?.value ?? 0,
      };

      const validationScore = r.verified ? 80 : 0;
      const compositeScore = Math.round(
        reputation.starred * 0.3 +
        reputation.uptime * 0.25 +
        reputation.successRate * 0.25 +
        (validationScore >= 50 ? 20 : 0),
      );

      return {
        address: `${r.type}-${i}`,
        agentId: String(i + 1),
        gpuModel: (r.subtitle as string) || (r.name as string) || "Unknown",
        teeType: r.verified ? "Verified" : "Unverified",
        teeVerified: Boolean(r.verified),
        reputation,
        validationScore,
        compositeScore,
        resourceType: r.type as string,
        resourceName: r.name as string,
        price: r.price as string,
      };
    });

    const ranked = providers.sort(
      (a: { compositeScore: number }, b: { compositeScore: number }) =>
        b.compositeScore - a.compositeScore,
    );

    return NextResponse.json({
      discovered: ranked.length,
      providers: ranked,
      selected: ranked[0] || null,
      reasoning: {
        weights: { starred: 0.3, uptime: 0.25, successRate: 0.25, teeBonus: 0.2 },
        formula: "score = quality*0.3 + uptime*0.25 + successRate*0.25 + (verified ? 20 : 0)",
      },
    });
  } catch {
    return NextResponse.json(getDemoDecision());
  }
}

function getDemoDecision() {
  return {
    discovered: 7,
    providers: [
      { address: "agent-0", agentId: "27", gpuModel: "Orion · Signal Analysis", teeType: "AgentKit", teeVerified: true, reputation: { starred: 95, uptime: 99, successRate: 98, responseTime: 45 }, validationScore: 90, compositeScore: 91, resourceType: "agent", resourceName: "Orion", price: "$0.001/query" },
      { address: "gpu-0", agentId: "25", gpuModel: "Nebula-H100 · EU Frankfurt", teeType: "Intel TDX", teeVerified: true, reputation: { starred: 87, uptime: 99, successRate: 95, responseTime: 120 }, validationScore: 100, compositeScore: 89, resourceType: "gpu", resourceName: "Nebula-H100", price: "$0.004/1K tok" },
      { address: "human-0", agentId: "29", gpuModel: "Camila Torres · Rust L4", teeType: "World ID", teeVerified: true, reputation: { starred: 91, uptime: 0, successRate: 88, responseTime: 0 }, validationScore: 80, compositeScore: 75, resourceType: "human", resourceName: "Camila Torres", price: "$0.005/min" },
      { address: "depin-0", agentId: "31", gpuModel: "Helios Solar Farm · 50kW", teeType: "TEE", teeVerified: true, reputation: { starred: 85, uptime: 97, successRate: 90, responseTime: 0 }, validationScore: 75, compositeScore: 72, resourceType: "depin", resourceName: "Helios Solar Farm", price: "$0.008/kWh" },
      { address: "human-1", agentId: "30", gpuModel: "Yuki Tanaka · Solidity L5", teeType: "World ID", teeVerified: true, reputation: { starred: 88, uptime: 0, successRate: 85, responseTime: 0 }, validationScore: 80, compositeScore: 70, resourceType: "human", resourceName: "Yuki Tanaka", price: "$0.008/min" },
      { address: "depin-1", agentId: "32", gpuModel: "GridPulse Energy · 200kW", teeType: "TEE", teeVerified: true, reputation: { starred: 79, uptime: 95, successRate: 87, responseTime: 0 }, validationScore: 70, compositeScore: 66, resourceType: "depin", resourceName: "GridPulse Energy", price: "$0.002/kWh" },
      { address: "depin-2", agentId: "33", gpuModel: "Tesla Model Y Fleet · LA", teeType: "TEE", teeVerified: true, reputation: { starred: 88, uptime: 92, successRate: 94, responseTime: 0 }, validationScore: 85, compositeScore: 78, resourceType: "depin", resourceName: "Tesla Model Y Fleet", price: "$0.005/mi" },
    ],
    selected: null,
    reasoning: {
      weights: { starred: 0.3, uptime: 0.25, successRate: 0.25, teeBonus: 0.2 },
      formula: "score = quality*0.3 + uptime*0.25 + successRate*0.25 + (verified ? 20 : 0)",
    },
  };
}
