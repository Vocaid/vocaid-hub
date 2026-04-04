# P-062: Agent-to-Agent Messaging Demo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a demo script that exercises the 4-agent communication flow (Seer signals Edge, Edge checks Shield, Shield clears/blocks, Lens logs reputation) — proving the fleet works for the World AgentKit track ($8k).

**Architecture:** A TypeScript script (`scripts/demo-agent-fleet.ts`) that simulates the full agent decision loop. If OpenClaw Gateway is running on `:18789`, it routes through the gateway. Otherwise, it runs the logic directly using our existing lib functions (`og-chain.ts`, `reputation.ts`, `contracts.ts`). The script logs each agent's action with timestamps and role labels, producing demo-ready console output.

**Tech Stack:** TypeScript, viem (contract reads), existing `src/lib/og-chain.ts` + `src/lib/reputation.ts`, dotenv

---

### Task 1: Create the demo agent fleet script

**Files:**
- Create: `scripts/demo-agent-fleet.ts`

**Step 1: Write the script**

The script runs a single "resource allocation decision" through all 4 agents:

```
1. SEER reads ResourcePrediction markets → detects price signal
2. SEER sends signal to EDGE: "H100 underpriced at $0.03, market says $0.05"
3. EDGE asks SHIELD: "Clear me to bet YES on market #1?"
4. SHIELD reads ValidationRegistry for the GPU provider → checks if verified
5. SHIELD responds: "CLEARED" or "BLOCKED — provider not verified"
6. If cleared: EDGE places bet via ResourcePrediction.placeBet()
7. LENS writes reputation feedback for the provider via ReputationRegistry.giveFeedback()
8. All actions logged to console with agent role labels
```

The script should:
- Use `dotenv/config` for env vars
- Use `readFileSync` to load `deployments/0g-galileo.json` for contract addresses
- Use viem `createPublicClient` for reads (no wallet needed for reads)
- Try OpenClaw Gateway first (`http://127.0.0.1:18789/api/chat`), fall back to direct contract reads
- Print colorized console output showing the agent relay:
  ```
  [SEER]   Scanning ResourcePrediction markets...
  [SEER]   Signal: Market #0 — H100 cost YES pool 62%, current price $0.03
  [SEER]   → Relaying signal to @edge
  [EDGE]   Received signal from Seer. Evaluating position...
  [EDGE]   → Requesting clearance from @shield for provider agentId #7
  [SHIELD] Checking ValidationRegistry for agent #7...
  [SHIELD] ✓ Validated: count=1, avgResponse=100 (TEE attestation passed)
  [SHIELD] → CLEARED for Edge to proceed
  [EDGE]   Placing 1 A0GI bet on YES for market #0
  [EDGE]   ✓ Bet placed (simulated — testnet may be unreachable)
  [LENS]   Writing reputation feedback for agent #7...
  [LENS]   ✓ Feedback: quality=85, tag=inference
  
  Fleet coordination complete. 4 agents, 1 decision cycle.
  ```
- Gracefully handle testnet SSL timeouts (0G Galileo issue)
- Save results to `deployments/fleet-demo-results.json`

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit scripts/demo-agent-fleet.ts 2>&1 | head -5`
Expected: No errors (or only import-related — acceptable for standalone script)

**Step 3: Commit**

```bash
git add scripts/demo-agent-fleet.ts
git commit -m "feat(agents): add 4-agent fleet demo script with Seer→Edge→Shield→Lens relay"
```

---

### Task 2: Update docs

**Files:**
- Modify: `docs/PENDING_WORK.md` — mark P-062 done
- Modify: `docs/ACTIVE_WORK.md` — add Agent 6 row
- Modify: `docs/WAVE_EXECUTION_PLAN.md` — note agent messaging exercised
- Modify: `scripts/demo-flow.md` — add fleet demo step to pre-flight

**Step 1: Mark P-062 done in PENDING_WORK.md**

Change P-062 status from `unclaimed` to `✅ done`, set Agent to `Agent 6`.

**Step 2: Add to demo-flow.md pre-flight checklist**

Add line: `- [ ] Agent fleet demo run: \`npx tsx scripts/demo-agent-fleet.ts\``

**Step 3: Commit**

```bash
git add docs/PENDING_WORK.md docs/ACTIVE_WORK.md docs/WAVE_EXECUTION_PLAN.md scripts/demo-flow.md
git commit -m "docs: mark P-062 agent-to-agent messaging complete"
```
