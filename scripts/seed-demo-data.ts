/**
 * Seed on-chain demo data for Vocaid Hub on 0G Galileo.
 * Registers ERC-8004 identities, GPU providers, TEE validations,
 * prediction markets, and initial bets.
 *
 * Usage: npx tsx scripts/seed-demo-data.ts
 *
 * Prerequisites:
 * - Contracts deployed: npx tsx scripts/deploy-0g.ts
 * - .env with PRIVATE_KEY=0x...
 */

import { config } from "dotenv";
config();

import {
  createPublicClient, createWalletClient, http, parseEther,
  keccak256, encodePacked, toHex, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// 0G Galileo chain definition
const ogGalileo = {
  id: 16602,
  name: "0G Galileo",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: { default: { http: [process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai"] } },
} as const;

// Load deployed addresses
const deployment = JSON.parse(readFileSync(join(ROOT, "deployments/0g-galileo.json"), "utf-8"));
const C = deployment.contracts as Record<string, `0x${string}`>;

// ── ABIs ──────────────────────────────────────────────────
const identityABI = [
  { name: "register", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }], outputs: [{ name: "agentId", type: "uint256" }] },
] as const;

const gpuProviderABI = [
  { name: "registerProvider", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" }, { name: "gpuModel", type: "string" },
      { name: "teeType", type: "string" }, { name: "attestationHash", type: "bytes32" },
    ], outputs: [] },
] as const;

const validationABI = [
  { name: "validationRequest", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "validatorAddress", type: "address" }, { name: "agentId", type: "uint256" },
      { name: "requestURI", type: "string" }, { name: "requestHash", type: "bytes32" },
    ], outputs: [] },
] as const;

const mockTEEABI = [
  { name: "validate", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "requestHash", type: "bytes32" }, { name: "response", type: "uint8" },
      { name: "responseURI", type: "string" }, { name: "responseHash", type: "bytes32" },
      { name: "tag", type: "string" }, { name: "signature", type: "bytes" },
    ], outputs: [] },
] as const;

const predictionABI = [
  { name: "createMarket", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "question", type: "string" }, { name: "resolutionTime", type: "uint256" }],
    outputs: [{ name: "marketId", type: "uint256" }] },
  { name: "nextMarketId", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "placeBet", type: "function", stateMutability: "payable",
    inputs: [{ name: "marketId", type: "uint256" }, { name: "side", type: "uint8" }], outputs: [] },
] as const;

// ── Constants ─────────────────────────────────────────────
const WAIT_OPTS = { retryCount: 30, pollingInterval: 5_000 };
const BASE = "https://vocaid-hub.vercel.app/agent-cards";

const AGENTS = [
  { label: "GPU-Alpha (H100 80GB)", uri: `${BASE}/gpu-alpha.json` },
  { label: "GPU-Beta (H200 141GB)", uri: `${BASE}/gpu-beta.json` },
  { label: "Seer Agent",           uri: `${BASE}/seer.json` },
  { label: "Edge Agent",           uri: `${BASE}/edge.json` },
  { label: "Maria (Rust L4)",      uri: `${BASE}/maria.json` },
  { label: "Carlos (ML L3)",       uri: `${BASE}/carlos.json` },
];

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error("Set PRIVATE_KEY in .env"); process.exit(1); }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const rpcUrl = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const publicClient = createPublicClient({ chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }), pollingInterval: 4_000 });
  const walletClient = createWalletClient({ account, chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }) });

  const balance = await publicClient.getBalance({ address: account.address });

  console.log("=".repeat(60));
  console.log("Vocaid — Demo Data Seeder");
  console.log("=".repeat(60));
  console.log(`Chain ID: ${ogGalileo.id}`);
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance:  ${(Number(balance) / 1e18).toFixed(4)} A0GI\n`);

  // ── Phase 1: Register 6 ERC-8004 identities ────────────
  console.log("Phase 1: Registering 6 ERC-8004 identities...");
  const agentIds: bigint[] = [];
  for (const agent of AGENTS) {
    const hash = await walletClient.writeContract({
      address: C.IdentityRegistry, abi: identityABI, functionName: "register", args: [agent.uri], chain: ogGalileo,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, ...WAIT_OPTS });
    // Filter for Registered event (skip ERC-721 Transfer event from same contract)
    const registeredTopic = keccak256(toHex("Registered(uint256,string,address)"));
    const log = receipt.logs.find((l: any) =>
      l.address.toLowerCase() === C.IdentityRegistry.toLowerCase() &&
      l.topics[0] === registeredTopic
    );
    const agentId = BigInt(log!.topics[1] as string);
    agentIds.push(agentId);
    console.log(`  ${agent.label}: agentId ${agentId}`);
  }

  // ── Phase 2: Register GPU provider ─────────────────────
  console.log("\nPhase 2: Registering GPU provider...");
  const alphaHash = keccak256(toHex("gpu-alpha-attestation"));
  const h2 = await walletClient.writeContract({
    address: C.GPUProviderRegistry, abi: gpuProviderABI, functionName: "registerProvider",
    args: [agentIds[0], "NVIDIA H100 80GB", "Intel TDX", alphaHash], chain: ogGalileo,
  });
  await publicClient.waitForTransactionReceipt({ hash: h2, ...WAIT_OPTS });
  console.log("  GPU-Alpha registered (H100 / Intel TDX)");
  console.log("  Note: GPU-Beta skipped (1 provider per wallet limit)");

  // ── Phase 3: TEE validation for GPU-Alpha ──────────────
  console.log("\nPhase 3: Submitting TEE validation...");
  const requestHash = keccak256(toHex(`gpu-alpha-tee-request-${Date.now()}`));
  const h3a = await walletClient.writeContract({
    address: C.ValidationRegistry, abi: validationABI, functionName: "validationRequest",
    args: [C.MockTEEValidator, agentIds[0], "https://vocaid-hub.vercel.app/attestations/gpu-alpha.json", requestHash],
    chain: ogGalileo,
  });
  await publicClient.waitForTransactionReceipt({ hash: h3a, ...WAIT_OPTS });
  console.log("  GPU-Alpha: validation request submitted");

  const responseURI = "https://vocaid-hub.vercel.app/attestations/gpu-alpha-response.json";
  const responseHash = keccak256(toHex(responseURI));
  const packed = encodePacked(["bytes32", "uint8", "bytes32"], [requestHash, 100, responseHash]);
  const digest = keccak256(packed);
  const signature = await walletClient.signMessage({ account, message: { raw: digest as Hex } });

  const h3b = await walletClient.writeContract({
    address: C.MockTEEValidator, abi: mockTEEABI, functionName: "validate",
    args: [requestHash, 100, responseURI, responseHash, "gpu-tee-attestation", signature], chain: ogGalileo,
  });
  await publicClient.waitForTransactionReceipt({ hash: h3b, ...WAIT_OPTS });
  console.log("  GPU-Alpha: mock TEE response (score: 100)");

  // ── Phase 4: Create 3 prediction markets ───────────────
  console.log("\nPhase 4: Creating 3 prediction markets...");
  const startId = await publicClient.readContract({
    address: C.ResourcePrediction, abi: predictionABI, functionName: "nextMarketId",
  }) as bigint;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const DAY = 86400n;
  const markets = [
    { q: "Will H100 cost drop below $0.005 per token by May?", dt: 30n * DAY },
    { q: "Rust developer demand +15% in Q2 2026?", dt: 60n * DAY },
    { q: "EU GPU capacity will exceed US by end of 2026?", dt: 90n * DAY },
  ];
  for (let i = 0; i < markets.length; i++) {
    const h = await walletClient.writeContract({
      address: C.ResourcePrediction, abi: predictionABI, functionName: "createMarket",
      args: [markets[i].q, now + markets[i].dt], chain: ogGalileo,
    });
    await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
    console.log(`  Market ${startId + BigInt(i)}: "${markets[i].q.slice(0, 45)}..."`);
  }

  // ── Phase 5: Place initial bets ────────────────────────
  console.log("\nPhase 5: Placing initial bets...");
  const bets: [bigint, string, string][] = [
    [startId,          "0.062", "0.038"],
    [startId + 1n,     "0.045", "0.055"],
    [startId + 2n,     "0.03",  "0.07"],
  ];
  for (const [mId, yesAmt, noAmt] of bets) {
    const hy = await walletClient.writeContract({
      address: C.ResourcePrediction, abi: predictionABI, functionName: "placeBet",
      args: [mId, 1], value: parseEther(yesAmt), chain: ogGalileo,
    });
    await publicClient.waitForTransactionReceipt({ hash: hy, ...WAIT_OPTS });
    const hn = await walletClient.writeContract({
      address: C.ResourcePrediction, abi: predictionABI, functionName: "placeBet",
      args: [mId, 2], value: parseEther(noAmt), chain: ogGalileo,
    });
    await publicClient.waitForTransactionReceipt({ hash: hn, ...WAIT_OPTS });
    console.log(`  Market ${mId}: ${yesAmt} A0GI Yes, ${noAmt} A0GI No`);
  }

  // ── Phase 6: Demo wallet — reputation feedback + GPU-Beta ──
  const demoPk = process.env.DEMO_WALLET_KEY;
  if (demoPk) {
    console.log("\nPhase 6: Seeding reputation + GPU-Beta (demo wallet)...");
    const demoAccount = privateKeyToAccount(demoPk as `0x${string}`);
    const demoWallet = createWalletClient({ account: demoAccount, chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }) });

    const reputationABI = [
      { name: "giveFeedback", type: "function", stateMutability: "nonpayable",
        inputs: [
          { name: "agentId", type: "uint256" }, { name: "value", type: "int128" },
          { name: "valueDecimals", type: "uint8" }, { name: "tag1", type: "string" },
          { name: "tag2", type: "string" }, { name: "endpoint", type: "string" },
          { name: "feedbackURI", type: "string" }, { name: "feedbackHash", type: "bytes32" },
        ], outputs: [] },
    ] as const;

    // Give reputation feedback to first 4 agents (demo wallet != owner, so allowed)
    const feedbacks = [
      { agentId: agentIds[0], value: 85n, tag1: "uptime", tag2: "gpu" },
      { agentId: agentIds[1], value: 92n, tag1: "responseTime", tag2: "gpu" },
      { agentId: agentIds[2], value: 78n, tag1: "successRate", tag2: "inference" },
      { agentId: agentIds[3], value: 88n, tag1: "uptime", tag2: "settlement" },
    ];

    for (const fb of feedbacks) {
      try {
        const h = await demoWallet.writeContract({
          address: C.ReputationRegistry, abi: reputationABI, functionName: "giveFeedback",
          args: [fb.agentId, fb.value, 2, fb.tag1, fb.tag2, "", "", keccak256(toHex(`feedback-${fb.agentId}`))],
          chain: ogGalileo,
        });
        await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
        console.log(`  Agent ${fb.agentId}: feedback ${fb.value}/100 (${fb.tag1})`);
      } catch (e: any) {
        console.log(`  Agent ${fb.agentId}: feedback skipped (${e.message?.slice(0, 60)})`);
      }
    }

    // Register GPU-Beta with demo wallet (different address = no AlreadyRegistered)
    try {
      const betaHash = keccak256(toHex("gpu-beta-attestation"));
      const h = await demoWallet.writeContract({
        address: C.GPUProviderRegistry, abi: gpuProviderABI, functionName: "registerProvider",
        args: [agentIds[1], "NVIDIA H200 141GB", "AMD SEV", betaHash], chain: ogGalileo,
      });
      await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
      console.log("  GPU-Beta registered (H200 / AMD SEV)");
    } catch (e: any) {
      console.log(`  GPU-Beta: skipped (${e.message?.slice(0, 60)})`);
    }
  } else {
    console.log("\nPhase 6: Skipped (no DEMO_WALLET_KEY — reputation uses mock fallback)");
  }

  // ── Phase 7: Log seed event to Hedera HCS (optional) ──
  const auditTopic = process.env.HEDERA_AUDIT_TOPIC;
  if (auditTopic) {
    console.log("\nPhase 7: Logging seed event to Hedera HCS...");
    // @ts-expect-error — tsx resolves .ts imports at runtime
    const { logAuditMessage, initClient } = await import("../src/lib/hedera.ts");
    initClient();
    await logAuditMessage(auditTopic, JSON.stringify({
      type: "demo_seed_complete",
      agentIds: agentIds.map(String),
      markets: 3,
      timestamp: new Date().toISOString(),
    }));
    console.log("  Seed event logged to HCS topic " + auditTopic);
  }

  console.log("\n" + "=".repeat(60));
  console.log("SEED COMPLETE");
  console.log("=".repeat(60));
}

main().catch((e) => { console.error(e); process.exit(1); });
