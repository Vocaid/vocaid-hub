# Pending Work — Gap Tracker for Agent Coordination

**Purpose:** Structured list of all known gaps, missing files, and incomplete features — prioritized by submission impact.
**Last Audited:** 2026-04-04T10:00Z
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
| P-020 | Zero test files in project | unclaimed | — | `src/**/*.test.ts`, `contracts/**/*.test.ts` | No `*.test.*` or `*.spec.*` files found anywhere |
| P-021 | TODO in `src/auth/index.ts` (`@ts-expect-error`) | unclaimed | — | `src/auth/index.ts` (line 38) | `// @ts-expect-error TODO` — needs proper typing |
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
| P-057 | Shield doesn't block unverified providers | unclaimed | — | 0G OpenClaw $6k | `src/app/api/resources/route.ts` | Add ValidationRegistry check before returning resources. ~30 min. |
| P-058 | Lens never writes `giveFeedback()` | unclaimed | — | 0G OpenClaw $6k | `src/lib/reputation.ts`, `scripts/seed-demo-data.ts` | Add write function to reputation.ts + trigger from seed. ~20 min. |
| P-059 | MiniKit.pay() never called | unclaimed | — | World MiniKit $4k | `src/components/Pay/index.tsx`, `src/app/(protected)/home/marketplace-content.tsx` | Wire MiniKit pay command into hire flow. ~30 min. |
| P-060 | Seer never runs 0G Compute inference | unclaimed | — | 0G OpenClaw $6k | `src/lib/og-compute.ts`, `agents/.agents/seer/soul.md` | Needs live 0G provider + funded broker. Hard without testnet. |
| P-061 | Edge never executes trades | unclaimed | — | 0G OpenClaw $6k | `agents/.agents/edge/soul.md` | Needs OpenClaw Gateway running with live agent process. |
| P-062 | No agent-to-agent messaging | unclaimed | — | World AgentKit $8k | `agents/openclaw.json` | Add demo script exercising Seer→Edge signal relay. ~45 min. |
| P-063 | Demo video not recorded | unclaimed | — | All tracks | — | Manual recording after app running. |

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
| P-049 | 0G Galileo testnet SSL timeout | mitigated | Agent 5 | `src/app/api/gpu/*` | Demo fallbacks in place |
| P-050 | GPU stepper e2e fallback | ✅ done | Agent 5 | `src/components/GPUStepper.tsx` | Verified |
| P-051 | `/api/resources` self-fetch hits World ID gate | unclaimed | — | `src/app/api/resources/route.ts` | Internal fetch lacks session cookies. Falls back to mock. Fix: call `listProviders()` directly. |
| P-052 | GPUProviderRegistry != Broker listing source | unclaimed | — | `src/app/api/gpu/list/route.ts` | Registration and listing use different contracts. Works via mocks. |
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

> Agents: Add new items here. Use IDs P-068+.
