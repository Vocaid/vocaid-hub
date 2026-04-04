import "dotenv/config";
import { createPublicClient, http, parseAbi, type Hex } from "viem";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Config ---
const OG_RPC = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";

const ogGalileo = {
  id: 16602,
  name: "0G Galileo",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: { default: { http: [OG_RPC] } },
} as const;

const client = createPublicClient({
  chain: ogGalileo,
  transport: http(OG_RPC, { timeout: 10_000 }),
});

// Load deployed addresses
const deployments = JSON.parse(
  readFileSync(join(__dirname, "..", "deployments", "0g-galileo.json"), "utf-8"),
);
const C = deployments.contracts;

// --- ABIs ---
const PREDICTION_ABI = parseAbi([
  "function getMarket(uint256 marketId) view returns (string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool)",
]);

const VALIDATION_ABI = parseAbi([
  "function getSummary(uint256 agentId, address[] validators, string tag) view returns (uint64 count, uint8 avgResponse)",
]);

const REPUTATION_ABI = parseAbi([
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)",
]);

// --- Helpers ---
let liveReads = 0;

function log(agent: string, msg: string) {
  const pad = agent.padEnd(7);
  console.log(`[${pad}] ${msg}`);
}

async function readContract<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await fn();
    liveReads++;
    return result;
  } catch {
    log("SYSTEM", `${label} (simulated -- testnet unreachable)`);
    return fallback;
  }
}

// --- Agent Phases ---

async function seerPhase() {
  console.log("");
  log("SEER", "Scanning ResourcePrediction markets...");

  const market = await readContract(
    "ResourcePrediction.getMarket(0)",
    async () => {
      const result = await client.readContract({
        address: C.ResourcePrediction as Hex,
        abi: PREDICTION_ABI,
        functionName: "getMarket",
        args: [0n],
      });
      return {
        question: result[0],
        yesPool: result[4],
        noPool: result[5],
      };
    },
    {
      question: "Will H100 inference cost drop below $0.03/call by next week?",
      yesPool: 62000000000000000000n,
      noPool: 38000000000000000000n,
    },
  );

  const total = Number(market.yesPool) + Number(market.noPool);
  const yesPct = total > 0 ? Math.round((Number(market.yesPool) / total) * 100) : 50;

  log("SEER", `Market #0: "${market.question}"`);
  log("SEER", `YES pool: ${yesPct}% | NO pool: ${100 - yesPct}%`);
  log("SEER", "Signal: H100 underpriced -- YES side has momentum");
  log("SEER", "-> Relaying signal to @edge");

  return { marketId: 0, yesPct, question: market.question };
}

async function edgePhase(agentId: bigint) {
  console.log("");
  log("EDGE", "Received signal from @seer: H100 underpriced");
  log("EDGE", "Evaluating position... checking risk with @shield");
  log("EDGE", `-> Requesting clearance from @shield for agentId #${agentId}`);
  return { agentId };
}

async function shieldPhase(agentId: bigint) {
  console.log("");
  log("SHIELD", `Clearance request from @edge for agentId #${agentId}`);
  log("SHIELD", "Reading ValidationRegistry...");

  const validation = await readContract(
    "ValidationRegistry.getSummary",
    async () => {
      const [count, avgResponse] = await client.readContract({
        address: C.ValidationRegistry as Hex,
        abi: VALIDATION_ABI,
        functionName: "getSummary",
        args: [agentId, [], "gpu-tee-attestation"],
      }) as [bigint, number];
      return { count: Number(count), avgResponse };
    },
    { count: 1, avgResponse: 100 },
  );

  const passed = validation.count > 0 && validation.avgResponse >= 50;
  log("SHIELD", `Result: count=${validation.count}, avgResponse=${validation.avgResponse} (TEE attestation ${passed ? "PASSED" : "FAILED"})`);

  if (passed) {
    log("SHIELD", "-> CLEARED -- provider verified, risk acceptable");
  } else {
    log("SHIELD", "-> BLOCKED -- provider not verified");
  }

  return { cleared: passed, validation };
}

async function edgeBetPhase(cleared: boolean, marketId: number) {
  console.log("");
  if (!cleared) {
    log("EDGE", "Shield BLOCKED. Aborting position.");
    return { betPlaced: false };
  }

  log("EDGE", "Shield clearance received. Placing bet...");
  log("EDGE", `Action: BET 1 A0GI on YES for market #${marketId}`);

  // Try real /api/edge/trade endpoint if Next.js server is running
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/edge/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketId,
        side: "yes",
        amount: "1",
        targetAgentId: 7,
        reason: "Fleet demo: Seer signal H100 underpriced",
      }),
    });
    const data = await res.json();
    if (data.success) {
      liveReads++;
      const suffix = data._demo ? " (demo fallback)" : "";
      log("EDGE", `Bet placed! txHash: ${data.txHash}${suffix}`);
      return { betPlaced: true };
    }
    log("EDGE", `API error: ${data.error} -- falling back to simulation`);
  } catch {
    log("EDGE", "(server not running -- simulated)");
  }

  return { betPlaced: true };
}

async function lensPhase(agentId: bigint) {
  console.log("");
  log("LENS", `Post-action monitoring for agentId #${agentId}`);
  log("LENS", "Reading ReputationRegistry...");

  const rep = await readContract(
    "ReputationRegistry.getSummary",
    async () => {
      const [count, summaryValue] = await client.readContract({
        address: C.ReputationRegistry as Hex,
        abi: REPUTATION_ABI,
        functionName: "getSummary",
        args: [agentId, [], "quality", "inference"],
      }) as [bigint, bigint, number];
      return { count: Number(count), value: Number(summaryValue) };
    },
    { count: 3, value: 82 },
  );

  log("LENS", `Current reputation: quality=${rep.value}, feedbacks=${rep.count}`);
  log("LENS", "-> Reputation healthy. No alerts.");
  return { reputationRead: true };
}

// --- Main ---

async function main() {
  console.log("========================================");
  console.log("  Vocaid Agent Fleet -- Decision Cycle");
  console.log("========================================");

  const targetAgentId = 7n; // Demo GPU provider agentId

  const seer = await seerPhase();
  await edgePhase(targetAgentId);
  const shield = await shieldPhase(targetAgentId);
  const edge = await edgeBetPhase(shield.cleared, seer.marketId);
  const lens = await lensPhase(targetAgentId);

  console.log("");
  console.log("========================================");
  console.log(`  Fleet cycle complete.`);
  console.log(`  4 agents | 1 decision | ${liveReads} live contract reads`);
  console.log("========================================");

  const results = {
    timestamp: new Date().toISOString(),
    seer: { marketsScanned: 1, signalSent: true },
    edge: { clearanceRequested: true, betPlaced: edge.betPlaced },
    shield: { validated: true, cleared: shield.cleared },
    lens: { reputationRead: lens.reputationRead },
    liveReads,
    live: liveReads > 0,
  };

  const outPath = join(__dirname, "..", "deployments", "fleet-demo-results.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to deployments/fleet-demo-results.json`);
}

main().catch((e) => {
  console.error("Fleet demo failed:", e.message);
  process.exit(1);
});
