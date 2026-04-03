import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

dotenv.config();

const WORLD_CHAIN_SEPOLIA = {
  chainId: 4801,
  rpc: process.env.WORLD_RPC_URL || "https://worldchain-sepolia.g.alchemy.com/public",
};

// World ID Router on World Chain Sepolia
const WORLD_ID_ROUTER = process.env.WORLD_ID_ROUTER || "0x469449f251692E0779667583026b5A1E99512157";
const APP_ID = process.env.NEXT_PUBLIC_APP_ID || "app_74d7b06d88b9e220ad1cc06e387c55f3";
const ACTION_ID = "verify-human";

async function main() {
  if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY not set");

  const provider = new ethers.JsonRpcProvider(WORLD_CHAIN_SEPOLIA.rpc);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log(`Deploying from: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Read compiled artifact
  const artifactPath = resolve(__dirname, "../artifacts/contracts/world/CredentialGate.sol/CredentialGate.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log("Deploying CredentialGate...");

  const contract = await factory.deploy(WORLD_ID_ROUTER, APP_ID, ACTION_ID);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`CredentialGate deployed at: ${address}`);

  // Save deployment info
  const deployment = {
    network: "world-sepolia",
    chainId: WORLD_CHAIN_SEPOLIA.chainId,
    CredentialGate: address,
    worldIdRouter: WORLD_ID_ROUTER,
    appId: APP_ID,
    actionId: ACTION_ID,
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
  };

  const deployPath = resolve(__dirname, "../deployments/world-sepolia.json");
  writeFileSync(deployPath, JSON.stringify(deployment, null, 2));
  console.log(`Deployment saved to ${deployPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
