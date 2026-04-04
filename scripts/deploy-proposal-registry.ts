/**
 * Deploy AgentProposalRegistry to 0G Galileo (single contract, no full redeploy)
 * Usage: npx tsx scripts/deploy-proposal-registry.ts
 */
import { createPublicClient, createWalletClient, http, encodeAbiParameters, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const ogGalileo = {
  id: 16602,
  name: "0G Galileo",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: { default: { http: [process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai"] } },
} as const;

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error("Set PRIVATE_KEY"); process.exit(1); }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const rpcUrl = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const publicClient = createPublicClient({ chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }) });
  const walletClient = createWalletClient({ account, chain: ogGalileo, transport: http(rpcUrl, { timeout: 60_000 }) });

  const artifact = JSON.parse(readFileSync("artifacts/contracts/0g/AgentProposalRegistry.sol/AgentProposalRegistry.json", "utf-8"));
  const identityProxy = process.env.IDENTITY_REGISTRY!;
  const prediction = process.env.RESOURCE_PREDICTION!;

  console.log("Deploying AgentProposalRegistry...");
  console.log(`  identityRegistry: ${identityProxy}`);
  console.log(`  resourcePrediction: ${prediction}`);

  const ctor = artifact.abi.find((x: { type: string }) => x.type === "constructor");
  const encoded = encodeAbiParameters(ctor.inputs, [identityProxy, prediction]);
  const deployData = (artifact.bytecode + encoded.slice(2)) as Hex;

  const txHash = await walletClient.sendTransaction({ data: deployData, chain: ogGalileo });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, retryCount: 30, pollingInterval: 5_000 });

  if (!receipt.contractAddress) { console.error("Deploy failed"); process.exit(1); }
  console.log(`  AgentProposalRegistry: ${receipt.contractAddress}`);

  // Update deployments file
  const deployments = JSON.parse(readFileSync("deployments/0g-galileo.json", "utf-8"));
  deployments.contracts.AgentProposalRegistry = receipt.contractAddress;
  writeFileSync("deployments/0g-galileo.json", JSON.stringify(deployments, null, 2));
  console.log("  Saved to deployments/0g-galileo.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
