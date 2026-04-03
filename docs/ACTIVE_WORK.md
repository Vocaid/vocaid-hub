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
| 7 | Wave 4: Polish + Submission + Demo (all 3 tracks) | `src/app/**/*.tsx`, `globals.css`, `README.md`, `SUBMISSION.md`, `AI_ATTRIBUTION.md`, `scripts/seed-demo-data.ts`, `scripts/demo-flow.md` | active | 2026-04-03 | — |
| 2 | World ID hard gate on all resource API routes + enable auth redirect | `src/app/api/gpu/*`, `src/app/api/predictions/*`, `src/app/api/payments/*`, `src/app/api/reputation/*`, `src/app/(protected)/layout.tsx`, `.env.example` | done | 2026-04-03T20:00Z | 2026-04-03T21:00Z |
| 3 | Run Hedera setup script, test x402 payment e2e, wire World ID → HTS credential mint | `scripts/setup-hedera.ts`, `src/lib/hedera.ts`, `src/app/api/verify-proof/route.ts`, `deployments/hedera-testnet.json` | done | 2026-04-03T20:30Z | 2026-04-03T21:00Z |
| 6 | Wave 4: Demo + Polish + Submission | `src/app/**/loading.tsx`, `src/app/**/error.tsx`, `src/app/globals.css`, `scripts/seed-demo-data.ts`, `scripts/demo-flow.md`, `README.md`, `SUBMISSION.md`, `AI_ATTRIBUTION.md` | in-progress | 2026-04-03T22:00Z | — |
| 9 | x402 middleware + payment initiation + hire flow | `src/lib/x402-middleware.ts` (new), `src/app/api/initiate-payment/route.ts`, `src/app/api/payments/route.ts` (GET only), `src/app/(protected)/home/marketplace-content.tsx` (handleHire only) | done | 2026-04-03T22:30Z | 2026-04-03T23:00Z |
| 8 | Demo seed data script + demo flow doc | `scripts/seed-demo-data.ts`, `scripts/demo-flow.md` | in-progress | 2026-04-03T23:00Z | — |

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
