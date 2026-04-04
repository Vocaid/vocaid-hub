# Active Work Tracker — Agent Coordination

**Purpose:** Prevent duplicate work and conflicts between parallel agents. Every agent MUST update this file before starting any task.
**Branch:** `staging` (ALL agents work on staging — no feature branches until hackathon starts)

---

## Rules

1. **Before starting ANY task:** Read this file. Check if another agent is already working on overlapping files.
2. **Claim your task:** Add a row to the Active Work table below with your agent ID, task, target files, and timestamp.
3. **Commit this file FIRST:** `git add docs/ACTIVE_WORK.md && git commit -m "wip: claim [task description]"` BEFORE writing any code.
4. **Pull before starting:** `git pull origin staging` to get the latest claims.
5. **Mark complete when done:** Update your row status to `done` and commit.
6. **Conflict resolution:** If two agents claim overlapping files, the EARLIER timestamp wins. The later agent must pick a different task or wait.

---

## Active Work

| Agent | Task | Target Files | Status | Started (UTC) | Completed (UTC) |
|-------|------|-------------|--------|---------------|-----------------|
| 4 | Fix OpenClaw config: Arc→Hedera env vars | `agents/openclaw.json` | done | 2026-04-03T18:00Z | 2026-04-03T18:10Z |
| 4 | Update ARCHITECTURE.md with actual codebase structure | `docs/ARCHITECTURE.md` | done | 2026-04-03T22:30Z | 2026-04-03T22:45Z |
| 7 | Wave 4: Polish (metadata, loading/error, login branding, cleanup, animations) + extra gaps (P-010, P-012, P-013, P-032) | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/**/loading.tsx`, `src/app/**/error.tsx` | done | 2026-04-03 | 2026-04-04 |
| 2 | World ID hard gate on all resource API routes + enable auth redirect | `src/app/api/gpu/*`, `src/app/api/predictions/*`, `src/app/api/payments/*`, `src/app/api/reputation/*`, `src/app/(protected)/layout.tsx`, `.env.example` | done | 2026-04-03T20:00Z | 2026-04-03T21:00Z |
| 3 | Run Hedera setup script, test x402 payment e2e, wire World ID → HTS credential mint | `scripts/setup-hedera.ts`, `src/lib/hedera.ts`, `src/app/api/verify-proof/route.ts`, `deployments/hedera-testnet.json` | done | 2026-04-03T20:30Z | 2026-04-03T21:00Z |
| 6 | Wave 4: Demo + Polish + Submission | `src/app/**/loading.tsx`, `src/app/**/error.tsx`, `src/app/globals.css`, `scripts/seed-demo-data.ts`, `scripts/demo-flow.md`, `README.md`, `SUBMISSION.md`, `AI_ATTRIBUTION.md` | done | 2026-04-03T22:00Z | 2026-04-03T23:30Z |
| 9 | x402 middleware + payment initiation + hire flow | `src/lib/x402-middleware.ts` (new), `src/app/api/initiate-payment/route.ts`, `src/app/api/payments/route.ts` (GET only), `src/app/(protected)/home/marketplace-content.tsx` (handleHire only) | done | 2026-04-03T22:30Z | 2026-04-03T23:00Z |
| 8 | Demo seed data script + demo flow doc | `scripts/seed-demo-data.ts`, `scripts/demo-flow.md` | done | 2026-04-03T23:00Z | 2026-04-03T23:30Z |
| 14 | Comprehensive README.md + PENDING_WORK.md + package.json fix + Edge agent card fix | `README.md`, `docs/PENDING_WORK.md`, `package.json`, `public/agent-cards/edge.json` | done | 2026-04-03T23:45Z | 2026-04-04T00:15Z |
| 3 | Fix .env.example missing Hedera vars + P-023 Mirror Node verification | `.env.example`, `docs/PENDING_WORK.md` | done | 2026-04-04T00:30Z | 2026-04-04T00:35Z |
| 2 | UI brand standards: favicon, logo, AgentCard colors, AuthButton color, DESIGN_SYSTEM.md | `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/AgentCard.tsx`, `src/components/AuthButton/index.tsx`, `docs/DESIGN_SYSTEM.md` | done | 2026-04-04T01:00Z | 2026-04-04T01:30Z |
| 3 | Architecture gap analysis + mock call testing + documentation audit | `docs/ARCHITECTURE.md`, `README.md`, `docs/PENDING_WORK.md` | done | 2026-04-04T01:45Z | 2026-04-04T02:15Z |
| 4 | Add OG + Twitter metadata + metadataBase to layout.tsx | `src/app/layout.tsx` | done | 2026-04-04T02:30Z | 2026-04-04T02:45Z |
| 9 | Audit cleanup: Arc refs + unused SVGs + PENDING_WORK accuracy | `agents/.agents/edge/soul.md`, `docs/TECHNOLOGY_RESEARCH.md`, `public/*.svg`, `docs/PENDING_WORK.md` | done | 2026-04-04T03:00Z | 2026-04-04T03:15Z |
| 4 | Title/slogan consistency: "Reliable Resources for the Agentic Economy" across 20 files | all docs + layout.tsx + package.json + README + SUBMISSION | done | 2026-04-04T03:30Z | 2026-04-04T03:45Z |
| 2 | Landing page: purple-only icons, fix auth crash (remove auto-auth useEffect) | `src/app/page.tsx`, `src/components/AuthButton/index.tsx` | done | 2026-04-04T04:00Z | 2026-04-04T04:30Z |
| 2 | Add brand logo assets to git (untracked — broke production image) | `public/app-logo.png`, `public/compact-logo.png`, `public/white-favicon.png` | done | 2026-04-04T04:30Z | 2026-04-04T04:45Z |
| 2 | MiniKit v2 fix: haptic shim (commands.sendHapticFeedback) + verify wallet auth | `src/providers/index.tsx`, `src/auth/wallet/index.ts` | done | 2026-04-04T05:00Z | 2026-04-04T05:30Z |
| 3 | P-058: Wire giveFeedback + HCS audit for AI/Agentic track | `src/app/api/payments/route.ts`, `scripts/seed-demo-data.ts` | done | 2026-04-04T10:00Z | 2026-04-04T10:30Z |
| 6 | Full gap audit vs SESSION_CONTEXT + doc updates (PENDING_WORK dedup, WAVE_EXECUTION_PLAN status, ARCHITECTURE structure) | `docs/PENDING_WORK.md`, `docs/WAVE_EXECUTION_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/ACTIVE_WORK.md` | done | 2026-04-04T10:00Z | 2026-04-04T10:30Z |
| 6 | P-057: Shield ValidationRegistry check in /api/resources | `src/app/api/resources/route.ts`, `docs/PENDING_WORK.md`, `docs/WAVE_EXECUTION_PLAN.md` | done | 2026-04-04T11:00Z | 2026-04-04T11:15Z |
| 7 | P-059 MiniKit.pay() + ResourceCard UX (unverified muted + hire spinner + error toast) | `src/components/ResourceCard.tsx`, `src/app/(protected)/home/marketplace-content.tsx`, `.env.example` | done | 2026-04-04 | 2026-04-04 |
| 4 | P-020 + P-021: vitest setup + 22 tests + auth type fix | `src/auth/index.ts`, `vitest.config.ts`, `src/lib/__tests__/*.test.ts`, `package.json` | done | 2026-04-04T11:00Z | 2026-04-04T11:30Z |
| 6 | P-062: Agent-to-agent fleet demo script | `scripts/demo-agent-fleet.ts`, `docs/PENDING_WORK.md` | done | 2026-04-04T11:30Z | 2026-04-04T12:00Z |
| 3 | P-071: Fix verify-proof to World ID v4 API (was invalid_action) | `src/app/api/verify-proof/route.ts`, `docs/PENDING_WORK.md` | done | 2026-04-04T13:00Z | 2026-04-04T13:15Z |
| 6 | P-061: Edge trade API route + fleet script wiring | `src/app/api/edge/trade/route.ts` (new), `scripts/demo-agent-fleet.ts` | done | 2026-04-04T13:30Z | 2026-04-04T14:00Z |
| 5 | Fix GPU registration route wiring (ABI mismatch, env var, identity lookup) | `src/abi/GPUProviderRegistry.json`, `src/app/api/gpu/register/route.ts` | done | 2026-04-04T14:00Z | 2026-04-04T14:30Z |
| 5 | Add demo fallback to GPU routes for 0G testnet downtime (P-046, P-047) | `src/app/api/gpu/list/route.ts`, `src/app/api/gpu/register/route.ts`, `src/components/GPUStepper.tsx`, `.env.example` | done | 2026-04-04T14:30Z | 2026-04-04T15:00Z |
| 5 | E2E GPU stepper verification + wiring audit | Plan: `docs/plans/2026-04-04-gpu-stepper-e2e-verification.md` | done | 2026-04-04T15:00Z | 2026-04-04T15:30Z |
| 5 | Fix /api/resources self-fetch + add on-chain GPU listing (P-051, P-052) | `src/lib/og-chain.ts`, `src/app/api/resources/route.ts` | done | 2026-04-04T15:30Z | 2026-04-04T16:00Z |
| 5 | P-072: Address validation in agents/register + world-id/check | `src/app/api/agents/register/route.ts`, `src/app/api/world-id/check/route.ts` | done | 2026-04-04T16:00Z | 2026-04-04T16:15Z |
| 5 | P-071: Pass signal in verify flow + v4/v2 fallback | `src/components/Verify/index.tsx`, `src/app/api/verify-proof/route.ts` | done | 2026-04-04T16:15Z | 2026-04-04T16:30Z |
| 4 | P-069 + P-070: 2nd wallet for reputation + GPU-Beta | `scripts/seed-demo-data.ts`, `.env.local`, `docs/PENDING_WORK.md` | done | 2026-04-04T17:00Z | 2026-04-04T17:30Z |

---

## Recently Completed

| Agent | Task | Files Modified | Completed (UTC) |
|-------|------|---------------|-----------------|
| 1 | ERC-8004 contracts on 0G Galileo | `contracts/0g/*`, `scripts/deploy-0g.ts`, `deployments/0g-galileo.json` | 2026-04-03 |
| 2 | CredentialGate on World Sepolia | `contracts/world/*`, `src/app/api/verify-proof/*`, `scripts/deploy-world.ts` | 2026-04-03 |
| 3 | Hedera HTS + HCS + Blocky402 | `src/lib/hedera.ts`, `src/lib/blocky402.ts`, `src/app/api/payments/*`, `scripts/setup-hedera.ts` | 2026-04-03 |
| 4 | OpenClaw 4-agent fleet + scaffold | `agents/*`, `package.json`, `hardhat.config.ts` | 2026-04-03 |
| 5 | GPU broker SDK + stepper UI + API routes | `src/lib/og-compute.ts`, `src/components/GPUStepper.tsx`, `src/app/api/gpu/*` | 2026-04-03 |
| 6 | AgentKit + A2A agent cards | `src/lib/agentkit.ts`, `src/app/api/agents/*`, `public/agent-cards/*` | 2026-04-03 |
| 7 | Marketplace UI + ResourceCard + filters | `src/components/ResourceCard.tsx`, `src/components/ChainBadge.tsx`, `src/components/ReputationBar.tsx`, `src/components/VerificationStatus.tsx`, `src/app/(protected)/home/*` | 2026-04-03 |
| — | PredictionCard component | `src/components/PredictionCard.tsx`, `src/app/(protected)/predictions/*`, `src/app/api/predictions/*` | 2026-04-03 |
| 8 | Wave 3 payments + predictions + hire flow | `src/components/PaymentConfirmation.tsx`, `src/components/PredictionCard.tsx`, `src/app/(protected)/predictions/*`, `src/app/api/predictions/*`, `src/app/(protected)/home/marketplace-content.tsx`, `src/components/ResourceCard.tsx`, `src/app/globals.css` | 2026-04-03 |
| 8 | Navigation routing + Profile page | `src/components/Navigation/index.tsx`, `src/app/(protected)/profile/*` | 2026-04-03 |
| 7 | Wire .env.local with 0G deployed addresses + OG_BROKER_PRIVATE_KEY + NEXT_PUBLIC_OG_RPC_URL | `.env.local`, `.env.example` | 2026-04-03 |
| 7 | Doc fixes: USDC token consistency, Blocky402 status, Arc cleanup, ACTIVE_WORK file ownership | `docs/ARCHITECTURE.md`, `docs/TECHNOLOGY_RESEARCH.md`, `docs/ACTIVE_WORK.md` | 2026-04-03 |
| 9 | x402 middleware + payment initiation + hire flow | `src/lib/x402-middleware.ts`, `src/app/api/initiate-payment/route.ts`, `src/app/api/payments/route.ts`, `src/app/(protected)/home/marketplace-content.tsx` | 2026-04-03 |
| 14 | Comprehensive README.md + PENDING_WORK.md gap tracker + package.json rename + Edge agent card fix | `README.md`, `docs/PENDING_WORK.md`, `package.json`, `public/agent-cards/edge.json`, `docs/ACTIVE_WORK.md` | 2026-04-04 |
| 2 | World ID hard gate on all 8 resource API routes + auth redirect | `src/app/api/gpu/*`, `src/app/api/predictions/*`, `src/app/api/payments/*`, `src/app/api/reputation/*`, `src/app/(protected)/layout.tsx` | 2026-04-04 |
| 2 | UI brand standards: favicon, logo, AgentCard/AuthButton design tokens | `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/AgentCard.tsx`, `src/components/AuthButton/index.tsx`, `docs/DESIGN_SYSTEM.md` | 2026-04-04 |
| 2 | Landing page: purple-only icons + remove auto-auth crash | `src/app/page.tsx`, `src/components/AuthButton/index.tsx` | 2026-04-04 |
| 2 | Brand logo assets committed to git (were untracked, broke prod) | `public/app-logo.png`, `public/compact-logo.png`, `public/white-favicon.png` | 2026-04-04 |
| 2 | MiniKit v2 haptic shim (commands.sendHapticFeedback) | `src/providers/index.tsx` | 2026-04-04 |
| 9 | Audit cleanup: Arc refs + unused SVGs + PENDING_WORK accuracy | `agents/.agents/edge/soul.md`, `docs/TECHNOLOGY_RESEARCH.md`, `public/*.svg`, `docs/PENDING_WORK.md` | 2026-04-04 |

---

## File Ownership Map (During Hackathon)

Once the hackathon starts, each agent owns specific files. This map prevents conflicts:

### Wave 1 File Ownership

| Agent | Owns These Files | Do NOT Touch |
|-------|-----------------|-------------|
| Agent 1 (0G Contracts) | `contracts/0g/*`, `deployments/0g-galileo.json`, `scripts/deploy-0g.ts` | `app/*`, `agents/*`, `contracts/world/*`, `contracts/hedera/*` |
| Agent 2 (World) | `contracts/world/*`, `app/api/verify/*`, `deployments/world-sepolia.json` | `contracts/0g/*`, `contracts/hedera/*`, `agents/*` |
| Agent 3 (Hedera) | `lib/hedera.ts`, `lib/blocky402.ts`, `app/api/payments/*`, `scripts/setup-hedera.ts` | `contracts/*` (no Solidity on Hedera), `agents/*` |
| Agent 4 (Scaffold) | `package.json`, `hardhat.config.ts`, `agents/*`, `.env.example`, `app/layout.tsx`, `app/page.tsx` | `contracts/*`, `deployments/*` |

### Wave 2 File Ownership

| Agent | Owns These Files | Do NOT Touch |
|-------|-----------------|-------------|
| Agent 5 (GPU Portal) | `contracts/0g/GPUProviderRegistry.sol`, `app/gpu-verify/*`, `app/api/gpu/*` | `app/predictions/*`, `agents/*` |
| Agent 6 (AgentKit) | `app/api/agents/*`, `app/.well-known/*`, `lib/agentkit.ts` | `app/gpu-verify/*`, `contracts/*` |
| Agent 7 (Marketplace UI) | `app/page.tsx` (marketplace), `components/ResourceCard.tsx`, `components/ChainBadge.tsx`, `components/ReputationBar.tsx` | `app/gpu-verify/*`, `app/predictions/*`, `contracts/*` |
| Agent 8 (0G Compute) | `lib/og-broker.ts`, `lib/og-storage.ts`, agents Seer config | `app/*`, `contracts/*` |

### Wave 3 File Ownership

| Agent | Owns These Files | Do NOT Touch |
|-------|-----------------|-------------|
| Agent 9 (x402 Payments) | `lib/blocky402.ts`, `app/api/payments/*`, `components/PaymentConfirmation.tsx` | `app/predictions/*`, `contracts/*` |
| Agent 10 (Predictions) | `app/predictions/*`, `components/PredictionCard.tsx`, `app/api/predictions/*` | `app/gpu-verify/*`, `contracts/*` |
| Agent 11 (Reputation) | `agents/skills/reputation.md`, `agents/skills/shield-check.md`, `lib/reputation.ts` | `app/*`, `contracts/*` |

### Wave 4 File Ownership

| Agent | Owns These Files | Do NOT Touch |
|-------|-----------------|-------------|
| Agent 12 (Demo) | `scripts/seed-demo-data.ts`, `scripts/demo-flow.md` | `contracts/*`, `components/*` |
| Agent 13 (Polish) | `app/**/*.tsx` (all pages — polish only), `app/globals.css` | `contracts/*`, `agents/*`, `lib/*` |
| Agent 14 (Submission) | `README.md`, `SUBMISSION.md`, `AI_ATTRIBUTION.md` | Everything else |

---

## Branch Rules

| Rule | Details |
|------|---------|
| **Default branch** | `staging` — ALL agents commit to staging |
| **During hackathon** | Create `vocaid-hub/main` as integration branch. Feature branches per agent per wave |
| **Merge strategy** | Sequential within each wave. `--no-ff` to preserve branch history |
| **Before ANY commit** | `git pull origin staging` first |
| **Commit format** | `feat(scope): description` — see WAVE_EXECUTION_PLAN.md commit strategy |
| **Max commit size** | 200 lines, 5-10 files |

---

## Conflict Prevention Checklist

Before writing code, every agent must:

- [ ] `git pull origin staging`
- [ ] Read this `ACTIVE_WORK.md` file
- [ ] Check if target files are claimed by another agent
- [ ] Add your claim row to the Active Work table
- [ ] `git add docs/ACTIVE_WORK.md && git commit -m "wip: claim [task]" && git push origin staging`
- [ ] THEN start coding

After completing work:

- [ ] Update your row: status → `done`
- [ ] Move row to Recently Completed
- [ ] `git add . && git commit -m "feat(scope): [description]" && git push origin staging`
