# Audit Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all residual Arc references, delete unused scaffold assets, and correct PENDING_WORK.md tracking accuracy.

**Architecture:** Direct edits to 3 text files + delete 5 SVGs. No code logic changes.

**Tech Stack:** Markdown, shell (rm)

---

### Task 1: Claim in ACTIVE_WORK.md

**Files:**
- Modify: `docs/ACTIVE_WORK.md` (Active Work table)

**Step 1: Add claim row**

Add to Active Work table:
```
| 9 | Audit cleanup: Arc refs + unused SVGs + PENDING_WORK accuracy | `agents/.agents/edge/soul.md`, `docs/TECHNOLOGY_RESEARCH.md`, `public/*.svg`, `docs/PENDING_WORK.md` | active | 2026-04-04T03:00Z | — |
```

---

### Task 2: Fix Arc→Hedera in Edge soul.md

**Files:**
- Modify: `agents/.agents/edge/soul.md:28`

**Step 1: Replace line 28**

Old: `- You operate ONLY on testnet chains (0G Galileo, Arc Testnet, World Sepolia).`
New: `- You operate ONLY on testnet chains (0G Galileo, Hedera Testnet, World Sepolia).`

**Step 2: Fix line 13 — stale "Circle x402" reference**

Old: `3. **Nanopayment Management** — Handle Circle x402 nanopayments for micro-transactions: pay-per-inference, pay-per-query, streaming payments to compute providers.`
New: `3. **Nanopayment Management** — Handle x402 USDC nanopayments via Blocky402 on Hedera for micro-transactions: pay-per-inference, pay-per-query, streaming payments to compute providers.`

**Step 3: Fix line 36 — stale "Circle x402" skill reference**

Old: `- Custom nanopayment skills (Circle x402)`
New: `- Custom nanopayment skills (x402 via Blocky402)`

---

### Task 3: Fix Arc reference in TECHNOLOGY_RESEARCH.md

**Files:**
- Modify: `docs/TECHNOLOGY_RESEARCH.md:15`

**Step 1: Remove Arc Testnet from deployment list**

Old: `- **Deployed on 30+ chains** including Hedera Testnet, Arc Testnet, Base, Arbitrum, Polygon, Mantle, Optimism`
New: `- **Deployed on 30+ chains** including Hedera Testnet, Base, Arbitrum, Polygon, Mantle, Optimism`

---

### Task 4: Delete unused scaffold SVGs

**Files:**
- Delete: `public/next.svg`
- Delete: `public/vercel.svg`
- Delete: `public/file.svg`
- Delete: `public/globe.svg`
- Delete: `public/window.svg`

**Step 1: Remove all 5 files**

```bash
rm public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
```

---

### Task 5: Fix PENDING_WORK.md — add new gap for soul.md

**Files:**
- Modify: `docs/PENDING_WORK.md` (Newly Discovered Gaps table)

**Step 1: Add P-046 for Edge soul.md Arc reference (will be done in same session)**

Add row:
```
| P-046 | Edge soul.md references "Arc Testnet" + "Circle x402" | ✅ done | Agent 9 | `agents/.agents/edge/soul.md` | Fixed: Arc→Hedera, Circle→Blocky402 |
```

Also add P-047 for unused SVGs:
```
| P-047 | 5 unused scaffold SVGs in public/ | ✅ done | Agent 9 | `public/*.svg` | Deleted next.svg, vercel.svg, file.svg, globe.svg, window.svg |
```

---

### Task 6: Mark complete in ACTIVE_WORK.md

**Files:**
- Modify: `docs/ACTIVE_WORK.md`

**Step 1: Update claim row status to done, add to Recently Completed**

---

## Verification

- [ ] `grep -r "Arc" agents/` returns no results
- [ ] `grep "Arc Testnet" docs/TECHNOLOGY_RESEARCH.md` returns no results
- [ ] `ls public/*.svg` returns no results
- [ ] PENDING_WORK.md has P-046 and P-047 marked done
