# Doc Consistency Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all documentation discrepancies found across README.md, ARCHITECTURE.md, PENDING_WORK.md, and WAVE_EXECUTION_PLAN.md.

**Architecture:** Doc-only changes across 4 files. No code modifications. Fixes: ghost components in ARCHITECTURE.md, missing `/api/seer/inference` route in README + ARCHITECTURE, duplicate P-054, stale library entries in WAVE_EXECUTION_PLAN, and README lib/route count mismatches.

**Tech Stack:** Markdown

---

## Issues Found (8 total)

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | 4 ghost components in ARCHITECTURE.md (Pay/, Transaction/, UserInfo/, ViewPermissions/) | ARCHITECTURE.md | HIGH |
| 2 | `/api/seer/inference` missing from README API table + ARCHITECTURE route tree | README.md, ARCHITECTURE.md | HIGH |
| 3 | README lib/ section lists only 6 of 14 files | README.md | MEDIUM |
| 4 | README route count says "17" — actual is 18 | README.md | MEDIUM |
| 5 | P-054 duplicates P-063 (demo video) | PENDING_WORK.md | MEDIUM |
| 6 | Duplicate `@hashgraph/sdk` row in library table | WAVE_EXECUTION_PLAN.md | MEDIUM |
| 7 | `skills/prediction.md` still says `ResourcePrediction.createMarket()` | WAVE_EXECUTION_PLAN.md | LOW |
| 8 | README missing `CreateMarketModal.tsx` in components | README.md | LOW |

---

### Task 1: Fix ARCHITECTURE.md — remove ghost components + add seer route

**Files:**
- Modify: `docs/ARCHITECTURE.md`

**Step 1: Remove 4 non-existent components from the tree**

Replace the components/ subtree. Actual components (14 total):
```
├── components/
│   ├── AgentCard.tsx          # OpenClaw agent identity card
│   ├── AuthButton/            # World ID auth trigger
│   ├── ChainBadge.tsx         # World/0G/Hedera chain indicator
│   ├── CreateMarketModal.tsx  # Prediction market creation modal
│   ├── GPUStepper.tsx         # GPU provider registration stepper
│   ├── Navigation/            # Bottom tab navigation (World App)
│   ├── PageLayout/            # Page wrapper with header
│   ├── PaymentConfirmation.tsx # x402 payment receipt
│   ├── PredictionCard.tsx     # Prediction market card with bet UI
│   ├── ReputationBar.tsx      # ERC-8004 reputation score bar
│   ├── ResourceCard.tsx       # Resource listing card with chain badge
│   ├── ResourceCardSkeleton.tsx # Loading skeleton for ResourceCard
│   ├── VerificationStatus.tsx # TEE/World ID verification badge
│   └── Verify/               # MiniKit verify command wrapper
```

Remove: `Pay/`, `Transaction/`, `UserInfo/`, `ViewPermissions/`
Add: `CreateMarketModal.tsx`

**Step 2: Add `/api/seer/inference` to the API route tree**

Add after the hedera/audit entry:
```
│       ├── seer/
│       │   └── inference/
│       │       └── route.ts   # Seer 0G Compute inference via broker SDK
```

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: fix ghost components + add seer/inference route in ARCHITECTURE.md"
```

---

### Task 2: Fix README.md — add seer route, fix lib list, fix route count

**Files:**
- Modify: `README.md`

**Step 1: Add `/api/seer/inference` to API Routes table (after line 164)**

Add row:
```
| `/api/seer/inference` | POST | Seer agent 0G Compute inference | 0G |
```

**Step 2: Update route count on line 221**

Change `17 server-side API routes` to `18 server-side API routes`.

**Step 3: Update lib/ section (lines 223-228) to include all 14 files**

Replace with:
```
│   ├── lib/                    # Shared server utilities (14 files)
│   │   ├── hedera.ts           # @hashgraph/sdk wrapper
│   │   ├── hedera-agent.ts     # Hedera Agent Kit wrapper
│   │   ├── blocky402.ts        # x402 facilitator client
│   │   ├── og-chain.ts         # 0G Chain + ERC-8004
│   │   ├── og-compute.ts       # 0G inference broker
│   │   ├── og-broker.ts        # 0G broker types + helpers
│   │   ├── og-storage.ts       # 0G Storage KV persistence
│   │   ├── agentkit.ts         # World AgentKit registration
│   │   ├── world-id.ts         # World ID verification
│   │   ├── x402-middleware.ts   # x402 payment middleware
│   │   ├── reputation.ts       # ERC-8004 reputation queries
│   │   ├── prediction-math.ts  # Prediction market math
│   │   ├── contracts.ts        # ABIs + addresses
│   │   └── types.ts            # Shared TypeScript types
```

**Step 4: Add `CreateMarketModal.tsx` to components section**

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add seer/inference route, fix lib count (14), fix route count (18) in README"
```

---

### Task 3: Fix PENDING_WORK.md — remove P-054 duplicate

**Files:**
- Modify: `docs/PENDING_WORK.md`

**Step 1: Remove P-054 row** (duplicate of P-063)

Find and delete the line:
```
| P-054 | Demo video not recorded | unclaimed | — | — | Wave 4 deliverable. Manual recording needed. |
```

P-063 in the Critical section already covers this.

**Step 2: Commit**

```bash
git add docs/PENDING_WORK.md
git commit -m "docs: remove duplicate P-054 (already tracked as P-063) in PENDING_WORK"
```

---

### Task 4: Fix WAVE_EXECUTION_PLAN.md — dedupe library + fix prediction skill

**Files:**
- Modify: `docs/WAVE_EXECUTION_PLAN.md`

**Step 1: Remove duplicate `@hashgraph/sdk` row (line 168)**

Delete line 168:
```
| `@hashgraph/sdk` | latest | x402 payments, HTS, HCS | Hedera | Official Hedera SDK |
```

Update line 165 to consolidate:
```
| `@hashgraph/sdk` | ^2.81.0 | HTS, HCS, transfers, x402 | Hedera | Official Hedera SDK — all Hedera ops, zero Solidity |
```

**Step 2: Fix prediction skill description (line 155)**

Replace:
```
| `skills/prediction.md` | Agent 10 | W3 | ~40 | Calls `ResourcePrediction.createMarket()` and `placeBet()` |
```

With:
```
| `skills/prediction.md` | Agent 10 | W3 | ~40 | Creates HTS-based prediction tokens + HCS market resolution |
```

**Step 3: Commit**

```bash
git add docs/WAVE_EXECUTION_PLAN.md
git commit -m "docs: dedupe @hashgraph/sdk row + fix prediction skill description in WAVE_EXECUTION_PLAN"
```

---

## Verification

1. `grep -c "route.ts" docs/ARCHITECTURE.md` — should show updated count
2. `grep "seer/inference" README.md docs/ARCHITECTURE.md` — 2 matches (one per file)
3. `grep "Pay/\|Transaction/\|UserInfo/\|ViewPermissions/" docs/ARCHITECTURE.md` — 0 matches
4. `grep "P-054" docs/PENDING_WORK.md` — 0 matches
5. `grep -c "@hashgraph/sdk" docs/WAVE_EXECUTION_PLAN.md` — 1 match (not 2)
6. `grep "ResourcePrediction.createMarket" docs/WAVE_EXECUTION_PLAN.md` — 0 matches
