# P-071: Fix World ID verify-proof to use v4 API

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the verify-proof route to use the World ID v4 API endpoint so that `verify-human` action proofs validate successfully.

**Architecture:** The IDKit 4.0 README (node_modules/@worldcoin/idkit-core/README.md:91-98) explicitly documents the correct pattern: POST to `api/v4/verify/{RP_ID}` with `completion.result` forwarded directly as body. Our route was using the deprecated v2 endpoint with `app_id`. The fix is surgical: change the URL, use `rp_id`, and forward the payload directly instead of destructuring it.

**Tech Stack:** Next.js API route, @worldcoin/idkit 4.0, World Developer Portal v4 API

---

### Task 1: Update verify-proof route to v4 API

**Files:**
- Modify: `src/app/api/verify-proof/route.ts`

**Step 1: Change the endpoint URL and payload forwarding**

The current code (lines 28-38):
```typescript
const { payload, action, signal } = (await req.json()) as IRequestPayload;
const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;

const response = await fetch(
  `https://developer.worldcoin.org/api/v2/verify/${app_id}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, action, signal }),
  },
);
```

Replace with:
```typescript
const body = await req.json();
const { payload, action, signal } = body as IRequestPayload;
const rp_id = process.env.RP_ID ?? process.env.WORLD_RP_ID;
const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;

// World ID 4.0 uses v4 endpoint with rp_id; fall back to v2 with app_id
const verifyUrl = rp_id
  ? `https://developer.worldcoin.org/api/v4/verify/${rp_id}`
  : `https://developer.worldcoin.org/api/v2/verify/${app_id}`;

// IDKit 4.0: forward completion.result directly as body
// Legacy: spread payload fields with action + signal
const verifyBody = rp_id
  ? JSON.stringify(payload)
  : JSON.stringify({ ...payload, action, signal });

const response = await fetch(verifyUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: verifyBody,
});
```

**Step 2: Update the IRequestPayload type to accept v4 shape**

```typescript
interface IRequestPayload {
  payload: {
    // v4 fields
    protocol_version?: string;
    nonce?: string;
    action?: string;
    responses?: unknown[];
    // v2 legacy fields
    merkle_root?: string;
    nullifier_hash?: string;
    proof?: string;
    [key: string]: unknown;
  };
  action: string;
  signal: string | undefined;
}
```

**Step 3: Handle the on-chain registration for both v2 and v4 payloads**

The CredentialGate registration uses `merkle_root`, `nullifier_hash`, `proof` which are v2 fields. For v4, these are nested in `responses[0]`. The on-chain call should only attempt if we have the v2 fields (when `allow_legacy_proofs: true` is used in IDKit, it returns v2-compatible fields).

Wrap the on-chain block:
```typescript
if (signal && process.env.CREDENTIAL_GATE && payload.merkle_root && payload.proof) {
```
(Add `payload.merkle_root && payload.proof` guard)

**Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep verify-proof`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/api/verify-proof/route.ts
git commit -m "fix(world): update verify-proof to World ID v4 API endpoint"
```

---

### Task 2: Add RP_ID to .env.example

**Files:**
- Modify: `.env.example`

**Step 1: Check if RP_ID is already in .env.example**

It's already present (line 9: `RP_ID=rp_21826eb5449cc811`). No change needed.

---

### Task 3: Test the fix

**Step 1: Start dev server**
```bash
rm -rf .next && npx next dev --port 3001
```

**Step 2: Test v4 verify endpoint**
```bash
curl -sk -X POST "https://developer.worldcoin.org/api/v4/verify/rp_21826eb5449cc811" \
  -H "Content-Type: application/json" \
  -d '{"protocol_version":"4.0","nonce":"test","action":"verify-human","responses":[]}'
```
Expected: NOT `invalid_action` — should return a different error (e.g., `invalid_proof` or `missing_responses`)

**Step 3: Test verify-proof route forwards correctly**
```bash
curl -s -X POST "http://localhost:3001/api/verify-proof" \
  -H "Content-Type: application/json" \
  -d '{"payload":{"protocol_version":"4.0","nonce":"test","action":"verify-human","responses":[]},"action":"verify-human"}'
```
Expected: Error from World API but NOT `invalid_action`

**Step 4: Kill server**

---

### Task 4: Update docs

**Files:**
- Modify: `docs/PENDING_WORK.md` — change P-071 status to `done`
- Modify: `docs/ACTIVE_WORK.md` — add completed row

**Step 1: Update P-071 status**

**Step 2: Commit**
```bash
git add docs/PENDING_WORK.md docs/ACTIVE_WORK.md
git commit -m "docs: mark P-071 (World ID v4 API) done"
```

---

## Verification

1. `grep "v4/verify" src/app/api/verify-proof/route.ts` → shows v4 endpoint
2. `grep "RP_ID" src/app/api/verify-proof/route.ts` → shows rp_id usage
3. curl to v4 endpoint returns non-`invalid_action` error
4. `grep "P-071.*done" docs/PENDING_WORK.md` → confirmed
