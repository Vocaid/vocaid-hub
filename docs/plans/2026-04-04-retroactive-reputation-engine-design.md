# Retroactive Reputation Engine — Design Document

**Date:** 2026-04-04
**Origin:** 0G developer conversation — interest in measuring reputation of existing listed providers based on chain transactions
**Bounty target:** 0G Best DeFi App ($6k), 0G OpenClaw ($6k), 0G Wildcard ($3k)
**Scope:** Full engine — auto-register + multi-signal scoring + on-chain writes

---

## Problem

0G's Inference Serving contract lists ~dozens of active providers with months of transaction history. But they have zero reputation scores. Vocaid's reputation system is forward-looking only — it scores providers from the moment they register via the stepper UI. Existing 0G providers are invisible to our marketplace unless they manually onboard.

## Solution

A batch script that:
1. Enumerates all providers from 0G's InferenceServing contract
2. Auto-registers unregistered providers into ERC-8004 IdentityRegistry
3. Reads transaction history (accounts, settlements, refunds) per provider
4. Computes 6 reputation signals
5. Writes scores to ReputationRegistry using the demo wallet

This provides **backward-compatible reputation** for the entire 0G provider ecosystem.

---

## Data Sources

### InferenceServing (`0xa79F4c8311FF93C06b8CfB403690cc987c93F91E`)

| Function | Returns | Use |
|----------|---------|-----|
| `getAllAccounts(offset, limit)` | All user-provider accounts | Total activity count |
| `getAccountsByProvider(provider, offset, limit)` | Accounts for one provider | Unique client count |
| `getAccount(user, provider)` | balance, pendingRefund, nonce, refunds[] | Settlement health |
| `getService(provider)` | pricing, model, TEE, url | Compliance + pricing |

### Events (via `eth_getLogs`)

| Event | Data | Signal |
|-------|------|--------|
| `BalanceUpdated(user, provider, amount, pendingRefund)` | Per-inference transaction | Activity + spending volume |
| `TEESettlementResult(user, status, unsettledAmount)` | Settlement outcome | Success rate |
| `RefundRequested(user, provider, amount)` | Dispute initiated | Dispute rate |
| `ServiceUpdated(service, ...)` | Provider metadata change | First seen timestamp (longevity) |

### Ledger Manager (`0xE70830508dAc0A97e6c087c75f402f9Be669E406`)

| Function | Returns | Use |
|----------|---------|-----|
| `FundSpent(user, service, amount)` event | Spending per provider | Revenue proxy |

---

## Reputation Signals (6 total)

| # | Signal | Tag | Formula | Weight |
|---|--------|-----|---------|--------|
| 1 | **Activity** | `retroactive-activity` | `min(100, uniqueClients * 10)` | 25% |
| 2 | **Settlement Health** | `retroactive-settlement` | `100 - (refundCount / totalTx * 100)` | 20% |
| 3 | **TEE Compliance** | `retroactive-tee` | `teeAcknowledged ? 100 : 0` | 15% |
| 4 | **Pricing** | `retroactive-pricing` | `100 - (providerPrice / medianPrice * 50)` clamped 0-100 | 15% |
| 5 | **Dispute Rate** | `retroactive-disputes` | `100 - (disputes / totalTx * 100)` | 15% |
| 6 | **Longevity** | `retroactive-longevity` | `min(100, daysSinceFirst * 2)` | 10% |

**Composite score:** Weighted average of all 6 signals → single 0-100 value written as `retroactive-composite`.

---

## Architecture

```
scripts/compute-retroactive-reputation.ts
  │
  ├── 1. Read InferenceServing.getAllAccounts() → enumerate all providers
  ├── 2. For each provider:
  │     ├── getService(provider) → pricing, TEE, model
  │     ├── getAccountsByProvider(provider) → unique clients
  │     ├── Read BalanceUpdated events → tx count, spending volume
  │     ├── Read RefundRequested events → dispute count
  │     └── Read ServiceUpdated events → first seen date
  │
  ├── 3. Auto-register unregistered providers:
  │     ├── Check GPUProviderRegistry.providers(address)
  │     ├── If not registered → IdentityRegistry.register(agentURI)
  │     └── Then GPUProviderRegistry.registerProvider(agentId, model, tee, hash)
  │
  ├── 4. Compute 6 signals per provider
  │
  ├── 5. Write to ReputationRegistry (using DEMO_WALLET_KEY):
  │     └── giveFeedback(agentId, score, 2, tag, "retroactive", ...)
  │
  └── 6. Log to Hedera HCS audit topic
```

### New files

| File | Purpose |
|------|---------|
| `src/lib/og-inference-serving.ts` | Read functions for InferenceServing contract (ABI + typed wrappers) |
| `src/lib/og-ledger.ts` | Read functions for Ledger contract |
| `src/lib/retroactive-reputation.ts` | Signal computation + composite scoring logic |
| `scripts/compute-retroactive-reputation.ts` | Batch execution script |

### Modified files

| File | Change |
|------|--------|
| `src/app/api/resources/route.ts` | Use real reputation scores (remove hardcoded `75`) |
| `src/lib/contracts.ts` | Add InferenceServing + Ledger ABIs |

### No contract changes needed

All writes use existing `IdentityRegistry.register()`, `GPUProviderRegistry.registerProvider()`, and `ReputationRegistry.giveFeedback()`. No new Solidity.

---

## ABIs (from node_modules/@0glabs/0g-serving-broker)

### InferenceServing (key functions)

```solidity
function getService(address provider) view returns (Service)
function getAccountsByProvider(address provider, uint offset, uint limit) view returns (Account[])
function getAccount(address user, address provider) view returns (Account)
function getAllAccounts(uint offset, uint limit) view returns (Account[])

// Events
event BalanceUpdated(address indexed user, address indexed provider, uint amount, uint pendingRefund)
event TEESettlementResult(address indexed user, uint status, uint unsettledAmount)
event RefundRequested(address indexed user, address indexed provider, uint amount)
event ServiceUpdated(address indexed service, ...)
```

### Ledger Manager (key functions)

```solidity
function getAllLedgers(uint offset, uint limit) view returns (Ledger[])
function getLedger(address user) view returns (Ledger)

// Events
event FundSpent(address indexed user, address indexed service, uint amount)
```

Full ABIs available in `node_modules/@0glabs/0g-serving-broker/lib.commonjs/*/contract/typechain/factories/`.

---

## Demo Value

During the 0G booth demo:

1. **Before:** Show marketplace with 2 Vocaid-registered providers (GPU-Alpha, GPU-Beta)
2. **Run script:** `npx tsx scripts/compute-retroactive-reputation.ts`
3. **After:** Show marketplace now has N additional providers from 0G's network, each with reputation scores
4. **Narrative:** "We didn't just build a reputation system for new providers. We retroactively scored the entire 0G ecosystem by reading their InferenceServing contract history. Zero manual onboarding required."

This directly demonstrates the **backward compatibility** the 0G developer asked about.

---

## Verification

1. Script enumerates all providers from InferenceServing contract
2. New providers appear in IdentityRegistry (agentId assigned)
3. New providers appear in GPUProviderRegistry (model + TEE)
4. 6 reputation signals written per provider in ReputationRegistry
5. `/api/resources` returns providers with real scores (not hardcoded 75)
6. HCS audit log shows retroactive reputation computation event
7. `npx next build` passes
