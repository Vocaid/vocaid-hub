/**
 * Standalone deployment script — uses viem directly, reads pre-compiled artifacts.
 * Does NOT depend on Hardhat runtime (avoids config conflicts).
 *
 * Usage: npx tsx scripts/deploy-0g.ts
 *
 * Prerequisites:
 * - Contracts compiled: npx hardhat compile
 * - .env with PRIVATE_KEY=0x...
 */

import { createPublicClient, createWalletClient, http, encodeFunctionData, encodeAbiParameters, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config();

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

function readArtifact(name: string) {
  // Search common artifact paths
  const paths = [
    `artifacts/contracts/0g/erc8004/${name}.sol/${name}.json`,
    `artifacts/contracts/0g/${name}.sol/${name}.json`,
    `artifacts/contracts/0g/interfaces/${name}.sol/${name}.json`,
  ];

  for (const p of paths) {
    try {
      return JSON.parse(readFileSync(join(ROOT, p), "utf-8"));
    } catch {}
  }
  throw new Error(`Artifact not found: ${name}`);
}

async function deployRaw(walletClient: any, publicClient: any, bytecodeWithArgs: Hex) {
  const txHash = await walletClient.sendTransaction({ data: bytecodeWithArgs, chain: ogGalileo });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, retryCount: 30, pollingInterval: 5_000 });
  if (!receipt.contractAddress) throw new Error("Deploy failed");
  return receipt.contractAddress as string;
}

async function deployContract(walletClient: any, publicClient: any, name: string, args: any[] = []) {
  const artifact = readArtifact(name);
  let deployData: Hex = artifact.bytecode as Hex;

  if (args.length > 0) {
    const ctor = artifact.abi.find((x: any) => x.type === "constructor");
    if (ctor && ctor.inputs.length > 0) {
      const encoded = encodeAbiParameters(ctor.inputs, args);
      deployData = (artifact.bytecode + encoded.slice(2)) as Hex;
    }
  }

  const addr = await deployRaw(walletClient, publicClient, deployData);
  console.log(`  ${name}: ${addr}`);
  return addr;
}

async function deployUUPSProxy(walletClient: any, publicClient: any, minimalImpl: string, identityAddr: `0x${string}`) {
  const minimalArtifact = readArtifact("HardhatMinimalUUPS");
  const proxyArtifact = readArtifact("ERC1967Proxy");

  const initCalldata = encodeFunctionData({
    abi: minimalArtifact.abi,
    functionName: "initialize",
    args: [identityAddr],
  });

  const constructorArgs = encodeAbiParameters(
    [{ name: "impl", type: "address" }, { name: "data", type: "bytes" }],
    [minimalImpl as `0x${string}`, initCalldata],
  );

  const deployData = (proxyArtifact.bytecode + constructorArgs.slice(2)) as Hex;
  return deployRaw(walletClient, publicClient, deployData);
}

async function upgradeProxy(walletClient: any, publicClient: any, proxyAddr: string, newImpl: string, reinitData: Hex) {
  const calldata = encodeFunctionData({
    abi: [{
      name: "upgradeToAndCall", type: "function", stateMutability: "payable",
      inputs: [{ name: "newImplementation", type: "address" }, { name: "data", type: "bytes" }],
      outputs: [],
    }],
    functionName: "upgradeToAndCall",
    args: [newImpl as `0x${string}`, reinitData],
  });

  const txHash = await walletClient.sendTransaction({
    to: proxyAddr as `0x${string}`,
    data: calldata,
    chain: ogGalileo,
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash, retryCount: 30, pollingInterval: 5_000 });
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error("Set PRIVATE_KEY in .env"); process.exit(1); }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const rpcUrl = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const publicClient = createPublicClient({
    chain: ogGalileo,
    transport: http(rpcUrl, { timeout: 60_000 }),
    pollingInterval: 4_000,
  });
  const walletClient = createWalletClient({
    account,
    chain: ogGalileo,
    transport: http(rpcUrl, { timeout: 60_000 }),
  });

  const chainId = await publicClient.getChainId();
  const balance = await publicClient.getBalance({ address: account.address });

  console.log("=".repeat(60));
  console.log("Vocaid — 0G Galileo Deployment");
  console.log("=".repeat(60));
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance:  ${Number(balance) / 1e18} A0GI\n`);

  // ─── Phase 1: Implementations ───
  console.log("Phase 1: Deploying implementations...");
  const minimalImpl = await deployContract(walletClient, publicClient, "HardhatMinimalUUPS");
  const identityImpl = await deployContract(walletClient, publicClient, "IdentityRegistryUpgradeable");
  const reputationImpl = await deployContract(walletClient, publicClient, "ReputationRegistryUpgradeable");
  const validationImpl = await deployContract(walletClient, publicClient, "ValidationRegistryUpgradeable");

  // ─── Phase 2: Proxies (MinimalUUPS sets owner) ───
  console.log("\nPhase 2: Deploying UUPS proxies...");
  const zeroAddr = "0x0000000000000000000000000000000000000000" as `0x${string}`;

  const identityProxy = await deployUUPSProxy(walletClient, publicClient, minimalImpl, zeroAddr);
  console.log(`  IdentityRegistry proxy: ${identityProxy}`);

  const reputationProxy = await deployUUPSProxy(walletClient, publicClient, minimalImpl, identityProxy as `0x${string}`);
  console.log(`  ReputationRegistry proxy: ${reputationProxy}`);

  const validationProxy = await deployUUPSProxy(walletClient, publicClient, minimalImpl, identityProxy as `0x${string}`);
  console.log(`  ValidationRegistry proxy: ${validationProxy}`);

  // ─── Phase 3: Upgrade to real implementations ───
  console.log("\nPhase 3: Upgrading to real implementations...");

  const idArtifact = readArtifact("IdentityRegistryUpgradeable");
  await upgradeProxy(walletClient, publicClient, identityProxy, identityImpl,
    encodeFunctionData({ abi: idArtifact.abi, functionName: "initialize" }));
  console.log("  IdentityRegistry upgraded");

  const repArtifact = readArtifact("ReputationRegistryUpgradeable");
  await upgradeProxy(walletClient, publicClient, reputationProxy, reputationImpl,
    encodeFunctionData({ abi: repArtifact.abi, functionName: "initialize", args: [identityProxy as `0x${string}`] }));
  console.log("  ReputationRegistry upgraded");

  const valArtifact = readArtifact("ValidationRegistryUpgradeable");
  await upgradeProxy(walletClient, publicClient, validationProxy, validationImpl,
    encodeFunctionData({ abi: valArtifact.abi, functionName: "initialize", args: [identityProxy as `0x${string}`] }));
  console.log("  ValidationRegistry upgraded");

  // ─── Phase 4: Custom contracts ───
  console.log("\nPhase 4: Deploying custom contracts...");
  const gpuProvider = await deployContract(walletClient, publicClient, "GPUProviderRegistry", [identityProxy, validationProxy]);
  const mockTEE = await deployContract(walletClient, publicClient, "MockTEEValidator", [validationProxy, account.address]);
  const prediction = await deployContract(walletClient, publicClient, "ResourcePrediction", [account.address]);

  // ─── Phase 5: Save ───
  const deployment = {
    network: "0g-galileo",
    chainId,
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      IdentityRegistry: identityProxy,
      ReputationRegistry: reputationProxy,
      ValidationRegistry: validationProxy,
      IdentityRegistryImpl: identityImpl,
      ReputationRegistryImpl: reputationImpl,
      ValidationRegistryImpl: validationImpl,
      MinimalUUPSImpl: minimalImpl,
      GPUProviderRegistry: gpuProvider,
      MockTEEValidator: mockTEE,
      ResourcePrediction: prediction,
    },
    externalContracts: {
      OGInferenceServing: "0xa79F4c8311FF93C06b8CfB403690cc987c93F91E",
      OGLedger: "0xE70830508dAc0A97e6c087c75f402f9Be669E406",
    },
  };

  const outDir = join(ROOT, "deployments");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "0g-galileo.json"), JSON.stringify(deployment, null, 2));
  console.log("\n  Saved to deployments/0g-galileo.json");

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  Object.entries(deployment.contracts).forEach(([n, a]) => console.log(`  ${n.padEnd(28)} ${a}`));
  console.log("=".repeat(60));
}

main().catch((e) => { console.error(e); process.exit(1); });
