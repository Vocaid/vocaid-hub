# Title & Slogan Consistency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all instances of "Hybrid Resource Allocation" with "Reliable Resources for the Agentic Economy" across all 20 files.

**Architecture:** Global find-and-replace across code, docs, configs, and scripts. Title format: `Vocaid Hub — Reliable Resources for the Agentic Economy`. Three commit batches: code (layout + package + agent-card), submission assets (README, SUBMISSION, demo-flow), docs (all planning docs).

**Tech Stack:** Markdown, TypeScript, JSON

---

### Task 1: Code files — layout.tsx, package.json, agent-card route

**Files:**
- Modify: `src/app/layout.tsx:19-20,28,36`
- Modify: `package.json:5`
- Modify: `src/app/.well-known/agent-card.json/route.ts:27`

**Step 1: Update layout.tsx metadata (3 title instances)**

Replace `'Vocaid Hub — Hybrid Resource Allocation'` with `'Vocaid Hub — Reliable Resources for the Agentic Economy'` in all 3 occurrences (title, openGraph.title, twitter.title).

**Step 2: Update package.json description**

Replace `"Hybrid Resource Allocation Protocol for the Agentic Economy"` with `"Reliable Resources for the Agentic Economy"`.

**Step 3: Update agent-card route**

Replace `"Hybrid Resource Allocation Protocol"` with `"Reliable Resources for the Agentic Economy"`.

**Step 4: Verify build**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/app/layout.tsx package.json src/app/.well-known/agent-card.json/route.ts
git commit -m "brand: update title to 'Reliable Resources for the Agentic Economy' in code"
```

---

### Task 2: Submission assets — README.md, SUBMISSION.md, scripts/demo-flow.md

**Files:**
- Modify: `README.md:10`
- Modify: `SUBMISSION.md:7`
- Modify: `scripts/demo-flow.md:3`

**Step 1: Update README.md**

Replace `**Hybrid Resource Allocation Protocol for the Agentic Economy**` with `**Reliable Resources for the Agentic Economy**`.

**Step 2: Update SUBMISSION.md**

Replace `Vocaid Hub — Hybrid Resource Allocation for the Agentic Economy` with `Vocaid Hub — Reliable Resources for the Agentic Economy`.

**Step 3: Update demo-flow.md**

Replace `**Hybrid Resource Allocation: World (Trust) + 0G (Verify) + Hedera (Settle)**` with `**Reliable Resources for the Agentic Economy: World (Trust) + 0G (Verify) + Hedera (Settle)**`.

**Step 4: Commit**

```bash
git add README.md SUBMISSION.md scripts/demo-flow.md
git commit -m "brand: update title in submission assets (README, SUBMISSION, demo-flow)"
```

---

### Task 3: Core docs — ARCHITECTURE, DESIGN_SYSTEM, PITCH_STRATEGY, STRATEGIC_ASSESSMENT, WAVE_EXECUTION_PLAN

**Files:**
- Modify: `docs/ARCHITECTURE.md:1`
- Modify: `docs/DESIGN_SYSTEM.md:1`
- Modify: `docs/PITCH_STRATEGY.md:49,165`
- Modify: `docs/STRATEGIC_ASSESSMENT.md:10,15`
- Modify: `docs/WAVE_EXECUTION_PLAN.md:1,7`

**Step 1: Update all 5 doc headers/references**

Use `replace_all` where "Hybrid Resource Allocation" appears as a standalone phrase. Context-dependent replacements:

- Headers like `# ... Hybrid Resource Allocation` → `# ... Reliable Resources for the Agentic Economy`
- Subtitle in PITCH_STRATEGY: `Hybrid Resource Allocation for the Agentic Economy` → `Reliable Resources for the Agentic Economy`
- WAVE_EXECUTION_PLAN evolution line: keep `v3 Hybrid Resource Exchange → v4` as historical context, update the title portion only
- STRATEGIC_ASSESSMENT line 15 (developer quote): keep as-is — it's a historical quote from a conversation

**Step 2: Commit**

```bash
git add docs/ARCHITECTURE.md docs/DESIGN_SYSTEM.md docs/PITCH_STRATEGY.md docs/STRATEGIC_ASSESSMENT.md docs/WAVE_EXECUTION_PLAN.md
git commit -m "brand: update title in core planning docs"
```

---

### Task 4: Secondary docs — CURSOR_SETUP, TECHNOLOGY_RESEARCH, MARKET_RISK_ASSESSMENT, PRE_HACKATHON_CHECKLIST

**Files:**
- Modify: `docs/CURSOR_SETUP.md:1,127,131`
- Modify: `docs/TECHNOLOGY_RESEARCH.md:4`
- Modify: `docs/MARKET_RISK_ASSESSMENT.md:1,5,14`
- Modify: `docs/PRE_HACKATHON_CHECKLIST.md:1`

**Step 1: Update all secondary doc references**

Same pattern: replace "Hybrid Resource Allocation" with "Reliable Resources for the Agentic Economy" in headers and descriptions.

**Step 2: Commit**

```bash
git add docs/CURSOR_SETUP.md docs/TECHNOLOGY_RESEARCH.md docs/MARKET_RISK_ASSESSMENT.md docs/PRE_HACKATHON_CHECKLIST.md
git commit -m "brand: update title in secondary planning docs"
```

---

### Task 5: Scripts + deployments + plan docs

**Files:**
- Modify: `scripts/setup-hedera.ts:46`
- Modify: `scripts/dev.sh:3,255`
- Modify: `deployments/hedera-testnet.json:23`
- Modify: `docs/plans/2026-04-03-wave4-polish-submission-demo.md:55,501,668`
- Modify: `docs/plans/2026-04-03-wave4-demo-submission.md:333`

**Step 1: Update scripts and deployment artifacts**

Note: `deployments/hedera-testnet.json` memo field is already on-chain — changing the file won't change what's on Hedera. Update for consistency only.

**Step 2: Update plan docs**

Historical plan docs — update for consistency.

**Step 3: Commit**

```bash
git add scripts/ deployments/hedera-testnet.json docs/plans/
git commit -m "brand: update title in scripts, deployments, and plan docs"
```

---

### Task 6: Update ACTIVE_WORK.md + verify README consistency

**Files:**
- Modify: `docs/ACTIVE_WORK.md`

**Step 1: Add done row to ACTIVE_WORK.md**

**Step 2: Verify README.md consistency**

Run: `grep -n "Hybrid Resource" README.md` — expected: 0 results
Run: `grep -n "Reliable Resources" README.md` — expected: 1+ results
Run: `grep -rn "Hybrid Resource Allocation" src/ scripts/ docs/ README.md SUBMISSION.md package.json` — expected: only historical context lines (STRATEGIC_ASSESSMENT developer quote, WAVE_EXECUTION_PLAN evolution line)

**Step 3: Commit**

```bash
git add docs/ACTIVE_WORK.md
git commit -m "docs: mark title consistency update complete in ACTIVE_WORK.md"
```

---

## Verification

1. `grep -rn "Hybrid Resource Allocation" src/ package.json README.md SUBMISSION.md` → 0 results
2. `grep -rn "Reliable Resources" src/app/layout.tsx` → 3 results (title, OG, twitter)
3. `grep -rn "Reliable Resources" README.md` → 1 result
4. `npx tsc --noEmit --skipLibCheck` → 0 errors
5. README.md title matches layout.tsx title matches SUBMISSION.md title
