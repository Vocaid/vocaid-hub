# Fix /api/resources Self-Fetch + Add On-Chain GPU Provider Listing

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix P-055 (resources route self-fetches gated routes) and P-056 (add on-chain GPU provider reading from GPUProviderRegistry).

**Architecture:** Replace the HTTP self-fetch in `/api/resources` with direct function imports — same pattern as the `/api/agents` route. Add a `getRegisteredProviders()` function to `og-chain.ts` that reads from the on-chain GPUProviderRegistry, then merge broker + on-chain data in the resources route.

**Tech Stack:** viem (readContract), GPUProviderRegistry ABI, og-chain.ts public client

---

### Task 1: Add `getRegisteredProviders()` to og-chain.ts

**Files:**
- Modify: `src/lib/og-chain.ts`

**Step 1: Add the GPU provider ABI subset and query function**

Add at the bottom of `src/lib/og-chain.ts`:

```typescript
// --- GPU Provider Registry reads ---

const GPU_PROVIDER_REGISTRY_ABI = [
  {
    name: "getActiveProviders",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "active", type: "address[]" }],
  },
  {
    name: "getProvider",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [
      {
        components: [
          { name: "agentId", type: "uint256" },
          { name: "gpuModel", type: "string" },
          { name: "teeType", type: "string" },
          { name: "attestationHash", type: "bytes32" },
          { name: "registeredAt", type: "uint256" },
          { name: "active", type: "bool" },
        ],
        type: "tuple",
      },
    ],
  },
] as const;

export interface OnChainGPUProvider {
  address: string;
  agentId: string;
  gpuModel: string;
  teeType: string;
  registeredAt: number;
  active: boolean;
}

export async function getRegisteredProviders(): Promise<OnChainGPUProvider[]> {
  const client = getPublicClient();
  const registryAddr = addresses.gpuProviderRegistry();

  const activeAddrs = await client.readContract({
    address: registryAddr,
    abi: GPU_PROVIDER_REGISTRY_ABI,
    functionName: "getActiveProviders",
  }) as readonly `0x${string}`[];

  const providers = await Promise.all(
    activeAddrs.map(async (addr) => {
      const data = await client.readContract({
        address: registryAddr,
        abi: GPU_PROVIDER_REGISTRY_ABI,
        functionName: "getProvider",
        args: [addr],
      }) as { agentId: bigint; gpuModel: string; teeType: string; attestationHash: string; registeredAt: bigint; active: boolean };

      return {
        address: addr,
        agentId: data.agentId.toString(),
        gpuModel: data.gpuModel,
        teeType: data.teeType,
        registeredAt: Number(data.registeredAt),
        active: data.active,
      };
    }),
  );

  return providers;
}
```

**Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build passes

**Step 3: Commit**

```bash
git add src/lib/og-chain.ts
git commit -m "feat(0g): add getRegisteredProviders() to read from GPUProviderRegistry on-chain"
```

---

### Task 2: Rewrite /api/resources to use direct imports (fix P-055)

**Files:**
- Modify: `src/app/api/resources/route.ts`

**Step 1: Replace self-fetch with direct function calls**

Replace the entire file content with:

```typescript
import { NextResponse } from "next/server";
import { requireWorldId } from "@/lib/world-id";
import { listRegisteredAgents } from "@/lib/agentkit";
import { listProviders } from "@/lib/og-compute";
import { getRegisteredProviders } from "@/lib/og-chain";
import type { ResourceCardProps } from "@/components/ResourceCard";

/**
 * GET /api/resources
 *
 * Unified resource listing — aggregates agents + GPU providers.
 * Calls library functions directly (no self-fetch to other API routes).
 * Gated behind World ID verification.
 */
export async function GET() {
  const gate = await requireWorldId();
  if (gate instanceof NextResponse) return gate;

  try {
    // Fetch from both sources in parallel
    const [agentsResult, brokerProviders, onChainProviders] = await Promise.allSettled([
      listRegisteredAgents(),
      listProviders(),
      getRegisteredProviders(),
    ]);

    const agents = agentsResult.status === "fulfilled" ? agentsResult.value : [];
    const broker = brokerProviders.status === "fulfilled" ? brokerProviders.value : [];
    const onChain = onChainProviders.status === "fulfilled" ? onChainProviders.value : [];

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
  agentId: string;
  owner: string;
  agentURI: string;
  wallet: string;
  operatorWorldId: string;
  role: string;
  type: string;
}

interface BrokerProvider {
  provider: string;
  model?: string;
  url?: string;
  teeSignerAcknowledged?: boolean;
}

interface OnChainProvider {
  address: string;
  agentId: string;
  gpuModel: string;
  teeType: string;
  active: boolean;
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

function mapGpuToResources(broker: BrokerProvider[], onChain: OnChainProvider[]): ResourceCardProps[] {
  // Merge: use on-chain data as base, enrich with broker data where available
  const brokerByAddr = new Map(broker.map((b) => [b.provider.toLowerCase(), b]));
  const seen = new Set<string>();

  const resources: ResourceCardProps[] = [];

  // On-chain providers first (these are registered via our stepper)
  for (const p of onChain) {
    const addr = p.address.toLowerCase();
    seen.add(addr);
    const b = brokerByAddr.get(addr);

    resources.push({
      type: "gpu" as const,
      name: b?.model || p.gpuModel || "GPU Provider",
      subtitle: b?.url || `${p.teeType} · Agent #${p.agentId}`,
      reputation: 75,
      verified: b?.teeSignerAcknowledged ?? true, // on-chain = verified
      chain: "0g" as const,
      price: "$0.05/call",
      verificationType: "tee" as const,
    });
  }

  // Broker-only providers (not yet registered via our stepper)
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
```

**Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build passes

**Step 3: Commit**

```bash
git add src/app/api/resources/route.ts
git commit -m "fix(api): replace self-fetch in /api/resources with direct imports (P-055)

/api/resources was fetching /api/gpu/list and /api/agents via HTTP,
but those routes require World ID — internal server-side fetch lacks
session cookies. Now calls listProviders(), listRegisteredAgents(),
and getRegisteredProviders() directly. Also merges broker + on-chain
GPU data to fix P-056."
```

---

### Task 3: Update PENDING_WORK.md

**Files:**
- Modify: `docs/PENDING_WORK.md`

**Step 1: Mark P-055 and P-056 as done**

Find the P-055 and P-056 rows and update status to `✅ done` with Agent 5.

**Step 2: Commit**

```bash
git add docs/PENDING_WORK.md
git commit -m "docs: mark P-055 and P-056 as done"
```

---

### Verification

| Check | Command | Expected |
|-------|---------|----------|
| Build passes | `npm run build 2>&1 \| tail -5` | 23+ routes, no errors |
| No self-fetch | `grep -n "fetch.*api/gpu" src/app/api/resources/route.ts` | No matches |
| Direct imports | `grep -n "listProviders\|getRegisteredProviders\|listRegisteredAgents" src/app/api/resources/route.ts` | 3 imports found |
| On-chain function exists | `grep -n "getRegisteredProviders" src/lib/og-chain.ts` | Function exported |
| PENDING_WORK updated | `grep "P-055\|P-056" docs/PENDING_WORK.md` | Both show "done" |
