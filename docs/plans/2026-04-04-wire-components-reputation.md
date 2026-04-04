# Wire Orphaned Components + Reputation Signals — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire three orphaned components (ReputationSignals, AgentCard, VerificationStatus) into their respective pages and enhance the resources API with reputation signal data.

**Architecture:** All components exist and are production-ready. All lib functions exist. All contracts deployed. This plan is purely wiring — no new infrastructure. Every API route already imports the correct lib modules.

**Tech Stack:** Next.js 15 App Router, TypeScript, ERC-8004 ReputationRegistry on 0G Chain (chainId 16602), ethers v6, viem.

**Repo:** `/Users/ale.fonseca/Documents/Vocaid/vocaid-hub`

---

### Task 1: Wire VerificationStatus into ResourceCard

**Files:**
- Modify: `src/components/ResourceCard.tsx`

**Step 1: Read current ResourceCard to find where badge should go**

Check the component — it already has `verified: boolean` and `verificationType?: VerificationType` props but doesn't render `VerificationStatus`.

Run: `grep -n "verified\|VerificationType\|VerificationStatus" src/components/ResourceCard.tsx`

**Step 2: Add VerificationStatus import and render**

The component already imports from `./VerificationStatus`. Find where the `verified` prop is used (or not used) and add the badge next to the chain badge.

Add inside the card header area (near `ChainBadge`):

```tsx
{verified && (
  <VerificationStatus
    verified={verified}
    type={verificationType || 'tee'}
  />
)}
```

**Step 3: Verify it compiles**

Run: `cd /Users/ale.fonseca/Documents/Vocaid/vocaid-hub && npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors (or only pre-existing ones)

**Step 4: Commit**

```bash
git add src/components/ResourceCard.tsx
git commit -m "feat(app): wire VerificationStatus badge into ResourceCard"
```

---

### Task 2: Enhance /api/resources with reputation signal data

**Files:**
- Modify: `src/app/api/resources/route.ts`

**Step 1: Read current resources route**

Run: `cat src/app/api/resources/route.ts`

Check what shape it returns. The route already calls `getRegisteredProviders()` and `listRegisteredAgents()`. Check if it includes reputation data or just identity.

**Step 2: Add reputation signal fetching**

Import `getReputationSummary` from `@/lib/og-chain` (already available).

For each resource, fetch multiple reputation tags:

```typescript
async function getSignalsForResource(agentId: bigint): Promise<ResourceSignals> {
  const [quality, uptime, latency, successRate] = await Promise.allSettled([
    getReputationSummary(agentId, "starred", ""),
    getReputationSummary(agentId, "uptime", ""),
    getReputationSummary(agentId, "responseTime", ""),
    getReputationSummary(agentId, "successRate", ""),
  ]);

  return {
    quality: quality.status === 'fulfilled' && quality.value.count > 0
      ? { value: Number(quality.value.averageValue), unit: 'score' }
      : undefined,
    uptime: uptime.status === 'fulfilled' && uptime.value.count > 0
      ? { value: Number(uptime.value.averageValue), unit: '%', tag2: '30d' }
      : undefined,
    latency: latency.status === 'fulfilled' && latency.value.count > 0
      ? { value: Number(latency.value.averageValue), unit: 'ms', tag2: 'p50' }
      : undefined,
  };
}
```

Call this for each resource in the response mapper. Add `signals` field to the response.

**Step 3: Add sort parameter**

Parse `?sort=quality|cost|latency|uptime` from URL searchParams. Sort the resources array before returning.

```typescript
const sortBy = searchParams.get('sort') || 'quality';
resources.sort((a, b) => {
  const aVal = a.signals?.[sortBy]?.value ?? 0;
  const bVal = b.signals?.[sortBy]?.value ?? 0;
  return sortBy === 'latency' || sortBy === 'cost' ? aVal - bVal : bVal - aVal;
});
```

**Step 4: Add type parameter**

Parse `?type=gpu|agent|human` from URL searchParams. Filter resources before returning.

**Step 5: Verify API returns signals**

Run: `curl -s http://localhost:3000/api/resources | node -e "const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{const d=JSON.parse(Buffer.concat(c));console.log('Count:',d.resources?.length);console.log('First signals:',JSON.stringify(d.resources?.[0]?.signals))})"`

Expected: Resources with `signals` object containing quality/uptime/latency values (may be empty if no reputation data written yet).

**Step 6: Commit**

```bash
git add src/app/api/resources/route.ts
git commit -m "feat(api): add reputation signals + sort/filter to /api/resources"
```

---

### Task 3: Wire AgentCard into Profile page

**Files:**
- Modify: `src/app/(protected)/profile/profile-content.tsx` (or equivalent profile page)
- Reference: `src/components/AgentCard.tsx`

**Step 1: Find the profile page file**

Run: `find src -path "*profile*" -name "*.tsx" | sort`

**Step 2: Read AgentCard props**

Run: `grep -A 10 "interface AgentCardProps" src/components/AgentCard.tsx`

**Step 3: Read current profile page agent rendering**

Look for how agents are currently displayed. Replace inline rendering with `AgentCard` component.

**Step 4: Import and wire AgentCard**

```tsx
import { AgentCard } from '@/components/AgentCard';

// In the agents section of the profile page:
{agents.map((agent) => (
  <AgentCard
    key={agent.name}
    name={agent.name}
    role={agent.role}
    agentId={agent.agentId}
    reputation={agent.reputation}
    chain="0g"
    verified={true}
    verificationType="agentkit"
    operatorWorldId={worldIdHash}
  />
))}
```

Adapt props to match what AgentCard actually expects (check Step 2).

**Step 5: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 6: Commit**

```bash
git add src/app/\(protected\)/profile/
git commit -m "feat(app): wire AgentCard component into Profile page"
```

---

### Task 4: Build seed demo data script

**Files:**
- Create: `scripts/seed-demo-data.ts`

**Step 1: Write the seed script**

The script should:

1. Register 2 GPU providers on GPUProviderRegistry:
   - "GPU-Alpha" — H100, EU region, $0.04/1K tokens
   - "GPU-Beta" — H200, US region, $0.06/1K tokens

2. Write reputation feedback for each via ReputationRegistry:
   - GPU-Alpha: quality 87, uptime 99.2, responseTime 120
   - GPU-Beta: quality 92, uptime 98.5, responseTime 85

3. Create 2 prediction markets via ResourcePrediction:
   - "Will H100 inference cost drop below $0.03/1K tokens by May 2026?"
   - "Will GPU provider count exceed 50 by June 2026?"

4. Log all operations to HCS audit trail

```typescript
import { ethers } from "ethers";
import { Client, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ... implementation using deployed contract addresses from deployments/0g-galileo.json
```

**Step 2: Add npm script**

In package.json, add: `"seed": "npx ts-node --esm scripts/seed-demo-data.ts"`

**Step 3: Test seed script (dry run)**

Run: `npx ts-node scripts/seed-demo-data.ts --dry-run`
Expected: Logs what it would do without submitting transactions

**Step 4: Commit**

```bash
git add scripts/seed-demo-data.ts package.json
git commit -m "feat(demo): add seed data script for 2 providers + 2 markets + reputation"
```

---

### Task 5: Build verification

**Step 1: Type check**

Run: `cd /Users/ale.fonseca/Documents/Vocaid/vocaid-hub && npx tsc --noEmit 2>&1 | tail -20`
Expected: No new errors

**Step 2: Build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds, all pages compiled

**Step 3: Lint**

Run: `npm run lint 2>&1 | tail -10`
Expected: No new lint errors

**Step 4: Push**

```bash
git push origin main
```

**Step 5: Check Vercel deployment**

Run: `vercel ls 2>&1 | head -3`
Expected: Latest deployment shows ● Ready

---

### Execution Order

Tasks 1, 2, 3 are independent — can be done in any order.
Task 4 depends on deployed contracts (already done).
Task 5 runs after all others.

**Estimated time:** ~45 minutes total (Tasks 1-3: 10 min each, Task 4: 15 min)
