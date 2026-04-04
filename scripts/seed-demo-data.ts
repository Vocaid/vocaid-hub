/**
 * Seed on-chain demo data for Vocaid Hub on 0G Galileo.
 * Registers ERC-8004 identities, GPU providers, TEE validations,
 * reputation feedback, prediction markets, and initial bets.
 * Optionally logs a summary to Hedera HCS.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts            # execute all transactions
 *   npx tsx scripts/seed-demo-data.ts --dry-run   # log what would be done
 *
 * Prerequisites:
 * - Contracts deployed: npx tsx scripts/deploy-0g.ts
 * - .env.local with PRIVATE_KEY, DEMO_WALLET_KEY, HEDERA_* vars
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env

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

// ── CLI flags ────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");

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

const reputationABI = [
  { name: "giveFeedback", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" }, { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" }, { name: "tag1", type: "string" },
      { name: "tag2", type: "string" }, { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" }, { name: "feedbackHash", type: "bytes32" },
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
  { label: "GPU-Alpha (H100 80GB)", uri: `${BASE}/gpu-alpha.json`, gpu: "NVIDIA H100 80GB", tee: "Intel TDX" },
  { label: "GPU-Beta (H200 141GB)", uri: `${BASE}/gpu-beta.json`, gpu: "NVIDIA H200 141GB", tee: "Intel TDX" },
  { label: "Seer Agent",           uri: `${BASE}/seer.json` },
  { label: "Edge Agent",           uri: `${BASE}/edge.json` },
  { label: "Maria (Rust L4)",      uri: `${BASE}/maria.json` },
  { label: "Carlos (ML L3)",       uri: `${BASE}/carlos.json` },
];

// ── Summary tracker ──────────────────────────────────────
interface SeedResult {
  phase: string;
  action: string;
  status: "ok" | "skipped" | "error";
  detail: string;
  txHash?: string;
}
const results: SeedResult[] = [];

function record(phase: string, action: string, status: SeedResult["status"], detail: string, txHash?: string) {
  results.push({ phase, action, status, detail, txHash });
  const prefix = status === "ok" ? "  [OK]" : status === "skipped" ? "  [SKIP]" : "  [ERR]";
  console.log(`${prefix} ${action}: ${detail}`);
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error("Set PRIVATE_KEY in .env.local"); process.exit(1); }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const rpcUrl = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const publicClient = createPublicClient({ chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }), pollingInterval: 4_000 });
  const walletClient = createWalletClient({ account, chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }) });

  const balance = await publicClient.getBalance({ address: account.address });

  console.log("=".repeat(60));
  console.log(`Vocaid Hub — Demo Data Seeder${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log("=".repeat(60));
  console.log(`Chain ID: ${ogGalileo.id}`);
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance:  ${(Number(balance) / 1e18).toFixed(4)} A0GI\n`);

  // ── Phase 1: Register 6 ERC-8004 identities ────────────
  console.log("Phase 1: Registering 6 ERC-8004 identities...");
  const agentIds: bigint[] = [];

  for (const agent of AGENTS) {
    if (DRY_RUN) {
      const fakeId = BigInt(agentIds.length + 1);
      agentIds.push(fakeId);
      record("1-identity", agent.label, "ok", `would register identity (agentId placeholder: ${fakeId})`);
      continue;
    }
    try {
      const hash = await walletClient.writeContract({
        address: C.IdentityRegistry, abi: identityABI, functionName: "register", args: [agent.uri], chain: ogGalileo,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, ...WAIT_OPTS });
      const registeredTopic = keccak256(toHex("Registered(uint256,string,address)"));
      const log = receipt.logs.find((l: any) =>
        l.address.toLowerCase() === C.IdentityRegistry.toLowerCase() &&
        l.topics[0] === registeredTopic
      );
      const agentId = BigInt(log!.topics[1] as string);
      agentIds.push(agentId);
      record("1-identity", agent.label, "ok", `agentId ${agentId}`, hash);
    } catch (e: any) {
      agentIds.push(0n);
      record("1-identity", agent.label, "error", e.message?.slice(0, 80) ?? String(e));
    }
  }

  // ── Phase 2: Register 2 GPU providers ──────────────────
  console.log("\nPhase 2: Registering GPU providers...");

  // GPU-Alpha (deployer wallet)
  const alphaHash = keccak256(toHex("gpu-alpha-attestation"));
  if (DRY_RUN) {
    record("2-gpu", "GPU-Alpha", "ok", "would register H100 / Intel TDX");
  } else {
    try {
      const h = await walletClient.writeContract({
        address: C.GPUProviderRegistry, abi: gpuProviderABI, functionName: "registerProvider",
        args: [agentIds[0], "NVIDIA H100 80GB", "Intel TDX", alphaHash], chain: ogGalileo,
      });
      await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
      record("2-gpu", "GPU-Alpha", "ok", "H100 / Intel TDX registered", h);
    } catch (e: any) {
      const msg = e.message ?? String(e);
      if (msg.includes("0x3a81d6fc") || msg.includes("AlreadyRegistered")) {
        record("2-gpu", "GPU-Alpha", "skipped", "already registered");
      } else {
        record("2-gpu", "GPU-Alpha", "error", msg.slice(0, 80));
      }
    }
  }

  // GPU-Beta (demo wallet or deployer fallback)
  const demoPk = process.env.DEMO_WALLET_KEY;
  let demoAccount: ReturnType<typeof privateKeyToAccount> | null = null;
  let demoWallet: ReturnType<typeof createWalletClient> | null = null;

  if (demoPk) {
    demoAccount = privateKeyToAccount(demoPk as `0x${string}`);
    demoWallet = createWalletClient({ account: demoAccount, chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }) });
  }

  if (DRY_RUN) {
    record("2-gpu", "GPU-Beta", "ok", "would register H200 / Intel TDX");
  } else if (demoAccount && demoWallet) {
    // Approve demo wallet on GPU-Beta identity
    try {
      const approveABI = [{ name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], outputs: [] }] as const;
      const hApprove = await walletClient.writeContract({
        address: C.IdentityRegistry, abi: approveABI, functionName: "approve",
        args: [demoAccount.address, agentIds[1]], chain: ogGalileo,
      });
      await publicClient.waitForTransactionReceipt({ hash: hApprove, ...WAIT_OPTS });
      record("2-gpu", "GPU-Beta approval", "ok", "demo wallet approved on identity", hApprove);
    } catch (e: any) {
      record("2-gpu", "GPU-Beta approval", "skipped", e.message?.slice(0, 60) ?? String(e));
    }

    try {
      const betaHash = keccak256(toHex("gpu-beta-attestation"));
      const h = await demoWallet.writeContract({
        address: C.GPUProviderRegistry, abi: gpuProviderABI, functionName: "registerProvider",
        args: [agentIds[1], "NVIDIA H200 141GB", "Intel TDX", betaHash], chain: ogGalileo,
      });
      await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
      record("2-gpu", "GPU-Beta", "ok", "H200 / Intel TDX registered", h);
    } catch (e: any) {
      const msg = e.message ?? String(e);
      if (msg.includes("AlreadyRegistered")) {
        record("2-gpu", "GPU-Beta", "skipped", "already registered");
      } else {
        record("2-gpu", "GPU-Beta", "error", msg.slice(0, 80));
      }
    }
  } else {
    record("2-gpu", "GPU-Beta", "skipped", "no DEMO_WALLET_KEY set");
  }

  // ── Phase 3: Reputation feedback ───────────────────────
  console.log("\nPhase 3: Writing reputation feedback...");

  // Feedback definitions per task spec
  const feedbacks = [
    // GPU-Alpha: quality 87, uptime 992 (99.2 * 10), responseTime 120
    { agentIdx: 0, label: "GPU-Alpha quality",      value: 87n,  decimals: 0, tag1: "quality",      tag2: "gpu" },
    { agentIdx: 0, label: "GPU-Alpha uptime",        value: 992n, decimals: 1, tag1: "uptime",       tag2: "gpu" },
    { agentIdx: 0, label: "GPU-Alpha responseTime",  value: 120n, decimals: 0, tag1: "responseTime", tag2: "gpu" },
    // GPU-Beta: quality 92, uptime 985 (98.5 * 10), responseTime 85
    { agentIdx: 1, label: "GPU-Beta quality",        value: 92n,  decimals: 0, tag1: "quality",      tag2: "gpu" },
    { agentIdx: 1, label: "GPU-Beta uptime",          value: 985n, decimals: 1, tag1: "uptime",       tag2: "gpu" },
    { agentIdx: 1, label: "GPU-Beta responseTime",    value: 85n,  decimals: 0, tag1: "responseTime", tag2: "gpu" },
  ];

  // Reputation feedback must come from a different wallet than the agent owner
  const fbWallet = demoWallet ?? walletClient; // fallback to deployer if no demo wallet

  for (const fb of feedbacks) {
    const agentId = agentIds[fb.agentIdx];
    if (!agentId) { record("3-reputation", fb.label, "skipped", "no agentId"); continue; }

    if (DRY_RUN) {
      record("3-reputation", fb.label, "ok", `would give feedback value=${fb.value} decimals=${fb.decimals} tag1=${fb.tag1}`);
      continue;
    }

    try {
      const h = await fbWallet.writeContract({
        address: C.ReputationRegistry, abi: reputationABI, functionName: "giveFeedback",
        args: [
          agentId, fb.value, fb.decimals, fb.tag1, fb.tag2,
          "", "",
          keccak256(toHex(`feedback-${agentId}-${fb.tag1}-${Date.now()}`)),
        ],
        chain: ogGalileo,
      });
      await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
      record("3-reputation", fb.label, "ok", `value=${fb.value} decimals=${fb.decimals}`, h);
    } catch (e: any) {
      record("3-reputation", fb.label, "error", e.message?.slice(0, 80) ?? String(e));
    }
  }

  // ── Phase 4: TEE validation for GPU-Alpha ──────────────
  console.log("\nPhase 4: Submitting TEE validation...");

  if (DRY_RUN) {
    record("4-tee", "GPU-Alpha validation request", "ok", "would submit TEE validation request");
    record("4-tee", "GPU-Alpha TEE response", "ok", "would submit mock TEE response (score: 100)");
  } else {
    try {
      const requestHash = keccak256(toHex(`gpu-alpha-tee-request-${Date.now()}`));
      const h3a = await walletClient.writeContract({
        address: C.ValidationRegistry, abi: validationABI, functionName: "validationRequest",
        args: [C.MockTEEValidator, agentIds[0], "https://vocaid-hub.vercel.app/attestations/gpu-alpha.json", requestHash],
        chain: ogGalileo,
      });
      await publicClient.waitForTransactionReceipt({ hash: h3a, ...WAIT_OPTS });
      record("4-tee", "GPU-Alpha validation request", "ok", "submitted", h3a);

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
      record("4-tee", "GPU-Alpha TEE response", "ok", "mock TEE score: 100", h3b);
    } catch (e: any) {
      record("4-tee", "GPU-Alpha TEE", "error", e.message?.slice(0, 80) ?? String(e));
    }
  }

  // ── Phase 5: Create 2 prediction markets ───────────────
  console.log("\nPhase 5: Creating 2 prediction markets...");

  const now = BigInt(Math.floor(Date.now() / 1000));
  const DAY = 86400n;
  const markets = [
    { q: "Will H100 inference cost drop below $0.03/1K tokens by May 2026?", dt: 57n * DAY },  // ~May 31
    { q: "Will GPU provider count exceed 50 by June 2026?",                  dt: 87n * DAY },  // ~June 30
  ];

  let startMarketId = 0n;
  if (!DRY_RUN) {
    try {
      startMarketId = await publicClient.readContract({
        address: C.ResourcePrediction, abi: predictionABI, functionName: "nextMarketId",
      }) as bigint;
    } catch { /* ignore */ }
  }

  const marketIds: bigint[] = [];
  for (let i = 0; i < markets.length; i++) {
    if (DRY_RUN) {
      record("5-markets", `Market ${i}`, "ok", `would create: "${markets[i].q.slice(0, 50)}..."`);
      marketIds.push(BigInt(i));
      continue;
    }
    try {
      const h = await walletClient.writeContract({
        address: C.ResourcePrediction, abi: predictionABI, functionName: "createMarket",
        args: [markets[i].q, now + markets[i].dt], chain: ogGalileo,
      });
      await publicClient.waitForTransactionReceipt({ hash: h, ...WAIT_OPTS });
      const mId = startMarketId + BigInt(i);
      marketIds.push(mId);
      record("5-markets", `Market ${mId}`, "ok", `"${markets[i].q.slice(0, 50)}..."`, h);
    } catch (e: any) {
      record("5-markets", `Market ${i}`, "error", e.message?.slice(0, 80) ?? String(e));
    }
  }

  // ── Phase 6: Place initial bets ────────────────────────
  console.log("\nPhase 6: Placing initial bets...");

  const bets: [bigint, string, string][] = marketIds.map((mId, i) => {
    if (i === 0) return [mId, "0.062", "0.038"];
    return [mId, "0.045", "0.055"];
  });

  for (const [mId, yesAmt, noAmt] of bets) {
    if (DRY_RUN) {
      record("6-bets", `Market ${mId}`, "ok", `would bet ${yesAmt} A0GI Yes, ${noAmt} A0GI No`);
      continue;
    }
    try {
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
      record("6-bets", `Market ${mId}`, "ok", `${yesAmt} A0GI Yes, ${noAmt} A0GI No`, hy);
    } catch (e: any) {
      record("6-bets", `Market ${mId}`, "error", e.message?.slice(0, 80) ?? String(e));
    }
  }

  // ── Phase 7: Log seed event to Hedera HCS (optional) ──
  const auditTopic = process.env.HEDERA_AUDIT_TOPIC;
  if (auditTopic) {
    console.log("\nPhase 7: Logging seed event to Hedera HCS...");

    if (DRY_RUN) {
      record("7-hedera", "HCS audit log", "ok", `would log to topic ${auditTopic}: "Demo seed: 2 providers, 2 markets, 6 reputation entries"`);
    } else {
      try {
        // @ts-expect-error — tsx resolves .ts imports at runtime
        const { logAuditMessage, initClient } = await import("../src/lib/hedera.ts");
        initClient();
        await logAuditMessage(auditTopic, JSON.stringify({
          type: "demo_seed_complete",
          message: "Demo seed: 2 providers, 2 markets, 6 reputation entries",
          agentIds: agentIds.map(String),
          markets: markets.length,
          reputationEntries: feedbacks.length,
          timestamp: new Date().toISOString(),
        }));
        record("7-hedera", "HCS audit log", "ok", `logged to topic ${auditTopic}`);
      } catch (e: any) {
        record("7-hedera", "HCS audit log", "error", e.message?.slice(0, 80) ?? String(e));
      }
    }
  } else {
    console.log("\nPhase 7: Skipped (no HEDERA_AUDIT_TOPIC set)");
  }

  // ── Summary ────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(DRY_RUN ? "DRY RUN COMPLETE — no transactions submitted" : "SEED COMPLETE");
  console.log("=".repeat(60));

  const ok = results.filter(r => r.status === "ok").length;
  const skipped = results.filter(r => r.status === "skipped").length;
  const errors = results.filter(r => r.status === "error").length;
  console.log(`\nResults: ${ok} OK, ${skipped} skipped, ${errors} errors`);

  if (!DRY_RUN) {
    console.log("\nAgent IDs:");
    agentIds.forEach((id, i) => console.log(`  ${AGENTS[i].label}: ${id}`));

    if (marketIds.length > 0) {
      console.log("\nMarket IDs:");
      marketIds.forEach((id, i) => console.log(`  Market ${id}: ${markets[i]?.q.slice(0, 50)}...`));
    }

    const txHashes = results.filter(r => r.txHash).map(r => r.txHash!);
    if (txHashes.length > 0) {
      console.log(`\nTransaction hashes (${txHashes.length} total):`);
      txHashes.forEach(h => console.log(`  ${h}`));
    }
  }

  if (errors > 0) {
    console.log("\nErrors:");
    results.filter(r => r.status === "error").forEach(r => console.log(`  ${r.action}: ${r.detail}`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
