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
| — | — | — | — | — | — |

---

## Recently Completed

| Agent | Task | Files Modified | Completed (UTC) |
|-------|------|---------------|-----------------|
| — | — | — | — |

---

## File Ownership Map (During Hackathon)

Once the hackathon starts, each agent owns specific files. This map prevents conflicts:

### Wave 1 File Ownership

| Agent | Owns These Files | Do NOT Touch |
|-------|-----------------|-------------|
| Agent 1 (0G Contracts) | `contracts/0g/*`, `deployments/0g-galileo.json`, `scripts/deploy-0g.ts` | `app/*`, `agents/*`, `contracts/world/*`, `contracts/arc/*` |
| Agent 2 (World) | `contracts/world/*`, `app/api/verify/*`, `deployments/world-sepolia.json` | `contracts/0g/*`, `contracts/arc/*`, `agents/*` |
| Agent 3 (Arc) | `contracts/arc/*`, `lib/nanopayments.ts`, `deployments/arc-testnet.json` | `contracts/0g/*`, `contracts/world/*`, `agents/*` |
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
| Agent 9 (Nanopayments) | `lib/nanopayments.ts`, `app/api/pay/*`, `components/PaymentConfirmation.tsx` | `app/predictions/*`, `contracts/*` |
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
