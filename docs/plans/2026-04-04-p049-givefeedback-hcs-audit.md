# P-049: Wire giveFeedback() + HCS Audit for Hedera AI/Agentic Track

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the agent fleet actually write reputation feedback on-chain AND log it to Hedera's HCS audit trail — proving AI agents autonomously execute Hedera transactions (Hedera AI/Agentic $6k track).

**Architecture:** After every successful x402 payment in `/api/payments`, the Lens agent auto-writes `giveFeedback()` on the 0G ReputationRegistry for the resource provider. This feedback event is then logged to HCS via `logAuditMessage()`. Additionally, the seed script gains a Phase 6 that writes initial reputation scores for the 4 demo agents. Both paths exercise the full chain: 0G write → Hedera HCS audit.

**Tech Stack:** @hashgraph/sdk (HCS), viem (0G ReputationRegistry), ethers (seed script), Next.js API routes

---

## File Ownership Check

| File | Owner | Action |
|------|-------|--------|
| `src/app/api/payments/route.ts` | Agent 3 ✓ | Modify — add giveFeedback + HCS after payment |
| `src/lib/hedera.ts` | Agent 3 ✓ | No changes needed |
| `scripts/seed-demo-data.ts` | Agent 8/12 | Modify — add Phase 6 reputation seeding |
| `docs/PENDING_WORK.md` | Shared | Update P-049 status |
| `docs/ACTIVE_WORK.md` | Shared | Claim + complete |

**Note:** `scripts/seed-demo-data.ts` was created by Agent 8 (done). Adding a new phase is safe — additive only, no existing code touched.

---

### Task 1: Add auto-feedback after payment settlement

**Files:**
- Modify: `src/app/api/payments/route.ts`

**Step 1: Add import**

At top of file, add:
```typescript
import { giveFeedback } from "@/lib/reputation";
```

**Step 2: Add feedback call after payment settles (after Step 4: Record in demo ledger)**

After `recentPayments.unshift(record)` (around line 131), add:

```typescript
    // Step 5: Lens agent writes reputation feedback for the resource provider
    // Demonstrates AI agent executing on-chain actions (Hedera AI/Agentic track)
    try {
      const feedbackResult = await giveFeedback({
        agentId: 0n, // Default provider — overridden when agentId available
        value: 95,
        tag1: "starred",
        tag2: "payment-verified",
        endpoint: "/api/payments",
        feedbackURI: `hedera:${settlement.txHash}`,
      });

      // Log feedback to HCS audit trail
      if (AUDIT_TOPIC_ID) {
        logAuditMessage(AUDIT_TOPIC_ID, JSON.stringify({
          type: "agent_feedback_submitted",
          agent: "lens",
          action: "giveFeedback",
          agentId: 0,
          value: 95,
          tag: "starred",
          feedbackTxHash: feedbackResult.txHash,
          paymentTxHash: settlement.txHash,
          timestamp: new Date().toISOString(),
        })).catch(console.error);
      }
    } catch (feedbackErr) {
      // Non-blocking — payment already settled
      console.error("Lens agent feedback failed:", feedbackErr);
    }
```

**Step 3: Update the step numbering in existing comments**

The existing "Step 5: Return the paid resource" becomes "Step 6".

**Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep payments`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/api/payments/route.ts
git commit -m "feat(hedera): Lens agent auto-writes reputation feedback + HCS audit after payment"
```

---

### Task 2: Add reputation seeding to seed-demo-data.ts

**Files:**
- Modify: `scripts/seed-demo-data.ts`

**Step 1: Add ReputationRegistry ABI to the ABIs section (after predictionABI)**

```typescript
const reputationABI = [
  { name: "giveFeedback", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" }, { name: "value", type: "uint256" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" }, { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" }, { name: "feedbackHash", type: "bytes32" },
    ], outputs: [] },
] as const;
```

**Step 2: Add Phase 6 after Phase 5 (before the SEED COMPLETE banner)**

```typescript
  // ── Phase 6: Seed reputation scores ───────────────────
  console.log("\nPhase 6: Seeding reputation scores...");
  const feedbacks: { id: bigint; tag: string; value: number }[] = [
    { id: agentIds[0], tag: "starred",     value: 82 },   // GPU-Alpha
    { id: agentIds[2], tag: "starred",     value: 95 },   // Seer
    { id: agentIds[3], tag: "starred",     value: 88 },   // Edge
    { id: agentIds[2], tag: "uptime",      value: 99 },   // Seer uptime
    { id: agentIds[3], tag: "successRate", value: 91 },   // Edge success
  ];
  for (const fb of feedbacks) {
    const fbHash = keccak256(toHex(`seed-${fb.id}-${fb.tag}-${Date.now()}`));
    const h = await walletClient.writeContract({
      address: C.ReputationRegistry, abi: reputationABI, functionName: "giveFeedback",
      args: [fb.id, BigInt(fb.value * 100), 2, fb.tag, "", "/seed", `seed:${fb.tag}`, fbHash],
      chain: ogGalileo,
    });
    await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
    console.log(`  Agent ${fb.id} ${fb.tag}: ${fb.value}`);
  }
```

**Step 3: Add Hedera HCS audit log at end of seed (optional but strengthens bounty)**

After Phase 6, add:
```typescript
  // ── Phase 7: Log seed event to Hedera HCS ─────────────
  const auditTopic = process.env.HEDERA_AUDIT_TOPIC;
  if (auditTopic) {
    console.log("\nPhase 7: Logging seed event to Hedera HCS...");
    const { logAuditMessage, initClient } = await import("../src/lib/hedera.ts");
    initClient();
    await logAuditMessage(auditTopic, JSON.stringify({
      type: "demo_seed_complete",
      agentIds: agentIds.map(String),
      markets: 3,
      feedbacks: feedbacks.length,
      timestamp: new Date().toISOString(),
    }));
    console.log("  Seed event logged to HCS topic " + auditTopic);
  }
```

**Step 4: Commit**

```bash
git add scripts/seed-demo-data.ts
git commit -m "feat(hedera): add reputation seeding + HCS audit log to seed script"
```

---

### Task 3: Test the feedback path manually

**Files:** None modified — read-only testing

**Step 1: Start dev server**
```bash
npx next dev --port 3001
```

**Step 2: Test POST /api/reputation directly (needs auth — will get 401)**
```bash
curl -s -X POST "http://localhost:3001/api/reputation" -H "Content-Type: application/json" -d '{"agentId":0,"value":90,"tag1":"starred"}'
```
Expected: `{"error":"Authentication required"}` (401 — proves gating works)

**Step 3: Test GET /api/reputation (needs auth — will get 401)**
```bash
curl -s "http://localhost:3001/api/reputation?agentId=0"
```
Expected: 401

**Step 4: Verify HCS audit has previous messages**
```bash
curl -s "http://localhost:3001/api/hedera/audit?topicId=0.0.8499635&limit=3"
```
Expected: 200 with messages array

**Step 5: Kill server**

---

### Task 4: Update docs and mark complete

**Files:**
- Modify: `docs/PENDING_WORK.md` — change P-049 status to `done`
- Modify: `docs/ACTIVE_WORK.md` — add completed row

**Step 1: Update P-049 in PENDING_WORK.md**

Change P-049 row from `unclaimed` to `✅ done`, agent = Agent 3.

**Step 2: Add row to ACTIVE_WORK.md**

```
| 3 | P-049: Wire giveFeedback + HCS audit for AI/Agentic track | `src/app/api/payments/route.ts`, `scripts/seed-demo-data.ts` | done | 2026-04-04TXX:XXZ | 2026-04-04TXX:XXZ |
```

**Step 3: Commit**
```bash
git add docs/PENDING_WORK.md docs/ACTIVE_WORK.md
git commit -m "docs: mark P-049 (giveFeedback + HCS audit) complete"
```

---

## Verification

After all tasks:
1. `grep "giveFeedback" src/app/api/payments/route.ts` → shows import + call
2. `grep "agent_feedback_submitted" src/app/api/payments/route.ts` → shows HCS audit
3. `grep "Phase 6" scripts/seed-demo-data.ts` → shows reputation seeding
4. `grep "Phase 7" scripts/seed-demo-data.ts` → shows HCS seed log
5. `grep "P-049" docs/PENDING_WORK.md` → shows `done`

## Bounty Evidence Chain

After implementation, the Hedera AI/Agentic track ($6k) has this evidence:
1. **Agent pays USDC** → `/api/payments` settles via Blocky402
2. **Agent writes feedback** → `giveFeedback()` on 0G ReputationRegistry
3. **Agent logs to HCS** → `logAuditMessage()` on Hedera topic 0.0.8499635
4. **Agent Kit executes** → `executeAgentAction("submit_topic_message", ...)` as primary path
5. **Seed script demonstrates** → 5 feedback scores + HCS seed event
