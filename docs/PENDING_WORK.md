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
| P-010 | Missing `error.tsx` for gpu-verify | unclaimed | — | `src/app/gpu-verify/error.tsx` | [ARCHITECTURE.md](ARCHITECTURE.md) — error boundaries per route |
| P-011 | Missing `loading.tsx` for gpu-verify | ✅ done | Agent 6 | `src/app/gpu-verify/loading.tsx` | File exists |
| P-012 | Missing root `error.tsx` | unclaimed | — | `src/app/error.tsx` | Next.js best practice — global error boundary |
| P-013 | Missing root `loading.tsx` | unclaimed | — | `src/app/loading.tsx` | Next.js best practice — global loading shell |
| P-014 | Demo seed data script verification | ✅ done | Agent 8 | `scripts/seed-demo-data.ts` | [ACTIVE_WORK.md](ACTIVE_WORK.md) — Agent 8 completed |
| P-015 | Demo flow script | ✅ done | Agent 8 | `scripts/demo-flow.md` | [ACTIVE_WORK.md](ACTIVE_WORK.md) — Agent 8 completed |

---

## 🟠 Medium Priority (Robustness)

| ID | Item | Status | Agent | Target Files | Reference |
|----|------|--------|-------|-------------|-----------|
| P-020 | Zero test files in project | unclaimed | — | `src/**/*.test.ts`, `contracts/**/*.test.ts` | No `*.test.*` or `*.spec.*` files found anywhere |
| P-021 | TODO in `src/auth/index.ts` (`@ts-expect-error`) | unclaimed | — | `src/auth/index.ts` (line 38) | `// @ts-expect-error TODO` — needs proper typing |
| P-022 | Agent directory verification | ✅ done | Agent 4 | `agents/.agents/*/soul.md` | All 4 soul.md files exist (seer, edge, shield, lens) |
| P-023 | Hedera deployment verification via Mirror Node | unclaimed | — | `src/app/api/hedera/audit/route.ts` | Verify HTS token + HCS topic exist on-chain via `testnet.hashscan.io` |

---

## 🔵 Low Priority (Polish)

| ID | Item | Status | Agent | Target Files | Reference |
|----|------|--------|-------|-------------|-----------|
| P-030 | Package name still `@worldcoin/next-15-template` | ✅ done | Agent 14 | `package.json` | Fixed to `vocaid-hub` |
| P-031 | Favicon + OG images need branding | unclaimed | — | `public/favicon.ico`, `public/og-image.png`, `src/app/layout.tsx` | Default World template assets |
| P-032 | `README-minikit.md` leftover from scaffold | unclaimed | — | `README-minikit.md` | Delete or archive — replaced by comprehensive README.md |

---

## 🆕 Newly Discovered Gaps

| ID | Item | Status | Agent | Target Files | Reference |
|----|------|--------|-------|-------------|-----------|
| P-040 | Edge agent card references "Arc network" | ✅ done | Agent 14 | `public/agent-cards/edge.json` | Fixed to reference Hedera |
| — | — | — | — | — | — |

> Agents: Add new items here as you discover them during implementation. Use IDs P-041+.
