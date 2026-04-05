# Agents Page Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix broken lease/bet flows (remove API key from browser routes), persist API key state on the Agents page, remove duplicate cards, rename tab, and configure OpenClaw agent with user's API key.

**Architecture:** Remove `requireApiKey` from 4 browser-initiated Fastify routes. Add `useEffect` to load existing key status on mount. Clean up duplicate rendering in profile-content.tsx. Rename nav tab. Set API key in OpenClaw config.

**Tech Stack:** Fastify, React (useEffect + useSession), Next.js Navigation component

---

### Task 1: Remove requireApiKey from browser routes (URGENT)

**Files:**
- Modify: `server/routes/predictions.ts` (lines 90, 134)
- Modify: `server/routes/payments.ts` (lines 34, 147)

**Step 1: Remove from predictions.ts**

Line 90 — find:
```
{ schema: { body: CreateMarketSchema }, preHandler: [app.requireApiKey] },
```
Replace with:
```
{ schema: { body: CreateMarketSchema } },
```

Line 134 — find:
```
{ schema: { params: MarketIdParamsSchema, body: PlaceBetSchema }, preHandler: [app.requireApiKey] },
```
Replace with:
```
{ schema: { params: MarketIdParamsSchema, body: PlaceBetSchema } },
```

**Step 2: Remove from payments.ts**

Line 34 — delete the entire line:
```
    preHandler: [app.requireApiKey],
```

Line 147 — delete the entire line:
```
    preHandler: [app.requireApiKey],
```

**Step 3: Commit**

```bash
git add server/routes/predictions.ts server/routes/payments.ts
git commit -m "fix: remove requireApiKey from browser-initiated routes (lease + bet)"
```

---

### Task 2: Persist ConnectAgentSection state on mount

**Files:**
- Modify: `src/components/ConnectAgentSection.tsx`

**Step 1: Add useEffect import**

Line 3 — change:
```typescript
import { useState } from 'react';
```
to:
```typescript
import { useState, useEffect } from 'react';
```

**Step 2: Add useEffect after state declarations**

After line 25 (`const [copied, setCopied] = useState(false);`), add:

```typescript
  // Load existing key status on mount (persist across navigation)
  useEffect(() => {
    if (!walletAddress) return;
    fetch(`/api/keys/status?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.maskedKey) setMaskedKey(data.maskedKey);
      })
      .catch(() => {});
  }, [walletAddress]);
```

**Step 3: Commit**

```bash
git add src/components/ConnectAgentSection.tsx
git commit -m "fix: persist ConnectAgentSection state — load existing key on mount"
```

---

### Task 3: Remove duplicate agent cards

**Files:**
- Modify: `src/app/(protected)/profile/profile-content.tsx`

**Step 1: Delete lines 102-116**

Remove the entire `{fleetAgents.length > 0 && (...)}` block:

```typescript
      {fleetAgents.length > 0 && (
        <div className="flex flex-col gap-3">
          {fleetAgents.map((agent) => (
            <AgentCard
              key={agent.agentId}
              name={ROLE_NAMES[agent.role] ?? agent.role}
              role={(agent.role as AgentRole) ?? 'discovery'}
              agentId={agent.agentId}
              operatorWorldId={agent.operatorWorldId}
              reputation={75}
              verified={!!agent.operatorWorldId}
            />
          ))}
        </div>
      )}
```

The `DeployFleetSection` at line 100 already shows all fleet agents with deploy/deployed status.

**Step 2: Commit**

```bash
git add src/app/\(protected\)/profile/profile-content.tsx
git commit -m "fix: remove duplicate agent cards — DeployFleetSection already shows fleet"
```

---

### Task 4: Rename Profile tab to Agents

**Files:**
- Modify: `src/components/Navigation/index.tsx`

**Step 1: Change tab label**

Line 11 — find:
```typescript
  { value: '/profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
```
Replace with:
```typescript
  { value: '/profile', icon: <User className="w-5 h-5" />, label: 'Agents' },
```

**Step 2: Commit**

```bash
git add src/components/Navigation/index.tsx
git commit -m "fix(ui): rename Profile tab to Agents"
```

---

### Task 5: Set API key on OpenClaw agents

**Files:**
- Modify: `agents/openclaw.json`

**Step 1: Add headers to gateway config**

After line 10 (`"maxRequests": 30`), inside the `"gateway"` block, add:

```json
    "defaultHeaders": {
      "X-API-Key": "voc_x2vTJepH5Lctx3kKcCtk-sQwT9-ehSwc"
    }
```

Note: If `defaultHeaders` is not a supported OpenClaw gateway config field, the alternative is to set it per-agent in the soul.md files or as an environment variable.

**Step 2: Commit**

```bash
git add agents/openclaw.json
git commit -m "feat: configure OpenClaw agents with Vocaid Hub API key"
```

---

### Task 6: Build + Push + Deploy

**Step 1: Build**

```bash
pkill -f "next dev" 2>/dev/null; rm -rf .next node_modules/.cache; npx next build
```

**Step 2: Push**

```bash
git push origin main
```

---

## Verification

1. Bottom nav shows "Agents" tab (not "Profile")
2. Market → tap "Lease" → payment works (no X-API-Key error)
3. Predictions → tap bet → bet works
4. Agents page → ConnectAgentSection shows "Active API Key: voc_xxxx...xx" on return visit
5. No duplicate agent cards below Deploy Fleet section
6. `npx next build` passes
