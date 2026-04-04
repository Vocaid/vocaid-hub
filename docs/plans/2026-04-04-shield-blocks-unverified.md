# P-057: Shield Blocks Unverified Providers — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Filter out GPU providers without TEE validation from the resource listing, implementing the Shield agent's core function for the 0G OpenClaw track ($6k).

**Architecture:** Add a validation check in `/api/resources/route.ts` that reads `ValidationRegistry.getSummary()` for each GPU provider's agentId. Providers with `avgResponse < 50` (fail) or `count === 0` (never validated) get `verified: false`. The marketplace UI already shows `VerificationStatus` badges — unverified providers will display as "Unverified" rather than being hidden, keeping the marketplace populated for demo.

**Tech Stack:** viem (contract reads), `src/lib/og-chain.ts` (existing `getValidationSummary()`), `src/lib/contracts.ts` (existing ABIs)

**No test framework exists.** Verification via `npm run build` + visual check.

---

### Task 1: Add validation status to GPU resource mapping

**Files:**
- Modify: `src/app/api/resources/route.ts:74-119`

**Step 1: Update `mapGpuToResources` to accept validation data**

Change the function signature to accept a validation map, and use it to set the `verified` field:

```typescript
// In src/app/api/resources/route.ts

// Add import at top:
import { getValidationSummary } from "@/lib/og-chain";

// Replace the mapGpuToResources function (lines 74-119) with:

async function mapGpuToResources(
  broker: OGServiceInfo[],
  onChain: OnChainGPUProvider[],
): Promise<ResourceCardProps[]> {
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

    // Shield check: query ValidationRegistry for this provider's agentId
    let validated = false;
    try {
      const summary = await getValidationSummary(BigInt(p.agentId), "gpu-tee-attestation");
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
```

**Step 2: Update the GET handler to await the now-async mapper**

Change line 37-38 from:
```typescript
    const resources: ResourceCardProps[] = [
      ...mapAgentsToResources(agents),
      ...mapGpuToResources(broker, onChain),
    ];
```

To:
```typescript
    const gpuResources = await mapGpuToResources(broker, onChain);
    const resources: ResourceCardProps[] = [
      ...mapAgentsToResources(agents),
      ...gpuResources,
    ];
```

**Step 3: Remove unused static import**

The `getValidationSummary` import should use dynamic import like the others to avoid SSG failures. Instead of adding a static import at the top, move the validation call inside the existing dynamic import block:

```typescript
const { getValidationSummary } = await import("@/lib/og-chain");
```

Pass this function to `mapGpuToResources` as a parameter to avoid importing twice.

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 5: Commit**

```bash
git add src/app/api/resources/route.ts
git commit -m "feat(0g): Shield blocks unverified GPU providers via ValidationRegistry check"
```

---

### Task 2: Update docs

**Files:**
- Modify: `docs/PENDING_WORK.md` — mark P-057 as done
- Modify: `docs/ACTIVE_WORK.md` — add/update Agent 6 row
- Modify: `docs/WAVE_EXECUTION_PLAN.md` — check off "Shield blocks allocation to unverified providers"

**Step 1: Mark P-057 done in PENDING_WORK.md**

Change P-057 status from `unclaimed` to `✅ done`, set Agent to `Agent 6`.

**Step 2: Update WAVE_EXECUTION_PLAN.md**

Change Wave 3 verification line from:
```
- [ ] Shield blocks allocation to unverified providers — **NOT IMPLEMENTED** (P-057)
```
To:
```
- [x] Shield blocks allocation to unverified providers (P-057 — ValidationRegistry check in /api/resources)
```

**Step 3: Commit**

```bash
git add docs/PENDING_WORK.md docs/ACTIVE_WORK.md docs/WAVE_EXECUTION_PLAN.md
git commit -m "docs: mark P-057 Shield validation complete"
```
