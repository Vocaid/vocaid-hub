/**
 * Retroactive Reputation Engine
 *
 * Scans 0G InferenceServing events -> computes 6 signals per provider ->
 * auto-registers unregistered providers -> writes scores to ReputationRegistry.
 *
 * Usage: npx tsx scripts/compute-retroactive-reputation.ts
 */

import { config } from 'dotenv';
config();

import { ethers } from 'ethers';
import {
  createPublicClient, createWalletClient, http, keccak256, toHex,
  decodeEventLog,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const ogGalileo = {
  id: 16602,
  name: '0G Galileo',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: { default: { http: [process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai'] } },
} as const;

const rpcUrl = process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai';
const WAIT_OPTS = { retryCount: 30, pollingInterval: 5_000 };

const deployment = JSON.parse(readFileSync(join(ROOT, 'deployments/0g-galileo.json'), 'utf-8'));
const C = deployment.contracts as Record<string, `0x${string}`>;

// ABIs
const identityABI = [
  { name: 'register', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'agentURI', type: 'string' }], outputs: [{ name: 'agentId', type: 'uint256' }] },
  { name: 'Registered', type: 'event' as const,
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'agentURI', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: true },
    ] },
] as const;

const gpuProviderABI = [
  { name: 'registerProvider', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'agentId', type: 'uint256' }, { name: 'gpuModel', type: 'string' },
      { name: 'teeType', type: 'string' }, { name: 'attestationHash', type: 'bytes32' },
    ], outputs: [] },
  { name: 'providers', type: 'function' as const, stateMutability: 'view' as const,
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'agentId', type: 'uint256' }, { name: 'gpuModel', type: 'string' },
      { name: 'teeType', type: 'string' }, { name: 'attestationHash', type: 'bytes32' },
      { name: 'registeredAt', type: 'uint256' }, { name: 'active', type: 'bool' },
    ] },
] as const;

const reputationABI = [
  { name: 'giveFeedback', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'agentId', type: 'uint256' }, { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' }, { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' }, { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' }, { name: 'feedbackHash', type: 'bytes32' },
    ], outputs: [] },
] as const;

async function main() {
  const { scanProviderActivity, getProviderService } = await import('../src/lib/og-inference-serving.js');
  const { computeSignals, computeMedianPrice } = await import('../src/lib/retroactive-reputation.js');

  const demoPk = process.env.DEMO_WALLET_KEY;
  if (!demoPk) {
    console.error('DEMO_WALLET_KEY not set.');
    process.exit(1);
  }

  const demoAccount = privateKeyToAccount(demoPk as `0x${string}`);
  const publicClient = createPublicClient({
    chain: ogGalileo,
    transport: http(rpcUrl, { timeout: 60_000 }),
    pollingInterval: 4_000,
  });
  const demoWallet = createWalletClient({
    account: demoAccount,
    chain: ogGalileo,
    transport: http(rpcUrl, { timeout: 60_000 }),
  });

  console.log('='.repeat(60));
  console.log('Retroactive Reputation Engine');
  console.log('='.repeat(60));
  console.log('Demo wallet:', demoAccount.address);

  // ── Phase 1: Scan events ──────────────────────────────────
  console.log('\nPhase 1: Scanning InferenceServing events (last 2M blocks)...');
  const activityMap = await scanProviderActivity(2_000_000);
  console.log(`  Found ${activityMap.size} providers`);
  for (const [addr, a] of activityMap) {
    console.log(`  ${addr.slice(0, 12)}... txs:${a.txCount} clients:${a.uniqueClients} vol:${ethers.formatEther(a.totalVolume)} refunds:${a.refundCount}`);
  }

  // ── Phase 2: Service metadata ─────────────────────────────
  console.log('\nPhase 2: Fetching service metadata...');
  const services = new Map<string, Awaited<ReturnType<typeof getProviderService>>>();
  for (const addr of activityMap.keys()) {
    const svc = await getProviderService(addr);
    services.set(addr, svc);
    console.log(`  ${addr.slice(0, 12)}... ${svc ? svc.model : '(offline)'}`);
  }

  // ── Phase 3: Compute signals ──────────────────────────────
  console.log('\nPhase 3: Computing reputation signals...');
  const medianPrice = computeMedianPrice([...services.values()]);
  const ethersProvider = new ethers.JsonRpcProvider(rpcUrl);
  const currentBlock = await ethersProvider.getBlockNumber();

  const signals = new Map<string, ReturnType<typeof computeSignals>>();
  for (const [addr, activity] of activityMap) {
    const svc = services.get(addr) ?? null;
    const s = computeSignals(activity, svc, medianPrice, currentBlock);
    signals.set(addr, s);
    console.log(`  ${addr.slice(0, 12)}... composite:${s.composite} [act:${s.activity} set:${s.settlementHealth} tee:${s.teeCompliance} pri:${s.pricing} dis:${s.disputeRate} age:${s.longevity}]`);
  }

  // ── Phase 4: Auto-register ────────────────────────────────
  console.log('\nPhase 4: Auto-registering unregistered providers...');
  const agentIds = new Map<string, bigint>();

  for (const addr of activityMap.keys()) {
    // Check existing registration
    try {
      const existing = await publicClient.readContract({
        address: C.GPUProviderRegistry as `0x${string}`,
        abi: gpuProviderABI,
        functionName: 'providers',
        args: [addr as `0x${string}`],
      });
      if (Number(existing[4]) > 0) {
        agentIds.set(addr, existing[0] as bigint);
        console.log(`  ${addr.slice(0, 12)}... already registered (agentId: ${existing[0]})`);
        continue;
      }
    } catch {
      // Not registered — proceed
    }

    const svc = services.get(addr);
    const agentURI = `https://vocaid-hub.vercel.app/retroactive/${addr.slice(2, 12)}.json`;

    try {
      // Register identity
      const h1 = await demoWallet.writeContract({
        address: C.IdentityRegistry as `0x${string}`,
        abi: identityABI,
        functionName: 'register',
        args: [agentURI],
        chain: ogGalileo,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: h1, ...WAIT_OPTS });

      const registeredTopic = keccak256(toHex('Registered(uint256,string,address)'));
      const log = receipt.logs.find((l) =>
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

      console.log(`  ${addr.slice(0, 12)}... registered agentId:${agentId} model:${model}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.slice(0, 60) : String(e).slice(0, 60);
      console.log(`  ${addr.slice(0, 12)}... failed: ${msg}`);
    }
  }

  // ── Phase 5: Write reputation ─────────────────────────────
  console.log('\nPhase 5: Writing reputation scores...');

  const TAGS = [
    'retroactive-activity', 'retroactive-settlement', 'retroactive-tee',
    'retroactive-pricing', 'retroactive-disputes', 'retroactive-longevity', 'retroactive-composite',
  ] as const;
  const KEYS = ['activity', 'settlementHealth', 'teeCompliance', 'pricing', 'disputeRate', 'longevity', 'composite'] as const;

  for (const [addr, s] of signals) {
    const agentId = agentIds.get(addr);
    if (!agentId) {
      console.log(`  ${addr.slice(0, 12)}... skipped (no agentId)`);
      continue;
    }

    let written = 0;
    for (let i = 0; i < TAGS.length; i++) {
      const value = s[KEYS[i]];
      const fbHash = keccak256(toHex(`retro-${addr}-${TAGS[i]}-${Date.now()}`));
      try {
        const h = await demoWallet.writeContract({
          address: C.ReputationRegistry as `0x${string}`,
          abi: reputationABI,
          functionName: 'giveFeedback',
          args: [agentId, BigInt(value * 100), 2, TAGS[i], 'retroactive', '/retroactive', `retro:${TAGS[i]}`, fbHash],
          chain: ogGalileo,
        });
        await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
        written++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message.slice(0, 50) : String(e).slice(0, 50);
        console.log(`    ${TAGS[i]} failed: ${msg}`);
      }
    }
    console.log(`  ${addr.slice(0, 12)}... ${written}/7 signals (composite: ${s.composite})`);
  }

  // ── Phase 6: HCS audit ────────────────────────────────────
  const auditTopic = process.env.HEDERA_AUDIT_TOPIC;
  if (auditTopic) {
    console.log('\nPhase 6: Logging to Hedera HCS...');
    try {
      // @ts-expect-error — tsx resolves .ts at runtime
      const { logAuditMessage, initClient } = await import('../src/lib/hedera.ts');
      initClient();
      await logAuditMessage(auditTopic, JSON.stringify({
        type: 'retroactive_reputation_computed',
        providers: activityMap.size,
        totalTx: [...activityMap.values()].reduce((a, v) => a + v.txCount, 0),
        timestamp: new Date().toISOString(),
      }));
      console.log('  Logged to HCS topic ' + auditTopic);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.slice(0, 50) : String(e).slice(0, 50);
      console.log('  HCS failed (non-blocking): ' + msg);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RETROACTIVE REPUTATION COMPLETE');
  console.log(`  Providers scored: ${signals.size}`);
  console.log(`  Total txs analyzed: ${[...activityMap.values()].reduce((a, v) => a + v.txCount, 0)}`);
  console.log('='.repeat(60));
}

main().catch((e) => { console.error(e); process.exit(1); });
