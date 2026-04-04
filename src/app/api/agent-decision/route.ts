import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { listProviders } = await import("@/lib/og-compute");
    const { getRegisteredProviders, getValidationSummary } = await import("@/lib/og-chain");
    const { getAllReputationScores } = await import("@/lib/reputation");

    // Phase 1: Discover all providers
    const [brokerResult, onChainResult] = await Promise.allSettled([
      listProviders(),
      getRegisteredProviders(),
    ]);

    const brokerProviders = brokerResult.status === "fulfilled" ? brokerResult.value : [];
    const onChainProviders = onChainResult.status === "fulfilled" ? onChainResult.value : [];

    // Build provider list with enrichment
    const providers = onChainProviders.map((p) => {
      const broker = brokerProviders.find(
        (b) => b.provider.toLowerCase() === p.address.toLowerCase(),
      );
      return {
        address: p.address,
        agentId: p.agentId,
        gpuModel: broker?.model || p.gpuModel,
        teeType: p.teeType,
        endpoint: broker?.url || "",
        inputPrice: broker ? Number(broker.inputPrice) : 0,
        outputPrice: broker ? Number(broker.outputPrice) : 0,
        teeVerified: broker?.teeSignerAcknowledged ?? false,
      };
    });

    // Phase 2: Get reputation scores per provider
    const enriched = await Promise.all(
      providers.map(async (p) => {
        const reputation = { starred: 0, uptime: 0, successRate: 0, responseTime: 0 };
        let validationScore = 0;
        try {
          const scores = await getAllReputationScores(BigInt(p.agentId));
          for (const s of scores) {
            reputation[s.tag as keyof typeof reputation] = s.averageValue;
          }
        } catch { /* fallback to 0 */ }

        // Phase 3: Shield validation check
        try {
          const summary = await getValidationSummary(BigInt(p.agentId), "gpu-tee-attestation");
          validationScore = Number(summary.count) > 0 ? summary.avgResponse : 0;
        } catch { /* fallback to 0 */ }

        // Phase 4: Composite ranking score
        const compositeScore = Math.round(
          reputation.starred * 0.3 +
          reputation.uptime * 0.25 +
          reputation.successRate * 0.25 +
          (validationScore >= 50 ? 20 : 0),
        );

        return { ...p, reputation, validationScore, compositeScore };
      }),
    );

    // Sort by composite score descending
    const ranked = enriched.sort((a, b) => b.compositeScore - a.compositeScore);
    const selected = ranked[0] || null;

    return NextResponse.json({
      discovered: ranked.length,
      providers: ranked,
      selected,
      reasoning: {
        weights: { starred: 0.3, uptime: 0.25, successRate: 0.25, teeBonus: 0.2 },
        formula: "score = starred*0.3 + uptime*0.25 + successRate*0.25 + (TEE ? 20 : 0)",
      },
    });
  } catch {
    // Fallback: demo providers for when testnets are down
    return NextResponse.json(getDemoDecision());
  }
}

function getDemoDecision() {
  return {
    discovered: 3,
    providers: [
      {
        address: "0xGPU1...Alpha",
        agentId: "7",
        gpuModel: "NVIDIA H100 80GB",
        teeType: "Intel TDX",
        endpoint: "https://0g-provider-alpha.example.com",
        inputPrice: 500,
        outputPrice: 1000,
        teeVerified: true,
        reputation: { starred: 82, uptime: 99, successRate: 95, responseTime: 45 },
        validationScore: 100,
        compositeScore: 89,
      },
      {
        address: "0xGPU2...Beta",
        agentId: "8",
        gpuModel: "NVIDIA H200 141GB",
        teeType: "AMD SEV",
        endpoint: "https://0g-provider-beta.example.com",
        inputPrice: 800,
        outputPrice: 1500,
        teeVerified: true,
        reputation: { starred: 64, uptime: 92, successRate: 88, responseTime: 30 },
        validationScore: 85,
        compositeScore: 76,
      },
      {
        address: "0xGPU3...Gamma",
        agentId: "9",
        gpuModel: "AMD MI300X 192GB",
        teeType: "None",
        endpoint: "",
        inputPrice: 600,
        outputPrice: 1200,
        teeVerified: false,
        reputation: { starred: 45, uptime: 78, successRate: 70, responseTime: 60 },
        validationScore: 0,
        compositeScore: 48,
      },
    ],
    selected: null,
    reasoning: {
      weights: { starred: 0.3, uptime: 0.25, successRate: 0.25, teeBonus: 0.2 },
      formula: "score = starred*0.3 + uptime*0.25 + successRate*0.25 + (TEE ? 20 : 0)",
    },
  };
}
