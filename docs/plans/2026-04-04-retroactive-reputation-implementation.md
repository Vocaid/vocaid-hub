# Retroactive Reputation Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-discover 8 existing 0G providers from InferenceServing events, register them into ERC-8004, compute 6 reputation signals from 238+ historical transactions, and write scores to ReputationRegistry.

**Architecture:** Batch script reads BalanceUpdated/RefundRequested/ServiceUpdated events from InferenceServing contract, computes weighted reputation signals per provider, auto-registers unregistered providers into IdentityRegistry + GPUProviderRegistry, then writes scores via demo wallet. A lib module exposes the same logic for API routes.

**Tech Stack:** ethers v6, viem, 0G Galileo (chain 16602), InferenceServing at `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E`

**Confirmed testnet data:** 8 providers, 238 txs, 1,439 A0GI volume, 42 unique clients for top provider, 4 refund events.

---

### Task 1: Create og-inference-serving.ts — Read Functions

**Files:**
- Create: `src/lib/og-inference-serving.ts`

**Step 1: Create the module**

This module reads from 0G's native InferenceServing contract using events (not view functions — view functions revert on complex tuples).

```typescript
// src/lib/og-inference-serving.ts
import { ethers } from 'ethers';

const INFERENCE_SERVING_ADDRESS = '0xa79F4c8311FF93C06b8CfB403690cc987c93F91E';
const OG_RPC = process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai';

const EVENTS_ABI = [
  'event BalanceUpdated(address indexed user, address indexed provider, uint256 amount, uint256 pendingRefund)',
  'event RefundRequested(address indexed user, address indexed provider, uint256 indexed index, uint256 timestamp)',
  'event ServiceUpdated(address indexed service, string serviceType, string url, uint256 inputPrice, uint256 outputPrice, uint256 updatedAt, string model, string verifiability)',
];

const SERVICE_ABI = [
  'function getService(address) view returns (tuple(address provider, string serviceType, string url, uint256 inputPrice, uint256 outputPrice, uint256 updatedAt, string model, string verifiability, string additionalInfo))',
];

export interface ProviderActivity {
  address: string;
  txCount: number;
  uniqueClients: number;
  totalVolume: bigint;
  refundCount: number;
  firstSeenBlock: number | null;
}

export interface ProviderService {
  provider: string;
  model: string;
  url: string;
  inputPrice: bigint;
  outputPrice: bigint;
  verifiability: string;
  updatedAt: number;
}

function getProvider() {
  return new ethers.JsonRpcProvider(OG_RPC);
}

function getContract(provider: ethers.JsonRpcProvider) {
  return new ethers.Contract(INFERENCE_SERVING_ADDRESS, [...EVENTS_ABI, ...SERVICE_ABI], provider);
}

/**
 * Scan BalanceUpdated + RefundRequested + ServiceUpdated events
 * across `blockRange` blocks to build provider activity profiles.
 */
export async function scanProviderActivity(blockRange = 2_000_000): Promise<Map<string, ProviderActivity>> {
  const provider = getProvider();
  const iface = new ethers.Interface(EVENTS_ABI);
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - blockRange);

  const providers = new Map<string, ProviderActivity>();
  const CHUNK = 500_000;

  for (let from = fromBlock; from < currentBlock; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, currentBlock);

    // BalanceUpdated events
    const balLogs = await provider.getLogs({
      address: INFERENCE_SERVING_ADDRESS,
      topics: [iface.getEvent('BalanceUpdated')!.topicHash],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of balLogs) {
      const parsed = iface.parseLog(log)!;
      const addr = parsed.args.provider as string;
      if (!providers.has(addr)) {
        providers.set(addr, { address: addr, txCount: 0, uniqueClients: 0, totalVolume: 0n, refundCount: 0, firstSeenBlock: null });
      }
      const entry = providers.get(addr)!;
      entry.txCount++;
      entry.totalVolume += parsed.args.amount as bigint;
      // Track unique clients via a temp Set stored on the entry
      if (!(entry as any)._clients) (entry as any)._clients = new Set();
      (entry as any)._clients.add(parsed.args.user);
    }

    // RefundRequested events
    const refLogs = await provider.getLogs({
      address: INFERENCE_SERVING_ADDRESS,
      topics: [iface.getEvent('RefundRequested')!.topicHash],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of refLogs) {
      const parsed = iface.parseLog(log)!;
      const addr = parsed.args.provider as string;
      if (providers.has(addr)) {
        providers.get(addr)!.refundCount++;
      }
    }

    // ServiceUpdated events (for firstSeenBlock)
    const svcLogs = await provider.getLogs({
      address: INFERENCE_SERVING_ADDRESS,
      topics: [iface.getEvent('ServiceUpdated')!.topicHash],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of svcLogs) {
      const parsed = iface.parseLog(log)!;
      const addr = parsed.args.service as string;
      if (providers.has(addr) && !providers.get(addr)!.firstSeenBlock) {
        providers.get(addr)!.firstSeenBlock = log.blockNumber;
      }
    }
  }

  // Finalize unique client counts
  for (const entry of providers.values()) {
    entry.uniqueClients = (entry as any)._clients?.size ?? 0;
    delete (entry as any)._clients;
  }

  return providers;
}

/**
 * Get service metadata for a provider (model, pricing, TEE).
 * Returns null if provider has no active service.
 */
export async function getProviderService(address: string): Promise<ProviderService | null> {
  const provider = getProvider();
  const contract = getContract(provider);
  try {
    const s = await contract.getService(address);
    return {
      provider: s.provider,
      model: s.model,
      url: s.url,
      inputPrice: s.inputPrice,
      outputPrice: s.outputPrice,
      verifiability: s.verifiability,
      updatedAt: Number(s.updatedAt),
    };
  } catch {
    return null; // Provider service not found or offline
  }
}

/**
 * List currently active services via broker SDK.
 */
export async function listActiveServices(): Promise<ProviderService[]> {
  const provider = getProvider();
  const { createZGComputeNetworkBroker } = await import('@0glabs/0g-serving-broker');
  // Use a dummy signer for read-only operations
  const signer = new ethers.Wallet(
    '0x0000000000000000000000000000000000000000000000000000000000000001',
    provider,
  );
  const broker = await createZGComputeNetworkBroker(signer);
  const services = await broker.inference.listService();
  return services.map((s: any) => ({
    provider: s.provider,
    model: s.model || '',
    url: s.url || '',
    inputPrice: s.inputPrice ?? 0n,
    outputPrice: s.outputPrice ?? 0n,
    verifiability: s.verifiability || '',
    updatedAt: 0,
  }));
}
```

**Step 2: Commit**

```bash
git add src/lib/og-inference-serving.ts
git commit -m "feat(reputation): add og-inference-serving.ts — event scanner for 0G providers"
```

---

### Task 2: Create retroactive-reputation.ts — Signal Computation

**Files:**
- Create: `src/lib/retroactive-reputation.ts`

**Step 1: Create the module**

```typescript
// src/lib/retroactive-reputation.ts
import type { ProviderActivity, ProviderService } from './og-inference-serving';

export interface ReputationSignals {
  activity: number;        // 0-100: unique client count
  settlementHealth: number; // 0-100: low refund ratio
  teeCompliance: number;   // 0 or 100: TEE acknowledged
  pricing: number;         // 0-100: competitive pricing
  disputeRate: number;     // 0-100: low dispute ratio
  longevity: number;       // 0-100: days since first seen
  composite: number;       // weighted average
}

const WEIGHTS = {
  activity: 0.25,
  settlementHealth: 0.20,
  teeCompliance: 0.15,
  pricing: 0.15,
  disputeRate: 0.15,
  longevity: 0.10,
};

/**
 * Compute 6 reputation signals + composite for a provider.
 */
export function computeSignals(
  activity: ProviderActivity,
  service: ProviderService | null,
  medianInputPrice: bigint,
  currentBlock: number,
  blockTimeSeconds = 3, // 0G Galileo ~3s blocks
): ReputationSignals {
  // 1. Activity: min(100, uniqueClients * 5)
  const activityScore = Math.min(100, activity.uniqueClients * 5);

  // 2. Settlement Health: 100 - (refundCount / txCount * 100)
  const settlementHealth = activity.txCount > 0
    ? Math.max(0, Math.round(100 - (activity.refundCount / activity.txCount) * 100))
    : 50; // no data = neutral

  // 3. TEE Compliance: binary
  const teeCompliance = service?.verifiability ? 100 : 0;

  // 4. Pricing: 100 - (providerPrice / medianPrice * 50), clamped 0-100
  let pricing = 50; // neutral default
  if (service && medianInputPrice > 0n) {
    const ratio = Number(service.inputPrice * 100n / medianInputPrice);
    pricing = Math.max(0, Math.min(100, 100 - Math.round(ratio / 2)));
  }

  // 5. Dispute Rate: 100 - (refunds / txCount * 100)
  const disputeRate = activity.txCount > 0
    ? Math.max(0, Math.round(100 - (activity.refundCount / activity.txCount) * 100))
    : 100; // no disputes = perfect

  // 6. Longevity: min(100, daysSinceFirst * 2)
  let longevity = 0;
  if (activity.firstSeenBlock) {
    const blocksDiff = currentBlock - activity.firstSeenBlock;
    const daysDiff = (blocksDiff * blockTimeSeconds) / 86400;
    longevity = Math.min(100, Math.round(daysDiff * 2));
  }

  // Composite: weighted average
  const composite = Math.round(
    activityScore * WEIGHTS.activity +
    settlementHealth * WEIGHTS.settlementHealth +
    teeCompliance * WEIGHTS.teeCompliance +
    pricing * WEIGHTS.pricing +
    disputeRate * WEIGHTS.disputeRate +
    longevity * WEIGHTS.longevity,
  );

  return {
    activity: activityScore,
    settlementHealth,
    teeCompliance,
    pricing,
    disputeRate,
    longevity,
    composite,
  };
}

/**
 * Compute median input price across all providers with services.
 */
export function computeMedianPrice(services: (ProviderService | null)[]): bigint {
  const prices = services
    .filter((s): s is ProviderService => s !== null && s.inputPrice > 0n)
    .map(s => s.inputPrice)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  if (prices.length === 0) return 1n; // avoid division by zero
  return prices[Math.floor(prices.length / 2)];
}
```

**Step 2: Commit**

```bash
git add src/lib/retroactive-reputation.ts
git commit -m "feat(reputation): add retroactive signal computation (6 signals + composite)"
```

---

### Task 3: Create compute-retroactive-reputation.ts — Batch Script

**Files:**
- Create: `scripts/compute-retroactive-reputation.ts`

**Step 1: Create the script**

```typescript
// scripts/compute-retroactive-reputation.ts
/**
 * Retroactive Reputation Engine
 *
 * Scans 0G InferenceServing events → computes 6 signals per provider →
 * auto-registers unregistered providers → writes scores to ReputationRegistry.
 *
 * Usage: npx tsx scripts/compute-retroactive-reputation.ts
 */

import { config } from 'dotenv';
config();

import { ethers } from 'ethers';
import {
  createPublicClient, createWalletClient, http, keccak256, toHex,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// Chain definition
const ogGalileo = {
  id: 16602,
  name: '0G Galileo',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: { default: { http: [process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai'] } },
} as const;

const rpcUrl = process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai';
const WAIT_OPTS = { retryCount: 30, pollingInterval: 5_000 };

// Load deployed addresses
const deployment = JSON.parse(readFileSync(join(ROOT, 'deployments/0g-galileo.json'), 'utf-8'));
const C = deployment.contracts as Record<string, `0x${string}`>;

// ABIs
const identityABI = [
  { name: 'register', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }], outputs: [{ name: 'agentId', type: 'uint256' }] },
  { name: 'Registered', type: 'event',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'agentURI', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: true },
    ] },
] as const;

const gpuProviderABI = [
  { name: 'registerProvider', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' }, { name: 'gpuModel', type: 'string' },
      { name: 'teeType', type: 'string' }, { name: 'attestationHash', type: 'bytes32' },
    ], outputs: [] },
  { name: 'providers', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'agentId', type: 'uint256' }, { name: 'gpuModel', type: 'string' },
      { name: 'teeType', type: 'string' }, { name: 'attestationHash', type: 'bytes32' },
      { name: 'registeredAt', type: 'uint256' }, { name: 'active', type: 'bool' },
    ] },
] as const;

const reputationABI = [
  { name: 'giveFeedback', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' }, { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' }, { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' }, { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' }, { name: 'feedbackHash', type: 'bytes32' },
    ], outputs: [] },
] as const;

// Import reputation computation
async function main() {
  // Dynamic imports for ESM modules
  const { scanProviderActivity, getProviderService } = await import('../src/lib/og-inference-serving.js');
  const { computeSignals, computeMedianPrice } = await import('../src/lib/retroactive-reputation.js');

  const demoPk = process.env.DEMO_WALLET_KEY;
  if (!demoPk) {
    console.error('DEMO_WALLET_KEY not set. Required for writing reputation.');
    process.exit(1);
  }

  const demoAccount = privateKeyToAccount(demoPk as `0x${string}`);
  const publicClient = createPublicClient({ chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }), pollingInterval: 4_000 });
  const demoWallet = createWalletClient({ account: demoAccount, chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }) });

  console.log('='.repeat(60));
  console.log('Retroactive Reputation Engine');
  console.log('='.repeat(60));
  console.log('Demo wallet:', demoAccount.address);

  // Phase 1: Scan provider activity from events
  console.log('\nPhase 1: Scanning InferenceServing events (last 2M blocks)...');
  const activityMap = await scanProviderActivity(2_000_000);
  console.log(`  Found ${activityMap.size} providers`);

  // Phase 2: Get service metadata
  console.log('\nPhase 2: Fetching service metadata...');
  const services = new Map<string, any>();
  for (const addr of activityMap.keys()) {
    const svc = await getProviderService(addr);
    services.set(addr, svc);
    console.log(`  ${addr.slice(0, 10)}... ${svc ? svc.model : '(offline)'}`);
  }

  // Phase 3: Compute signals
  console.log('\nPhase 3: Computing reputation signals...');
  const medianPrice = computeMedianPrice([...services.values()]);
  const ethersProvider = new ethers.JsonRpcProvider(rpcUrl);
  const currentBlock = await ethersProvider.getBlockNumber();

  const signals = new Map<string, any>();
  for (const [addr, activity] of activityMap) {
    const svc = services.get(addr);
    const s = computeSignals(activity, svc, medianPrice, currentBlock);
    signals.set(addr, s);
    console.log(`  ${addr.slice(0, 10)}... composite: ${s.composite} (activity:${s.activity} settle:${s.settlementHealth} tee:${s.teeCompliance} price:${s.pricing} dispute:${s.disputeRate} age:${s.longevity})`);
  }

  // Phase 4: Auto-register unregistered providers
  console.log('\nPhase 4: Auto-registering providers...');
  const agentIds = new Map<string, bigint>();

  for (const addr of activityMap.keys()) {
    // Check if already registered in GPUProviderRegistry
    try {
      const existing = await publicClient.readContract({
        address: C.GPUProviderRegistry as `0x${string}`,
        abi: gpuProviderABI,
        functionName: 'providers',
        args: [addr as `0x${string}`],
      });
      if (Number(existing[4]) > 0) { // registeredAt > 0
        agentIds.set(addr, existing[0] as bigint);
        console.log(`  ${addr.slice(0, 10)}... already registered (agentId: ${existing[0]})`);
        continue;
      }
    } catch {
      // Not registered
    }

    // Register identity
    const svc = services.get(addr);
    const agentURI = `https://vocaid-hub.vercel.app/retroactive/${addr.slice(0, 10)}.json`;
    try {
      const h = await demoWallet.writeContract({
        address: C.IdentityRegistry as `0x${string}`,
        abi: identityABI,
        functionName: 'register',
        args: [agentURI],
        chain: ogGalileo,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
      const registeredTopic = keccak256(toHex('Registered(uint256,string,address)'));
      const log = receipt.logs.find((l: any) =>
        l.address.toLowerCase() === C.IdentityRegistry.toLowerCase() &&
        l.topics[0] === registeredTopic
      );
      const agentId = BigInt(log!.topics[1] as string);
      agentIds.set(addr, agentId);

      // Register as GPU provider
      const model = svc?.model || 'Unknown';
      const tee = svc?.verifiability || 'none';
      const attestHash = keccak256(toHex(`retroactive-${addr}`));
      const h2 = await demoWallet.writeContract({
        address: C.GPUProviderRegistry as `0x${string}`,
        abi: gpuProviderABI,
        functionName: 'registerProvider',
        args: [agentId, model, tee, attestHash],
        chain: ogGalileo,
      });
      await publicClient.waitForTransactionReceipt({ hash: h2, ...WAIT_OPTS });

      console.log(`  ${addr.slice(0, 10)}... registered (agentId: ${agentId}, model: ${model})`);
    } catch (e: any) {
      console.log(`  ${addr.slice(0, 10)}... registration failed: ${e.message?.slice(0, 60)}`);
    }
  }

  // Phase 5: Write reputation scores
  console.log('\nPhase 5: Writing reputation scores to ReputationRegistry...');

  const tags = ['retroactive-activity', 'retroactive-settlement', 'retroactive-tee',
    'retroactive-pricing', 'retroactive-disputes', 'retroactive-longevity', 'retroactive-composite'];
  const signalKeys = ['activity', 'settlementHealth', 'teeCompliance', 'pricing', 'disputeRate', 'longevity', 'composite'] as const;

  for (const [addr, s] of signals) {
    const agentId = agentIds.get(addr);
    if (!agentId) {
      console.log(`  ${addr.slice(0, 10)}... skipped (no agentId)`);
      continue;
    }

    for (let i = 0; i < tags.length; i++) {
      const value = s[signalKeys[i]] as number;
      const fbHash = keccak256(toHex(`retro-${addr}-${tags[i]}-${Date.now()}`));
      try {
        const h = await demoWallet.writeContract({
          address: C.ReputationRegistry as `0x${string}`,
          abi: reputationABI,
          functionName: 'giveFeedback',
          args: [agentId, BigInt(value * 100), 2, tags[i], 'retroactive', '/retroactive', `retro:${tags[i]}`, fbHash],
          chain: ogGalileo,
        });
        await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
      } catch (e: any) {
        console.log(`  ${addr.slice(0, 10)}... ${tags[i]} failed: ${e.message?.slice(0, 50)}`);
      }
    }
    console.log(`  ${addr.slice(0, 10)}... 7 signals written (composite: ${s.composite})`);
  }

  // Phase 6: Log to Hedera HCS
  const auditTopic = process.env.HEDERA_AUDIT_TOPIC;
  if (auditTopic) {
    console.log('\nPhase 6: Logging to Hedera HCS...');
    try {
      // @ts-expect-error — tsx resolves .ts imports at runtime
      const { logAuditMessage, initClient } = await import('../src/lib/hedera.ts');
      initClient();
      await logAuditMessage(auditTopic, JSON.stringify({
        type: 'retroactive_reputation_computed',
        providers: activityMap.size,
        totalTx: [...activityMap.values()].reduce((a, v) => a + v.txCount, 0),
        timestamp: new Date().toISOString(),
      }));
      console.log('  Logged to HCS topic ' + auditTopic);
    } catch (e: any) {
      console.log('  HCS logging failed (non-blocking):', e.message?.slice(0, 50));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RETROACTIVE REPUTATION COMPLETE');
  console.log(`  Providers scored: ${signals.size}`);
  console.log(`  Total transactions analyzed: ${[...activityMap.values()].reduce((a, v) => a + v.txCount, 0)}`);
  console.log('='.repeat(60));
}

main().catch((e) => { console.error(e); process.exit(1); });
```

**Step 2: Commit**

```bash
git add scripts/compute-retroactive-reputation.ts
git commit -m "feat(reputation): add retroactive reputation batch script (6 signals, auto-register)"
```

---

### Task 4: Update resources route to use real reputation scores

**Files:**
- Modify: `src/app/api/resources/route.ts`

**Step 1: Replace hardcoded reputation: 75**

In the `mapGpuToResources` function, replace static `reputation: 75` with a call to `getReputationSummary()` from `og-chain.ts`. If the provider has an agentId, look up their composite reputation. Fall back to 75 if no score exists.

Find all instances of `reputation: 75` (and `reputation: 85` for agents) and replace with:

```typescript
// For GPU providers with agentId:
const repSummary = await getReputationSummary(BigInt(p.agentId));
const reputation = repSummary.count > 0n
  ? Math.round(Number(repSummary.summaryValue) / (10 ** repSummary.decimals))
  : 75;

// For providers without agentId:
reputation: 75 // keep as fallback
```

**Step 2: Commit**

```bash
git add src/app/api/resources/route.ts
git commit -m "feat(reputation): use real on-chain reputation scores in resources route"
```

---

### Task 5: Build Verification + Deploy

**Step 1: Build**

```bash
rm -rf .next node_modules/.cache && npx next build
```

**Step 2: Test the script**

```bash
npx tsx scripts/compute-retroactive-reputation.ts
```

Expected output:
```
Phase 1: Found 8 providers
Phase 3: Computing signals...
  0xa48f0128... composite: 87 (activity:100 settle:98 tee:100 ...)
Phase 5: Writing 7 signals per provider...
RETROACTIVE REPUTATION COMPLETE
  Providers scored: 8
  Total transactions analyzed: 238
```

**Step 3: Commit + push**

```bash
git add -A
git commit -m "feat(reputation): complete retroactive reputation engine for 0G providers"
git push origin main
```

---

## Verification

1. `npx tsx scripts/compute-retroactive-reputation.ts` runs without errors
2. 8 providers discovered from InferenceServing events
3. Unregistered providers auto-registered (agentId assigned)
4. 7 reputation signals per provider written to ReputationRegistry
5. `/api/resources` shows real scores (not hardcoded 75)
6. HCS audit log records retroactive computation event
7. `npx next build` passes
8. Vercel deployment succeeds
