# Demo Seed Data Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `scripts/seed-demo-data.ts` to populate on-chain state for the 4-minute demo, and `scripts/demo-flow.md` documenting the walkthrough.

**Architecture:** The script uses viem to interact with deployed contracts on 0G Galileo (chain 16602). It registers ERC-8004 identities, GPU providers, TEE validations, and prediction markets. Reputation feedback is skipped because ReputationRegistry blocks self-feedback from the identity owner (deployer wallet owns all seeded identities). The existing mock fallback data in API routes already provides reputation scores for the UI.

**Tech Stack:** viem, dotenv, 0G Galileo RPC, deployed contracts from `deployments/0g-galileo.json`

---

## Key Constraints Discovered

1. **ReputationRegistry self-feedback block** (line 110 of `ReputationRegistryUpgradeable.sol`): `require(!IIdentityRegistry(_identityRegistry).isAuthorizedOrOwner(msg.sender, agentId))` -- deployer can't give feedback to its own agents. Skip reputation seeding.
2. **GPUProviderRegistry AlreadyRegistered** (line 45): `providers[msg.sender].registeredAt != 0` -- one registration per address. Script is NOT idempotent for GPU registration (will revert on re-run). Document this.
3. **MockTEEValidator signature**: requires `trustedSigner` ECDSA signature over `keccak256(abi.encodePacked(requestHash, response, responseHash)).toEthSignedMessageHash()`. The `trustedSigner` is the deployer wallet.
4. **ValidationRegistry flow**: Must call `validationRequest()` first (owner creates request), then `MockTEEValidator.validate()` (submits response).
5. **ResourcePrediction.placeBet()**: Uses native A0GI (msg.value), not USDC.

## Contract Addresses (from `deployments/0g-galileo.json`)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0x0bd938c2021ba9de937b03f2a4ac793de453e993` |
| ReputationRegistry | `0x3a7d70e5037811aaf0ccc89d4180917a112f3eed` |
| ValidationRegistry | `0x345f915375d935298605888926429b9378bddebe` |
| GPUProviderRegistry | `0x9f522055c682237cf685b8214e1e6c233199abe4` |
| MockTEEValidator | `0x80597d12e953d7519a248c9eb750339b1c54fb34` |
| ResourcePrediction | `0x6ce572729a5cbc8aa9df7ac25d8076e80665194e` |

---

### Task 1: Claim task in ACTIVE_WORK.md

**Files:**
- Modify: `docs/ACTIVE_WORK.md`

**Step 1: Add claim row to Active Work table**

Add row for Agent 8 claiming demo seed data task.

**Step 2: Commit claim**

```bash
git add docs/ACTIVE_WORK.md
git commit -m "wip: claim demo seed data (Agent 8)"
```

---

### Task 2: Create `scripts/seed-demo-data.ts`

**Files:**
- Create: `scripts/seed-demo-data.ts`
- Read: `deployments/0g-galileo.json` (contract addresses)
- Read: `scripts/deploy-0g.ts` (viem client pattern to reuse)

**Step 1: Write the seed script**

The script has 5 phases:
1. **Register 6 identities** via `IdentityRegistry.register(agentURI)` -- 2 GPUs, 2 agents, 2 humans
2. **Register 2 GPU providers** via `GPUProviderRegistry.registerProvider(agentId, gpuModel, teeType, attestationHash)`
3. **Submit 2 TEE validations** via `ValidationRegistry.validationRequest()` then `MockTEEValidator.validate()` with deployer's ECDSA signature
4. **Create 3 prediction markets** via `ResourcePrediction.createMarket(question, resolutionTime)`
5. **Place initial bets** via `ResourcePrediction.placeBet(marketId, side)` with A0GI value

Key patterns to reuse from `scripts/deploy-0g.ts`:
- viem `createPublicClient` / `createWalletClient` with 0G Galileo chain definition
- `privateKeyToAccount` for wallet
- `dotenv` config loading
- Contract address loading from `deployments/0g-galileo.json`

ABI definitions inline (minimal — only write functions needed):
```typescript
const IDENTITY_ABI = [{ name: 'register', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'agentURI', type: 'string' }], outputs: [{ name: 'agentId', type: 'uint256' }] }] as const;

const GPU_PROVIDER_ABI = [{ name: 'registerProvider', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'gpuModel', type: 'string' }, { name: 'teeType', type: 'string' }, { name: 'attestationHash', type: 'bytes32' }], outputs: [] }] as const;

const VALIDATION_ABI = [{ name: 'validationRequest', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'validatorAddress', type: 'address' }, { name: 'agentId', type: 'uint256' }, { name: 'requestURI', type: 'string' }, { name: 'requestHash', type: 'bytes32' }], outputs: [] }] as const;

const MOCK_TEE_ABI = [{ name: 'validate', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'requestHash', type: 'bytes32' }, { name: 'response', type: 'uint8' }, { name: 'responseURI', type: 'string' }, { name: 'responseHash', type: 'bytes32' }, { name: 'tag', type: 'string' }, { name: 'signature', type: 'bytes' }], outputs: [] }] as const;

const PREDICTION_ABI = [
  { name: 'createMarket', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'question', type: 'string' }, { name: 'resolutionTime', type: 'uint256' }], outputs: [{ name: 'marketId', type: 'uint256' }] },
  { name: 'placeBet', type: 'function', stateMutability: 'payable', inputs: [{ name: 'marketId', type: 'uint256' }, { name: 'side', type: 'uint8' }], outputs: [] },
  { name: 'nextMarketId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;
```

Demo data constants:
```typescript
const IDENTITIES = [
  { uri: 'https://vocaid-hub.vercel.app/agent-cards/gpu-alpha.json', label: 'GPU-Alpha (H100 80GB)' },
  { uri: 'https://vocaid-hub.vercel.app/agent-cards/gpu-beta.json', label: 'GPU-Beta (H200 141GB)' },
  { uri: 'https://vocaid-hub.vercel.app/agent-cards/seer.json', label: 'Seer Agent' },
  { uri: 'https://vocaid-hub.vercel.app/agent-cards/edge.json', label: 'Edge Agent' },
  { uri: 'https://vocaid-hub.vercel.app/agent-cards/maria.json', label: 'Maria (Rust L4)' },
  { uri: 'https://vocaid-hub.vercel.app/agent-cards/carlos.json', label: 'Carlos (ML L3)' },
];

const GPU_PROVIDERS = [
  { identityIndex: 0, gpuModel: 'H100', teeType: 'Intel TDX', label: 'GPU-Alpha' },
  { identityIndex: 1, gpuModel: 'H200', teeType: 'Intel TDX', label: 'GPU-Beta' },
];

const MARKETS = [
  { question: 'Will H100 cost drop below $0.005 per token by May?', daysUntilResolution: 30, betYes: '0.062', betNo: '0.038' },
  { question: 'Rust developer demand +15% in Q2 2026?', daysUntilResolution: 60, betYes: '0.045', betNo: '0.055' },
  { question: 'EU GPU capacity will exceed US by end of 2026?', daysUntilResolution: 90, betYes: '0.03', betNo: '0.07' },
];
```

TEE validation signing (deployer signs as trustedSigner):
```typescript
// MockTEEValidator expects: keccak256(abi.encodePacked(requestHash, response, responseHash)).toEthSignedMessageHash()
const digest = keccak256(encodePacked(['bytes32', 'uint8', 'bytes32'], [requestHash, 100, responseHash]));
const signature = await account.signMessage({ message: { raw: digest } });
```

**Step 2: Run the script to verify**

```bash
npx tsx scripts/seed-demo-data.ts
```

Expected output:
```
============================================================
Vocaid — Demo Data Seeder
============================================================
Chain ID: 16602
Deployer: 0x58c4...

Phase 1: Registering 6 ERC-8004 identities...
  GPU-Alpha (H100 80GB): agentId 0
  GPU-Beta (H200 141GB): agentId 1
  ...

Phase 2: Registering 2 GPU providers...
  GPU-Alpha registered (H100 / Intel TDX)
  GPU-Beta registered (H200 / Intel TDX)

Phase 3: Submitting TEE validations...
  GPU-Alpha: validation request + mock TEE response (score: 100)
  GPU-Beta: validation request + mock TEE response (score: 100)

Phase 4: Creating 3 prediction markets...
  Market 0: "Will H100 cost drop below $0.005..."
  Market 1: "Rust developer demand +15%..."
  Market 2: "EU GPU capacity will exceed US..."

Phase 5: Placing initial bets...
  Market 0: 0.062 A0GI Yes, 0.038 A0GI No
  ...

============================================================
SEED COMPLETE
============================================================
```

**Step 3: Commit**

```bash
git add scripts/seed-demo-data.ts
git commit -m "feat(demo): add seed data script for on-chain demo state"
```

---

### Task 3: Create `scripts/demo-flow.md`

**Files:**
- Create: `scripts/demo-flow.md`

**Step 1: Write the demo flow document**

Content from `WAVE_EXECUTION_PLAN.md` demo section (lines 424-464), adapted with:
- Pre-requisites (run seed script, env vars)
- Step-by-step with expected UI states
- Fallback actions per step
- Key talking points (memorize these)

**Step 2: Commit**

```bash
git add scripts/demo-flow.md
git commit -m "docs(demo): add demo flow walkthrough"
```

---

### Task 4: Mark complete in ACTIVE_WORK.md

**Files:**
- Modify: `docs/ACTIVE_WORK.md`

**Step 1: Move claim to Recently Completed**

**Step 2: Commit**

```bash
git add docs/ACTIVE_WORK.md
git commit -m "wip: mark demo seed data complete (Agent 8)"
```
