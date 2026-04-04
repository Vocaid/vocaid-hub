import { config } from 'dotenv';
config();

import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

async function main() {
  const rpc = process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai';
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error('PRIVATE_KEY not set'); process.exit(1); }

  const provider = new ethers.JsonRpcProvider(rpc);
  const key = pk.startsWith('0x') ? pk : `0x${pk}`;
  const wallet = new ethers.Wallet(key, provider);
  console.log('Deployer:', wallet.address);
  console.log('Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'A0GI');

  // Read compiled artifacts
  const humanArtifact = JSON.parse(readFileSync(join(ROOT, 'artifacts/contracts/0g/HumanSkillRegistry.sol/HumanSkillRegistry.json'), 'utf-8'));
  const depinArtifact = JSON.parse(readFileSync(join(ROOT, 'artifacts/contracts/0g/DePINRegistry.sol/DePINRegistry.json'), 'utf-8'));

  // Deploy HumanSkillRegistry
  console.log('\nDeploying HumanSkillRegistry...');
  const humanFactory = new ethers.ContractFactory(humanArtifact.abi, humanArtifact.bytecode, wallet);
  const human = await humanFactory.deploy();
  await human.waitForDeployment();
  const humanAddr = await human.getAddress();
  console.log('  HumanSkillRegistry:', humanAddr);

  // Deploy DePINRegistry
  console.log('\nDeploying DePINRegistry...');
  const depinFactory = new ethers.ContractFactory(depinArtifact.abi, depinArtifact.bytecode, wallet);
  const depin = await depinFactory.deploy();
  await depin.waitForDeployment();
  const depinAddr = await depin.getAddress();
  console.log('  DePINRegistry:', depinAddr);

  // Update deployments JSON
  const deployPath = join(ROOT, 'deployments/0g-galileo.json');
  const deploy = JSON.parse(readFileSync(deployPath, 'utf-8'));
  deploy.contracts.HumanSkillRegistry = humanAddr;
  deploy.contracts.DePINRegistry = depinAddr;
  writeFileSync(deployPath, JSON.stringify(deploy, null, 2));
  console.log('\nUpdated deployments/0g-galileo.json');

  console.log('\n=== ADD TO .env.local ===');
  console.log(`HUMAN_SKILL_REGISTRY=${humanAddr}`);
  console.log(`DEPIN_REGISTRY=${depinAddr}`);
}

main().catch(e => { console.error(e); process.exit(1); });
