# Pending Work — Gap Tracker for Agent Coordination

**Purpose:** Structured list of all known gaps, missing files, and incomplete features — prioritized by submission impact.
**Last Audited:** 2026-04-03T23:45Z
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

## 🆕 Newly Discovered Gaps

| ID | Item | Status | Agent | Target Files | Reference |
|----|------|--------|-------|-------------|-----------|
| P-040 | Edge agent card references "Arc network" | ✅ done | Agent 14 | `public/agent-cards/edge.json` | Fixed to reference Hedera |
| P-041 | AgentCard.tsx used hardcoded dark theme colors | ✅ done | Agent 2 | `src/components/AgentCard.tsx` | Replaced gray-800/900, blue-400 etc with design system tokens |
| P-042 | AuthButton error text used hardcoded red-400 | ✅ done | Agent 2 | `src/components/AuthButton/index.tsx` | Changed to text-status-failed |
| P-043 | predictions/claim and predictions/resolve have no World ID gating | unclaimed | — | `src/app/api/predictions/[id]/claim/route.ts`, `src/app/api/predictions/[id]/resolve/route.ts` | Anyone can resolve markets or claim winnings without verification |
| P-044 | /api/agents/register has no UI caller | unclaimed | — | `src/app/api/agents/register/route.ts` | Orphaned endpoint — functional but not wired to any frontend component |
| P-045 | RP_SIGNING_KEY not configured — rp-signature returns 500 | unclaimed | — | `src/app/api/rp-signature/route.ts`, `.env.local` | World ID 4.0 IDKit verification flow requires RP signing key |

> Agents: Add new items here as you discover them during implementation. Use IDs P-046+.
