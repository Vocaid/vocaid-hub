/**
 * Batch-register all 4 Vocaid agents on the 0G IdentityRegistry via ERC-8004.
 *
 * Usage: npx tsx scripts/register-agents.ts [operatorWorldId]
 *
 * Prerequisites:
 * - .env with PRIVATE_KEY and IDENTITY_REGISTRY set
 * - Agent cards in public/agent-cards/{seer,edge,shield,lens}.json
 */

import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const AGENT_NAMES = ["seer", "edge", "shield", "lens"] as const;

const ogGalileo = {
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
} as const;

const IDENTITY_REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentURI", type: "string" },
      {
        name: "metadata",
        type: "tuple[]",
        components: [
          { name: "metadataKey", type: "string" },
          { name: "metadataValue", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
] as const;

function encodeStringToBytes(value: string): Hex {
  return `0x${Buffer.from(value, "utf-8").toString("hex")}` as Hex;
}

async function main() {
  const registryAddr = process.env.IDENTITY_REGISTRY;
  if (!registryAddr) throw new Error("IDENTITY_REGISTRY env not set");
  if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY env not set");

  const operatorWorldId = process.argv[2] || process.env.OPERATOR_WORLD_ID || "pending-verification";
  const rpcUrl = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";

  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY.replace(/^0x/, "")}`);
  const wallet = createWalletClient({ account, chain: ogGalileo, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain: ogGalileo, transport: http(rpcUrl) });

  console.log(`\nRegistering 4 agents on 0G IdentityRegistry (${registryAddr})`);
  console.log(`Operator: ${account.address}`);
  console.log(`Operator World ID: ${operatorWorldId}\n`);

  for (const name of AGENT_NAMES) {
    const cardPath = join(ROOT, "public", "agent-cards", `${name}.json`);
    const card = JSON.parse(readFileSync(cardPath, "utf-8"));
    const agentURI = `/agent-cards/${name}.json`;

    const metadata = [
      { metadataKey: "operator_world_id", metadataValue: encodeStringToBytes(operatorWorldId) },
      { metadataKey: "role", metadataValue: encodeStringToBytes(card.metadata.role) },
      { metadataKey: "type", metadataValue: encodeStringToBytes("ai-agent") },
      { metadataKey: "agentkit_id", metadataValue: encodeStringToBytes(`vocaid-${name}`) },
    ];

    console.log(`Registering ${card.name} (${card.metadata.role})...`);

    const txHash = await wallet.writeContract({
      address: registryAddr as `0x${string}`,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "register",
      args: [agentURI, metadata],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const agentId = receipt.logs[0]?.topics[1] ? BigInt(receipt.logs[0].topics[1]) : "unknown";

    console.log(`  ✓ ${card.name}: agentId=${agentId}, tx=${txHash}`);
  }

  console.log("\nAll 4 agents registered. Verify at https://chainscan-galileo.0g.ai");
}

main().catch((err) => {
  console.error("Registration failed:", err);
  process.exit(1);
});
