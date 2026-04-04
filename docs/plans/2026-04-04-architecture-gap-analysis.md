# Architecture Gap Analysis + Mock Call Testing + Documentation Audit

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify all API routes respond correctly via mock curl calls, fix documentation inconsistencies, and close remaining gaps before submission.

**Architecture:** Start dev server, systematically curl every API route recording results, fix all doc inconsistencies found, update PENDING_WORK.md with new gaps.

**Tech Stack:** curl, Next.js dev server, grep for verification

---

## Findings Summary

### API Route Audit (17 routes found)
- 10 routes have World ID gating — **good**
- 7 routes are public (auth, verify-proof, rp-signature, world-id/check, hedera/audit, initiate-payment, payments GET)
- 2 prediction routes (`claim`, `resolve`) are **public but should arguably have gating** — log as gap
- `/api/agents/register` has no UI caller — orphaned but functional

### Documentation Issues Found
1. **ARCHITECTURE.md** line 30: shows `app/` not `src/app/` — wrong prefix
2. **ARCHITECTURE.md** lines 69-72: missing `[id]/claim/` and `[id]/resolve/` prediction routes
3. **README.md** line 219: says "15 server-side API routes" — actual count is 17
4. **README.md** lines 156-157: missing `/api/predictions/[id]/claim` and `/api/predictions/[id]/resolve`

### Contract Wiring
- All ABI signatures match deployed contracts — **verified**
- All .env.local addresses match deployments/*.json — **verified**
- No circular imports — **verified**
- All libs safe at import time (throw only at runtime) — **verified**

---

## Tasks

### Task 1: Mock-call every public API route

**Files:** None modified — read-only testing

**Step 1: Start dev server**
```bash
npx next dev --port 3001
```

**Step 2: Test each public route with curl**

```bash
# 1. world-id/check (public, needs address param)
curl -s "http://localhost:3001/api/world-id/check?address=0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE"
# Expected: {"verified":false,"address":"0x..."}

# 2. hedera/audit (public, needs topicId)
curl -s "http://localhost:3001/api/hedera/audit?topicId=0.0.8499635&limit=3"
# Expected: {"topicId":"0.0.8499635","count":N,"messages":[...]}

# 3. initiate-payment (public, needs body)
curl -s -X POST "http://localhost:3001/api/initiate-payment" -H "Content-Type: application/json" -d '{"resourceName":"GPU-Alpha"}'
# Expected: 200 with payment requirements (network, token, amount)

# 4. payments GET (public, returns in-memory ledger)
curl -s "http://localhost:3001/api/payments"
# Expected: {"payments":[]}

# 5. verify-proof (public, will fail with invalid proof but should not 500)
curl -s -X POST "http://localhost:3001/api/verify-proof" -H "Content-Type: application/json" -d '{"payload":{"merkle_root":"0x1","nullifier_hash":"0x2","proof":"0x01","verification_level":"orb"},"action":"verify-human","signal":"0x1"}'
# Expected: {"verifyRes":{"code":"..."},"status":400}

# 6. rp-signature (public, needs RP_SIGNING_KEY)
curl -s -X POST "http://localhost:3001/api/rp-signature" -H "Content-Type: application/json" -d '{"action":"verify-human"}'
# Expected: 200 with signature data OR 500 if RP_SIGNING_KEY missing

# 7. agents GET (no World ID gate)
curl -s "http://localhost:3001/api/agents"
# Expected: {"agents":[...],"count":N} or 500 if 0G RPC fails
```

**Step 3: Test gated routes (expect 401)**

```bash
# 8. resources (gated)
curl -s "http://localhost:3001/api/resources"
# Expected: {"error":"Authentication required"} 401

# 9. gpu/list (gated)
curl -s "http://localhost:3001/api/gpu/list"
# Expected: 401

# 10. predictions GET (gated)
curl -s "http://localhost:3001/api/predictions"
# Expected: 401

# 11. reputation GET (gated)
curl -s "http://localhost:3001/api/reputation"
# Expected: 401

# 12. payments POST (gated)
curl -s -X POST "http://localhost:3001/api/payments"
# Expected: 401

# 13. predictions/1/bet (gated)
curl -s -X POST "http://localhost:3001/api/predictions/1/bet" -H "Content-Type: application/json" -d '{"side":"yes","amount":1}'
# Expected: 401

# 14. predictions/1/claim (NOT gated — potential gap)
curl -s -X POST "http://localhost:3001/api/predictions/1/claim"
# Expected: 400 or 500 (but NOT 401 — no auth check)

# 15. predictions/1/resolve (NOT gated — potential gap)
curl -s -X POST "http://localhost:3001/api/predictions/1/resolve" -H "Content-Type: application/json" -d '{"outcome":"yes"}'
# Expected: 400 or 500 (but NOT 401 — no auth check)
```

**Step 4: Record results — note any unexpected 500s**

**Step 5: Kill dev server**

---

### Task 2: Fix ARCHITECTURE.md — missing prediction routes + src/ prefix

**Files:**
- Modify: `docs/ARCHITECTURE.md:30` — add `src/` prefix to project structure
- Modify: `docs/ARCHITECTURE.md:69-72` — add `claim/` and `resolve/` sub-routes

**Step 1: Fix project structure prefix**

Change line 30 from:
```
├── app/                       # Next.js 15 App Router
```
to:
```
├── src/
│   ├── app/                   # Next.js 15 App Router
```

And close the `src/` block after components section.

**Step 2: Add missing prediction routes**

After line 72 (`└── route.ts # Place bet`), add:
```
│       │       ├── claim/
│       │       │   └── route.ts # Claim winnings
│       │       └── resolve/
│       │           └── route.ts # Resolve market outcome
```

**Step 3: Commit**
```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: fix ARCHITECTURE.md project structure prefix and missing prediction routes"
```

---

### Task 3: Fix README.md — missing routes + route count

**Files:**
- Modify: `README.md:156-157` — add claim and resolve routes
- Modify: `README.md:219` — change "15" to "17"

**Step 1: Add missing routes to API table**

After line 157 (`/api/predictions/[id]/bet`), add:
```
| `/api/predictions/[id]/claim` | POST | Claim prediction market winnings | 0G |
| `/api/predictions/[id]/resolve` | POST | Resolve prediction market outcome | 0G |
```

**Step 2: Fix route count**

Change line 219 from `15 server-side API routes` to `17 server-side API routes`.

**Step 3: Commit**
```bash
git add README.md
git commit -m "docs: add missing prediction routes to README + fix route count"
```

---

### Task 4: Log new gaps in PENDING_WORK.md

**Files:**
- Modify: `docs/PENDING_WORK.md` — add newly discovered gaps

**Step 1: Add new items to "Newly Discovered Gaps" section**

```markdown
| P-043 | predictions/claim and predictions/resolve have no World ID gating | unclaimed | — | `src/app/api/predictions/[id]/claim/route.ts`, `src/app/api/predictions/[id]/resolve/route.ts` | Anyone can resolve markets or claim winnings without verification |
| P-044 | /api/agents/register has no UI caller | unclaimed | — | `src/app/api/agents/register/route.ts` | Orphaned endpoint — functional but not wired to any frontend component |
```

**Step 2: Commit**
```bash
git add docs/PENDING_WORK.md
git commit -m "docs: log prediction gating + orphaned register route gaps in PENDING_WORK"
```

---

### Task 5: Update ACTIVE_WORK.md + final commit

**Files:**
- Modify: `docs/ACTIVE_WORK.md` — add row for this audit task

**Step 1: Add completed task row**

```
| 3 | Architecture gap analysis + mock call testing + documentation audit | `docs/ARCHITECTURE.md`, `README.md`, `docs/PENDING_WORK.md` | done | 2026-04-04T01:30Z | 2026-04-04T02:00Z |
```

**Step 2: Commit**
```bash
git add docs/ACTIVE_WORK.md
git commit -m "docs: complete architecture gap analysis and mock call audit"
```

---

## Verification

After all tasks:
1. `grep "src/app/" docs/ARCHITECTURE.md | head -1` → should show `src/app/` prefix
2. `grep "claim" docs/ARCHITECTURE.md` → should find claim route
3. `grep "17 server-side" README.md` → should match
4. `grep "P-043\|P-044" docs/PENDING_WORK.md` → should find both new items
5. All mock curl calls documented with actual results in commit messages
