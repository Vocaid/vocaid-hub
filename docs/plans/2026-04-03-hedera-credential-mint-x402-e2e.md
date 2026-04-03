# Hedera: World ID → HTS Credential Mint + x402 E2E Test

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After World ID verification succeeds, automatically mint a VocaidCredential (VCRED) NFT on Hedera to the user, then verify the x402 payment flow works end-to-end.

**Architecture:** The verify-proof API route already calls `registerOnChain()` on World Chain. We add a second step: call `mintAndTransferCredential()` on Hedera to issue a soulbound VCRED NFT. The credential metadata contains the user's World ID nullifier hash as proof of verification. For x402, we test the full Blocky402 flow (verify → settle → HCS audit log).

**Tech Stack:** @hashgraph/sdk (HTS, HCS), Blocky402 x402, Next.js API routes, viem (World Chain)

---

## Agent 3 File Ownership

- `src/lib/hedera.ts` — owned, can modify
- `src/app/api/payments/route.ts` — owned, can modify
- `deployments/hedera-testnet.json` — owned, can modify

Files we read but DON'T modify (other agents' ownership):
- `src/app/api/verify-proof/route.ts` — Agent 2, but we need to add the credential mint hook here

**Coordination note:** Task 1 modifies `verify-proof/route.ts` which is Agent 2's file. Since Agent 2's work is marked `done` in ACTIVE_WORK.md, this is safe.

---

### Task 1: Add HTS credential mint to verify-proof route

**Files:**
- Modify: `src/app/api/verify-proof/route.ts` — add credential mint after on-chain registration

**Step 1: Add the credential mint call**

After the existing `registerOnChain()` call succeeds, call `mintAndTransferCredential()` from `src/lib/hedera.ts`. The credential metadata contains the nullifier hash and timestamp.

Add import at top:
```typescript
import { mintAndTransferCredential } from '@/lib/hedera';
```

Inside the `if (verifyRes.success)` block, after `registerOnChain`, add:
```typescript
// Mint VCRED credential NFT on Hedera
let credentialResult = null;
const credentialTokenId = process.env.HEDERA_CREDENTIAL_TOKEN;
if (credentialTokenId && signal) {
  try {
    const metadata = new TextEncoder().encode(
      JSON.stringify({
        type: "world-id-verified",
        address: signal,
        nullifierHash: payload.nullifier_hash,
        verifiedAt: new Date().toISOString(),
      })
    );
    // Note: recipientAccountId needs to be a Hedera account ID, not an EVM address
    // For demo, we mint to the operator treasury and log the association
    const serials = await mintAndTransferCredential(
      credentialTokenId,
      [metadata],
      process.env.HEDERA_OPERATOR_ID ?? "0.0.8368570",
    );
    credentialResult = { tokenId: credentialTokenId, serials };
  } catch (err) {
    console.error('Hedera credential mint failed:', err);
  }
}
```

Update the success return to include `credentialResult`:
```typescript
return NextResponse.json({ verifyRes, onChainResult, credentialResult, status: 200 });
```

**Step 2: Test the import compiles**

Run: `npx tsc --noEmit 2>&1 | grep verify-proof`
Expected: No errors for verify-proof

**Step 3: Commit**

```bash
git add src/app/api/verify-proof/route.ts
git commit -m "feat(hedera): mint VCRED credential NFT after World ID verification"
```

---

### Task 2: Add HCS audit log for credential mints

**Files:**
- Modify: `src/app/api/verify-proof/route.ts` — add HCS audit after mint

**Step 1: Add audit logging**

Add import:
```typescript
import { logAuditMessage } from '@/lib/hedera';
```

After the credential mint succeeds, log to HCS:
```typescript
if (credentialResult) {
  const auditTopic = process.env.HEDERA_AUDIT_TOPIC;
  if (auditTopic) {
    logAuditMessage(auditTopic, JSON.stringify({
      type: "credential_minted",
      tokenId: credentialResult.tokenId,
      serials: credentialResult.serials,
      address: signal,
      timestamp: new Date().toISOString(),
    })).catch(console.error);
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/verify-proof/route.ts
git commit -m "feat(hedera): log credential mints to HCS audit trail"
```

---

### Task 3: Test x402 payment flow end-to-end

**Files:**
- No code changes — this is a manual test

**Step 1: Start dev server**
```bash
npx next dev --port 3001
```

**Step 2: Test 402 response (no payment header)**
```bash
curl -s -X POST "http://localhost:3001/api/payments" \
  -H "Content-Type: application/json" | jq .
```
Expected: `{ "error": "Authentication required" }` (401 — World ID gate) OR `{ "error": "Payment Required", "accepts": {...} }` (402)

**Step 3: Test Blocky402 facilitator is reachable**
```bash
curl -sk "https://api.testnet.blocky402.com/supported" | jq .
```
Expected: JSON with supported networks including hedera-testnet

**Step 4: Test HCS audit endpoint**
```bash
curl -s "http://localhost:3001/api/hedera/audit?topicId=0.0.8499635&limit=5" | jq .
```
Expected: JSON with the system_test message from earlier

**Step 5: Kill server**

---

### Task 4: Test credential mint directly (script)

**Files:**
- Create: `scripts/test-credential-mint.ts` (temporary, delete after)

**Step 1: Write test script**

```typescript
import { mintCredential, initClient } from "../src/lib/hedera.ts";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  initClient();
  const tokenId = process.env.HEDERA_CREDENTIAL_TOKEN ?? "0.0.8499633";
  
  const metadata = new TextEncoder().encode(
    JSON.stringify({
      type: "world-id-verified",
      address: "0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE",
      verifiedAt: new Date().toISOString(),
    })
  );
  
  console.log("Minting credential NFT...");
  const serials = await mintCredential(tokenId, [metadata]);
  console.log(`✓ Minted serial(s): ${serials.join(", ")}`);
  console.log(`View: https://testnet.hashscan.io/token/${tokenId}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

**Step 2: Run the test**
```bash
npx tsx scripts/test-credential-mint.ts
```
Expected: `✓ Minted serial(s): 1`

**Step 3: Verify on HashScan**
```bash
curl -sk "https://testnet.mirrornode.hedera.com/api/v1/tokens/0.0.8499633/nfts" | head -200
```
Expected: NFT with serial 1 and metadata

**Step 4: Clean up and commit**
```bash
rm scripts/test-credential-mint.ts
```

---

### Task 5: Update ACTIVE_WORK.md — mark complete

**Files:**
- Modify: `docs/ACTIVE_WORK.md`

**Step 1: Update Agent 3 row**

Change status from `in-progress` to `done` and add completion timestamp.

**Step 2: Commit**
```bash
git add docs/ACTIVE_WORK.md
git commit -m "docs: mark Agent 3 Hedera work complete"
```
