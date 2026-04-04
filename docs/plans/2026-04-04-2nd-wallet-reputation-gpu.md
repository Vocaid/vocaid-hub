# P-069 + P-070: 2nd Wallet for Reputation Feedback + GPU-Beta

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Use 2nd wallet (0xf45b62b9c83c2Ed4B3D499CcF261eEED88bFb670) to write on-chain reputation scores and register GPU-Beta, fixing the self-feedback and 1-provider-per-wallet limitations.

**Architecture:** The seed script Phase 6 already has all the code — it conditionally runs when `DEMO_WALLET_KEY` is set. The fix is: fund the wallet, set the env var, re-run the seed script. No code changes needed.

**Tech Stack:** 0G Galileo testnet, viem, Solidity (existing contracts)

---

## Pre-requisite: Fund the 2nd wallet

**Before ANY task below**, fund `0xf45b62b9c83c2Ed4B3D499CcF261eEED88bFb670` on 0G Galileo testnet:

1. Go to https://faucet.0g.ai
2. Paste address: `0xf45b62b9c83c2Ed4B3D499CcF261eEED88bFb670`
3. Request testnet A0GI tokens
4. Verify balance:
```bash
cast balance 0xf45b62b9c83c2Ed4B3D499CcF261eEED88bFb670 --rpc-url https://evmrpc-testnet.0g.ai
```
Expected: non-zero balance (need ~0.1 A0GI for gas)

---

### Task 1: Set DEMO_WALLET_KEY in .env.local

**Files:**
- Modify: `.env.local`

**Step 1: Add the private key**

Add this line to `.env.local` (the user will provide the actual key):
```
DEMO_WALLET_KEY=0x<private_key_for_0xf45b62b9c83c2Ed4B3D499CcF261eEED88bFb670>
```

**Step 2: Verify the key derives the correct address**

```bash
npx tsx -e "
import { privateKeyToAccount } from 'viem/accounts';
const a = privateKeyToAccount(process.env.DEMO_WALLET_KEY as \`0x\${string}\`);
console.log('Address:', a.address);
"
```
Expected: `0xf45b62b9c83c2Ed4B3D499CcF261eEED88bFb670`

**Step 3: Do NOT commit** — `.env.local` is gitignored

---

### Task 2: Run the seed script (Phase 6 activates automatically)

**Files:**
- No changes needed — `scripts/seed-demo-data.ts` Phase 6 already handles everything

**Step 1: Run the full seed script**

```bash
npx tsx scripts/seed-demo-data.ts
```

**Expected output for Phase 6:**
```
Phase 6: Seeding reputation + GPU-Beta (demo wallet)...
  Agent 1: feedback 85/100 (uptime)
  Agent 2: feedback 92/100 (responseTime)
  Agent 3: feedback 78/100 (successRate)
  Agent 4: feedback 88/100 (uptime)
  GPU-Beta registered (H200 / AMD SEV)
```

If Phase 6 doesn't appear, it means `DEMO_WALLET_KEY` wasn't detected.

**Step 2: Verify reputation on-chain**

```bash
curl http://localhost:3000/api/reputation?agentId=1
```
Expected: Returns actual scores (not empty/mock)

**Step 3: Verify GPU-Beta registered**

```bash
curl http://localhost:3000/api/gpu/list
```
Expected: Two providers (GPU-Alpha + GPU-Beta), not `_demo: true`

---

### Task 3: Update PENDING_WORK.md — mark P-069 + P-070 done

**Files:**
- Modify: `docs/PENDING_WORK.md`

**Step 1: Update P-069**

Change from `known-limitation` to `✅ done`, agent `4`, fix: "2nd wallet (0xf45b...670) bypasses self-feedback check. On-chain reputation scores seeded."

**Step 2: Update P-070**

Change from `known-limitation` to `✅ done`, agent `4`, fix: "2nd wallet registers GPU-Beta (H200/AMD SEV). Two providers on-chain."

**Step 3: Update ACTIVE_WORK.md with done row**

**Step 4: Commit**

```bash
git add docs/PENDING_WORK.md docs/ACTIVE_WORK.md
git commit -m "docs: mark P-069 + P-070 done — 2nd wallet enables reputation + GPU-Beta"
```

---

## Why No Code Changes

The seed script (`scripts/seed-demo-data.ts` Phase 6, lines 208-258) and `og-chain.ts` (`getDemoWalletClient()`, lines 44-54) already implement:
- `giveFeedback()` calls from demo wallet → bypasses `isAuthorizedOrOwner` check
- `registerProvider()` for GPU-Beta from demo wallet → bypasses 1-per-wallet limit

The `.env.example` already documents `DEMO_WALLET_KEY`. All that was missing was:
1. An actual funded 2nd wallet
2. Setting the env var

## Verification

1. `curl localhost:3000/api/reputation?agentId=1` �� real scores (uptime: 85)
2. `curl localhost:3000/api/gpu/list` → two providers, no `_demo: true`
3. `grep "P-069\|P-070" docs/PENDING_WORK.md` → both `✅ done`
4. On-chain: check `chainscan-galileo.0g.ai` for transactions from `0xf45b...670`
