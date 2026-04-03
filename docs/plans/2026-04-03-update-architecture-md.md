# Update ARCHITECTURE.md to Reflect Actual Codebase

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sync ARCHITECTURE.md's Project Structure section with the actual files built during Waves 1-3.

**Architecture:** Single-file documentation update. Three tree sections need updating: `app/api/` routes, `lib/` files, and `components/`. The actual codebase has grown beyond what was documented — 15 API routes (was 8), 12 lib files (was 8), 17 components (was 8). No code changes, docs only.

**Tech Stack:** Markdown

---

## Pre-flight

**Agent 4 owns:** `agents/*`, `package.json`, `hardhat.config.ts`, `.env.example`, `app/layout.tsx`, `app/page.tsx`

ARCHITECTURE.md is a shared doc. Check ACTIVE_WORK.md to confirm no other agent is editing it before starting.

---

### Task 1: Update the `app/` tree — add route groups + missing API routes

**Files:**
- Modify: `docs/ARCHITECTURE.md:28-61`

**Step 1: Replace the `app/` section of the Project Structure tree**

Replace lines 28-61 (the `app/` subtree inside the `vocaid-hub/` code block) with:

```
vocaid-hub/
├── app/                       # Next.js 15 App Router
│   ├── layout.tsx             # Root layout with MiniKit provider
│   ├── page.tsx               # Landing / entry point
│   ├── (protected)/           # Auth-gated route group
│   │   ├── layout.tsx         # World ID session check
│   │   ├── home/
│   │   │   └── page.tsx       # Marketplace (ISR 30s)
│   │   ├── predictions/
│   │   │   └── page.tsx       # Prediction markets (ISR 10s)
│   │   └── profile/
│   │       └── page.tsx       # User profile + agent fleet (SSR)
│   ├── gpu-verify/
│   │   └── page.tsx           # GPU provider portal (SSR)
│   ├── .well-known/
│   │   └── agent-card.json/   # A2A agent card endpoint (ERC-8004)
│   └── api/                   # Server-side API routes (holds keys)
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts   # NextAuth session provider
│       ├── verify-proof/
│       │   └── route.ts       # World ID proof validation
│       ├── world-id/
│       │   └── check/
│       │       └── route.ts   # World ID status check
│       ├── rp-signature/
│       │   └── route.ts       # RP signature for World ID
│       ├── gpu/
│       │   ├── register/
│       │   │   └── route.ts   # GPU provider ERC-8004 registration
│       │   └── list/
│       │       └── route.ts   # List verified providers
│       ├── payments/
│       │   └── route.ts       # Hedera x402 via Blocky402
│       ├── initiate-payment/
│       │   └── route.ts       # MiniKit payment initiation
│       ├── hedera/
│       │   └── audit/
│       │       └── route.ts   # HCS audit trail via Mirror Node
│       ├── predictions/
│       │   ├── route.ts       # List/create markets
│       │   └── [id]/
│       │       └── bet/
│       │           └── route.ts # Place bet
│       ├── agents/
│       │   ├── register/
│       │   │   └── route.ts   # AgentKit registration
│       │   └── route.ts       # List agents
│       ├── reputation/
│       │   └── route.ts       # Query reputation scores
│       └── resources/
│           └── route.ts       # Unified resource listing
```

**Step 2: Verify the edit is correct**

Run: `grep -c "route.ts" docs/ARCHITECTURE.md`
Expected: 15 (matching the 15 actual route files)

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: update ARCHITECTURE.md app/ tree with actual routes and route groups"
```

---

### Task 2: Update the `lib/` tree — add 4 missing files

**Files:**
- Modify: `docs/ARCHITECTURE.md:63-71`

**Step 1: Replace the `lib/` section**

Replace the `lib/` subtree (lines 63-71) with:

```
├── lib/                       # Shared server utilities
│   ├── hedera.ts              # @hashgraph/sdk wrapper (HTS, HCS, scheduled tx)
│   ├── hedera-agent.ts        # Hedera Agent Kit (HederaAIToolkit wrapper)
│   ├── blocky402.ts           # x402 facilitator client
│   ├── og-chain.ts            # 0G Chain interactions (ethers + ERC-8004)
│   ├── og-compute.ts          # 0G inference broker SDK
│   ├── og-broker.ts           # 0G broker types + helpers
│   ├── og-storage.ts          # 0G Storage KV for agent state
│   ├── agentkit.ts            # World AgentKit registration (ERC-8004)
│   ├── world-id.ts            # World ID verification + auth gate
│   ├── reputation.ts          # ERC-8004 ReputationRegistry queries
│   ├── contracts.ts           # Contract ABIs + addresses from deployments/
│   └── types.ts               # Shared TypeScript types
```

**Step 2: Verify the edit is correct**

Run: `ls src/lib/*.ts | wc -l`
Expected: 12 (matching the 12 files in the tree)

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: update ARCHITECTURE.md lib/ tree with Wave 2-3 additions"
```

---

### Task 3: Update the `components/` tree — add 9 missing entries

**Files:**
- Modify: `docs/ARCHITECTURE.md:73-81`

**Step 1: Replace the `components/` section**

Replace the `components/` subtree (lines 73-81) with:

```
├── components/                # React components (see DESIGN_SYSTEM.md)
│   ├── ResourceCard.tsx       # Resource listing card with chain badge
│   ├── ResourceCardSkeleton.tsx # Loading skeleton for ResourceCard
│   ├── ChainBadge.tsx         # World/0G/Hedera chain indicator
│   ├── ReputationBar.tsx      # ERC-8004 reputation score bar
│   ├── VerificationStatus.tsx # TEE/World ID verification badge
│   ├── PredictionCard.tsx     # Prediction market card with bet UI
│   ├── PaymentConfirmation.tsx # x402 payment receipt
│   ├── AgentCard.tsx          # OpenClaw agent identity card
│   ├── GPUStepper.tsx         # GPU provider registration stepper
│   ├── Navigation/            # Bottom tab navigation (World App)
│   ├── PageLayout/            # Page wrapper with header
│   ├── AuthButton/            # World ID auth trigger
│   ├── Pay/                   # MiniKit pay command wrapper
│   ├── Verify/                # MiniKit verify command wrapper
│   ├── Transaction/           # Transaction status display
│   ├── UserInfo/              # User profile header
│   └── ViewPermissions/       # Permission gate UI
```

**Step 2: Verify the edit is correct**

Run: `ls src/components/ | wc -l`
Expected: 17 (matching the 17 entries in the tree)

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: update ARCHITECTURE.md components/ tree with Wave 2-3 additions"
```

---

### Task 4: Add `shield-check.md` to the skills tree

**Files:**
- Modify: `docs/ARCHITECTURE.md:111-115`

**Step 1: Add the missing skill file**

The `agents/skills/` section (line 111-115) is missing `shield-check.md`. Add it:

```
│   └── skills/                # Custom skills (shared)
│       ├── nanopayments.md
│       ├── reputation.md
│       ├── prediction.md
│       ├── shield-check.md
│       └── og-storage.md
```

**Step 2: Verify**

Run: `ls agents/skills/`
Expected: 5 files including `shield-check.md`

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: add shield-check.md to ARCHITECTURE.md skills tree"
```

---

## Post-flight

After all 4 tasks, verify:
- `grep -c "route.ts" docs/ARCHITECTURE.md` → 15
- `grep "hedera-agent.ts\|agentkit.ts\|og-broker.ts\|reputation.ts" docs/ARCHITECTURE.md` → 4 lines
- `grep "Navigation/\|AuthButton/\|Pay/" docs/ARCHITECTURE.md` → 3 lines
- Build still passes: `npx next build` (docs change only, should not break)
