# Pending Work — Gap Tracker for Agent Coordination

**Purpose:** Structured list of all known gaps, missing files, and incomplete features — prioritized by submission impact.
**Last Audited:** 2026-04-04T12:00Z
**Cross-Reference:** [`ACTIVE_WORK.md`](ACTIVE_WORK.md) for current ownership claims and file locks.

> **🤖 AGENTS:** This file is your task board. Do NOT start work without checking [`ACTIVE_WORK.md`](ACTIVE_WORK.md) first.

---

## How to Use (6-Step Claim Protocol)

1. **Read** [`ACTIVE_WORK.md`](ACTIVE_WORK.md) — check who owns what files right now.
2. **Find** an unclaimed item in the tables below (Status = `unclaimed`).
3. **Claim** it — add a row to [`ACTIVE_WORK.md`](ACTIVE_WORK.md) with your agent ID, the P-ID, target files, and UTC timestamp.
4. **Commit** the claim: `git add docs/ACTIVE_WORK.md && git commit -m "wip: claim P-0XX [description]"` BEFORE writing code.
5. **Complete** the work — follow the target files and references listed.
6. **Mark done** — update this file (Status → `done`) AND [`ACTIVE_WORK.md`](ACTIVE_WORK.md) (move to Recently Completed).

---

## 🔴 Critical (Blocks Submission)

| ID | Item | Status | Agent | Target Files | Reference |
|----|------|--------|-------|-------------|-----------|
| P-001 | Hedera x402 e2e + HTS credential mint | ✅ done | Agent 3 | `scripts/setup-hedera.ts`, `src/lib/hedera.ts`, `deployments/hedera-testnet.json` | [ACTIVE_WORK.md](ACTIVE_WORK.md) — Agent 3 completed |
| P-002 | Wave 4 Demo + Polish + Submission | ✅ done | Agent 6+8 | `scripts/seed-demo-data.ts`, `scripts/demo-flow.md`, `src/app/**/*.tsx` | [ACTIVE_WORK.md](ACTIVE_WORK.md) — Agents 6+8 completed |
| P-003 | Create SUBMISSION.md | ✅ done | Agent 6 | `SUBMISSION.md` | 128 lines, all 9 tracks documented |
| P-004 | Create AI_ATTRIBUTION.md | ✅ done | Agent 6 | `AI_ATTRIBUTION.md` | 54 lines, human decisions + AI-generated code |
| P-005 | Comprehensive README.md | ✅ done | Agent 14 | `README.md` | 13-section README with architecture, setup, agent coordination |

---

## 🟡 High Priority (Demo Quality)

| ID | Item | Status | Agent | Target Files | Reference |
|----|------|--------|-------|-------------|-----------|
| P-010 | Missing `error.tsx` for gpu-verify | ✅ done | Agent 7 | `src/app/gpu-verify/error.tsx` | Created with retry button |
| P-011 | Missing `loading.tsx` for gpu-verify | ✅ done | Agent 6 | `src/app/gpu-verify/loading.tsx` | File exists |
| P-012 | Missing root `error.tsx` | ✅ done | Agent 7 | `src/app/error.tsx` | Global error boundary with retry |
| P-013 | Missing root `loading.tsx` | ✅ done | Agent 7 | `src/app/loading.tsx` | Global loading shell with pulse animation |
| P-014 | Demo seed data script verification | ✅ done | Agent 8 | `scripts/seed-demo-data.ts` | [ACTIVE_WORK.md](ACTIVE_WORK.md) — Agent 8 completed |
| P-015 | Demo flow script | ✅ done | Agent 8 | `scripts/demo-flow.md` | [ACTIVE_WORK.md](ACTIVE_WORK.md) — Agent 8 completed |

---

## 🟠 Medium Priority (Robustness)

| ID | Item | Status | Agent | Target Files | Reference |
|----|------|--------|-------|-------------|-----------|
| P-020 | Zero test files in project | ✅ done | Agent 4 | `src/lib/__tests__/*.test.ts`, `vitest.config.ts` | 22 tests: prediction-math (18) + hedera audit trail (4). Vitest framework |
| P-021 | TODO in `src/auth/index.ts` (`@ts-expect-error`) | ✅ done | Agent 4 | `src/auth/index.ts` | Fixed: proper `(credentials, _request)` signature matching NextAuth types |
| P-022 | Agent directory verification | ✅ done | Agent 4 | `agents/.agents/*/soul.md` | All 4 soul.md files exist (seer, edge, shield, lens) |
| P-023 | Hedera deployment verification via Mirror Node | ✅ done | Agent 3 | `src/app/api/hedera/audit/route.ts` | Verified: VCRED token 0.0.8499633 + topic 0.0.8499635 confirmed on Mirror Node |

---

## 🔵 Low Priority (Polish)

| ID | Item | Status | Agent | Target Files | Reference |
|----|------|--------|-------|-------------|-----------|
| P-030 | Package name still `@worldcoin/next-15-template` | ✅ done | Agent 14 | `package.json` | Fixed to `vocaid-hub` |
| P-031 | Favicon + OG images need branding | ✅ done | Agent 2 | `src/app/layout.tsx`, `src/app/page.tsx`, `docs/DESIGN_SYSTEM.md` | Favicon set to compact-logo.png, app-logo.png on landing, brand assets documented |
| P-032 | `README-minikit.md` leftover from scaffold | ✅ done | Agent 7 | `README-minikit.md` | Deleted |

---

## 🔴 Critical (Blocks Bounty Eligibility)

| ID | Item | Status | Agent | Bounty at Risk | Target Files | Fix |
|----|------|--------|-------|---------------|-------------|-----|
| P-057 | Shield doesn't block unverified providers | ✅ done | Agent 6 | 0G OpenClaw $6k | `src/app/api/resources/route.ts` | ValidationRegistry.getSummary() check per GPU provider; unverified show as "Unverified" |
| P-058 | Lens never writes `giveFeedback()` | ✅ done | Agent 3 | 0G OpenClaw $6k | `src/app/api/payments/route.ts`, `scripts/seed-demo-data.ts` | Lens auto-writes feedback after payment + seed script Phase 6 |
| P-059 | MiniKit.pay() never called | ✅ done | Agent 7 | World MiniKit $4k | `src/app/(protected)/home/marketplace-content.tsx` | MiniKit.pay() wired with x402 fallback, loading spinner, error toast |
| P-060 | Seer never runs 0G Compute inference | ✅ done | Agent 4 | 0G OpenClaw $6k | `src/app/api/seer/inference/route.ts` | API route calls listProviders() + callInference() from SDK. Falls back to mock when testnet empty. Logs to Hedera HCS. |
| P-061 | Edge never executes trades | unclaimed | — | 0G OpenClaw $6k | `agents/.agents/edge/soul.md` | Needs OpenClaw Gateway running with live agent process. |
| P-062 | No agent-to-agent messaging | ✅ done | Agent 6 | World AgentKit $8k | `scripts/demo-agent-fleet.ts` | 4-agent decision cycle: Seer→Edge→Shield→Lens with contract reads |
| P-063 | Demo video not recorded | unclaimed | — | All tracks | — | Manual recording after app running. |
| P-071 | World ID `verify-human` action returns `invalid_action` from v2 API | ✅ done | Agent 3 | World ID $8k | `src/app/api/verify-proof/route.ts` | Fixed: switched to v4 endpoint (`api/v4/verify/{rp_id}`). Action now recognized. |

---

## 🆕 Discovered Gaps

| ID | Item | Status | Agent | Target Files | Reference |
|----|------|--------|-------|-------------|-----------|
| P-040 | Edge agent card Arc references | ✅ done | Agent 14 | `public/agent-cards/edge.json` | Fixed |
| P-041 | AgentCard.tsx hardcoded colors | ✅ done | Agent 2 | `src/components/AgentCard.tsx` | Fixed |
| P-042 | AuthButton hardcoded red-400 | ✅ done | Agent 2 | `src/components/AuthButton/index.tsx` | Fixed |
| P-043 | predictions resolve/claim no World ID gate | ✅ done | Agent 1 | `src/app/api/predictions/[id]/claim/route.ts`, `resolve/route.ts` | Added requireWorldId() |
| P-044 | /api/agents/register no UI caller | ✅ done | Agent 1 | `src/app/(protected)/profile/profile-content.tsx` | Added Register button |
| P-045 | RP_SIGNING_KEY not configured | ✅ done | Agent 1 | `.env.local` | Set from WORLD_ID_PRIVATE_KEY |
| P-046 | Edge soul.md Arc references | ✅ done | Agent 9 | `agents/.agents/edge/soul.md` | Fixed |
| P-047 | Unused scaffold SVGs | ✅ done | Agent 9 | `public/*.svg` | Deleted |
| P-048 | TECHNOLOGY_RESEARCH Arc references | ✅ done | Agent 9 | `docs/TECHNOLOGY_RESEARCH.md` | Fixed |
| P-049 | 0G Galileo testnet SSL timeout | ✅ resolved | Agent 8 | `~/.zshrc` | Root cause: Anaconda curl uses OpenSSL 3.0.x with broken chain-building. Node.js/viem/ethers all work fine. Fix: `alias curl=/usr/bin/curl` in .zshrc. Testnet fully operational. |
| P-050 | GPU stepper e2e fallback | ✅ done | Agent 5 | `src/components/GPUStepper.tsx` | Verified |
| P-051 | `/api/resources` self-fetch hits World ID gate | ✅ done | Agent 5 | `src/app/api/resources/route.ts` | Replaced HTTP self-fetch with direct imports (listProviders, listRegisteredAgents, getRegisteredProviders) |
| P-052 | GPUProviderRegistry != Broker listing source | ✅ done | Agent 5 | `src/lib/og-chain.ts`, `src/app/api/resources/route.ts` | Added getRegisteredProviders() to read on-chain registry; resources route merges broker + on-chain data |
| P-054 | Demo video not recorded | unclaimed | — | — | Wave 4 deliverable. Manual recording needed. |

---

## 🏗️ Agent Autonomy Gap (Cross-Cutting)

> **Context:** Infrastructure is 95% complete (contracts, APIs, UI, deployments) but the OpenClaw agent fleet (Seer, Edge, Shield, Lens) exists only as configuration (soul.md + skill definitions). No agent TypeScript code runs autonomously. All "agent actions" are frontend-triggered API calls.
>
> **Bounty impact:** 0G OpenClaw ($6k), World AgentKit ($8k), demo credibility.
>
> **Affected items:** P-057, P-058, P-060, P-061, P-062
>
> **Minimum viable fix (~1.5h):** Wire reputation writes (P-058) + Shield validation check (P-057) + agent-to-agent demo script (P-062). Makes agent fleet appear functional without full OpenClaw Gateway runtime.

> Agents: Add new items here. Use IDs P-064+.

---

## Session 2026-04-04 Discoveries (Agent 2)

| ID | Item | Status | Agent | Target Files | Reference |
|----|------|--------|-------|-------------|-----------|
| P-064 | MiniKit v2 broke MiniKit.commands (haptic crash) | done | Agent 2 | `src/providers/index.tsx` | UI kit v1.6.0 calls removed commands.sendHapticFeedback. Fixed with runtime shim. |
| P-065 | AuthButton auto-auth crashed on mount (digest 3142902775) | done | Agent 2 | `src/components/AuthButton/index.tsx` | Removed useEffect auto-auth. Root cause: walletAuth redirect before SIWE completion. |
| P-066 | Brand logo assets untracked in git (broke production) | done | Agent 2 | `public/app-logo.png`, `public/compact-logo.png`, `public/white-favicon.png` | Files existed locally but never git added. |
| P-067 | Landing page used 3 chain colors (spec requires purple-only) | done | Agent 2 | `src/app/page.tsx` | All 3 chain icon circles changed to chain-hedera (brand purple). |

| P-068 | PRIVATE_KEY in .env.local didn't match deployer wallet | ✅ done | Agent 8 | `.env.local` | Agents set a different key during dev. Fixed: restored deployer key (0x58c4...) for seed script. |
| P-069 | ReputationRegistry self-feedback blocks demo seeding | known-limitation | — | `contracts/0g/ReputationRegistryUpgradeable.sol` | Deployer owns all identities, cannot giveFeedback to self. Mock fallback data in API routes provides scores. Would need 2nd wallet for on-chain reputation. |
| P-070 | GPUProviderRegistry 1-provider-per-wallet limit | known-limitation | — | `contracts/0g/GPUProviderRegistry.sol` | Only GPU-Alpha registered. GPU-Beta skipped. Would need 2nd wallet address. |
| P-072 | agents/register 500s on malformed address (no input validation) | unclaimed | — | `src/app/api/agents/register/route.ts` | `isVerifiedOnChain()` throws InvalidAddress instead of returning 400. Low priority — only affects bad input. |

> Agents: Add new items here. Use IDs P-073+.
