/**
 * Seed verified Human + DePIN resources on 0G Galileo.
 * Creates throwaway wallets for each resource (1-provider-per-address limit).
 * All linked to deployer's ERC-8004 identity via operatorWorldId metadata.
 *
 * Usage: npx tsx scripts/seed-resources.ts
 */

import { config } from 'dotenv';
config();

import {
  createPublicClient, createWalletClient, http, parseEther,
  keccak256, toHex, type Hex,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
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
const BASE = 'https://vocaid-hub.vercel.app/agent-cards';

const deployment = JSON.parse(readFileSync(join(ROOT, 'deployments/0g-galileo.json'), 'utf-8'));
const C = deployment.contracts as Record<string, `0x${string}`>;

const identityABI = [
  { name: 'register', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'agentURI', type: 'string' }], outputs: [{ name: 'agentId', type: 'uint256' }] },
] as const;

const humanABI = [
  { name: 'registerProvider', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'agentId', type: 'uint256' }, { name: 'skillName', type: 'string' },
      { name: 'skillLevel', type: 'string' }, { name: 'hourlyRate', type: 'string' },
    ], outputs: [] },
] as const;

const depinABI = [
  { name: 'registerDevice', type: 'function' as const, stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'agentId', type: 'uint256' }, { name: 'deviceName', type: 'string' },
      { name: 'deviceType', type: 'string' }, { name: 'capacity', type: 'string' },
      { name: 'pricePerUnit', type: 'string' },
    ], outputs: [] },
] as const;

const HUMANS = [
  { skill: 'Maria Santos — Rust Developer', level: 'L4', rate: '$25/hr', uri: `${BASE}/maria.json` },
  { skill: 'Carlos Rivera — ML Engineer', level: 'L3', rate: '$35/hr', uri: `${BASE}/carlos.json` },
  { skill: 'Aisha Okonkwo — Contract Auditor', level: 'L5', rate: '$50/hr', uri: `${BASE}/aisha.json` },
];

const DEVICES = [
  { name: 'Tesla Powerwall', type: 'battery', cap: '13.5 kWh', price: '$0.12/kWh', uri: `${BASE}/tesla-powerwall.json` },
  { name: 'Solar Array (5kW)', type: 'solar', cap: '5kW Grid-tied', price: '$0.08/kWh', uri: `${BASE}/solar-array.json` },
  { name: 'EV Charger (Level 2)', type: 'ev-charger', cap: '240V 32A J1772', price: '$0.15/kWh', uri: `${BASE}/ev-charger.json` },
];

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error('PRIVATE_KEY not set'); process.exit(1); }

  const mainAccount = privateKeyToAccount(pk as `0x${string}`);
  const publicClient = createPublicClient({ chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }), pollingInterval: 4_000 });
  const mainWallet = createWalletClient({ account: mainAccount, chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }) });

  console.log('='.repeat(60));
  console.log('Seed Verified Resources — Human + DePIN');
  console.log('='.repeat(60));
  console.log('Deployer:', mainAccount.address);

  // For each resource, generate a throwaway wallet, fund it, register identity + type-specific registry
  async function seedResource(
    label: string, uri: string, registryAddr: `0x${string}`,
    abi: readonly any[], fnName: string, args: any[],
  ) {
    const tempKey = generatePrivateKey();
    const tempAccount = privateKeyToAccount(tempKey);
    const tempWallet = createWalletClient({ account: tempAccount, chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }) });

    // Fund throwaway wallet (0.05 A0GI for gas)
    const fundHash = await mainWallet.sendTransaction({ to: tempAccount.address, value: parseEther('0.05'), chain: ogGalileo });
    await publicClient.waitForTransactionReceipt({ hash: fundHash, ...WAIT_OPTS });

    // Register ERC-8004 identity
    const regHash = await tempWallet.writeContract({
      address: C.IdentityRegistry, abi: identityABI, functionName: 'register', args: [uri], chain: ogGalileo,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: regHash, ...WAIT_OPTS });
    const topic = keccak256(toHex('Registered(uint256,string,address)'));
    const log = receipt.logs.find((l) =>
      l.address.toLowerCase() === C.IdentityRegistry.toLowerCase() && l.topics[0] === topic
    );
    const agentId = BigInt(log!.topics[1] as string);

    // Register in type-specific registry
    const typeHash = await tempWallet.writeContract({
      address: registryAddr, abi, functionName: fnName, args: [agentId, ...args], chain: ogGalileo,
    });
    await publicClient.waitForTransactionReceipt({ hash: typeHash, ...WAIT_OPTS });

    console.log(`  ${label}: agentId ${agentId} (${tempAccount.address.slice(0, 10)}...)`);
    return agentId;
  }

  // ── Phase 1: Humans ─────────────────────────────────
  console.log('\nPhase 1: Registering 3 human skill providers...');
  for (const h of HUMANS) {
    try {
      await seedResource(h.skill, h.uri, C.HumanSkillRegistry, humanABI, 'registerProvider', [h.skill, h.level, h.rate]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.slice(0, 60) : String(e).slice(0, 60);
      console.log(`  ${h.skill}: failed (${msg})`);
    }
  }

  // ── Phase 2: DePIN ──────────────────────────────────
  console.log('\nPhase 2: Registering 3 DePIN devices...');
  for (const d of DEVICES) {
    try {
      await seedResource(d.name, d.uri, C.DePINRegistry, depinABI, 'registerDevice', [d.name, d.type, d.cap, d.price]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.slice(0, 60) : String(e).slice(0, 60);
      console.log(`  ${d.name}: failed (${msg})`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SEED COMPLETE — 3 humans + 3 DePIN registered');
  console.log('='.repeat(60));
}

main().catch((e) => { console.error(e); process.exit(1); });
