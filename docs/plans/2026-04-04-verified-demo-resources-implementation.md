# Verified Demo Resources — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy HumanSkillRegistry + DePINRegistry on 0G Galileo, seed 3 humans + 3 DePIN as verified ERC-8004 identities, and wire them into the marketplace.

**Architecture:** Two new Solidity contracts following the GPUProviderRegistry pattern (struct + mapping + registerProvider + getActiveProviders + getProvider). Deployed via Hardhat to 0G Galileo (chain 16602). Seeded from primary wallet. /api/resources reads from all 4 registries.

**Tech Stack:** Solidity 0.8.20, Hardhat 3, ethers v6, viem, 0G Galileo testnet

---

### Task 1: Create HumanSkillRegistry.sol

**Files:**
- Create: `contracts/0g/HumanSkillRegistry.sol`

**Step 1: Write the contract**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HumanSkillRegistry {
    struct HumanProvider {
        uint256 agentId;
        string skillName;
        string skillLevel;
        string hourlyRate;
        uint256 registeredAt;
        bool active;
    }

    mapping(address => HumanProvider) public providers;
    address[] private _activeProviders;

    error AlreadyRegistered();

    event ProviderRegistered(address indexed provider, uint256 agentId, string skillName);

    function registerProvider(
        uint256 agentId,
        string calldata skillName,
        string calldata skillLevel,
        string calldata hourlyRate
    ) external {
        if (providers[msg.sender].registeredAt != 0) revert AlreadyRegistered();
        providers[msg.sender] = HumanProvider(agentId, skillName, skillLevel, hourlyRate, block.timestamp, true);
        _activeProviders.push(msg.sender);
        emit ProviderRegistered(msg.sender, agentId, skillName);
    }

    function getActiveProviders() external view returns (address[] memory) {
        return _activeProviders;
    }

    function getProvider(address addr) external view returns (HumanProvider memory) {
        return providers[addr];
    }

    function totalProviders() external view returns (uint256) {
        return _activeProviders.length;
    }
}
```

**Step 2: Compile**

Run: `npx hardhat compile`
Expected: Compiled 1 Solidity file successfully

**Step 3: Commit**

```bash
git add contracts/0g/HumanSkillRegistry.sol
git commit -m "feat(contracts): add HumanSkillRegistry for verified human resources"
```

---

### Task 2: Create DePINRegistry.sol

**Files:**
- Create: `contracts/0g/DePINRegistry.sol`

**Step 1: Write the contract**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DePINRegistry {
    struct DePINDevice {
        uint256 agentId;
        string deviceName;
        string deviceType;
        string capacity;
        string pricePerUnit;
        uint256 registeredAt;
        bool active;
    }

    mapping(address => DePINDevice) public devices;
    address[] private _activeDevices;

    error AlreadyRegistered();

    event DeviceRegistered(address indexed device, uint256 agentId, string deviceName);

    function registerDevice(
        uint256 agentId,
        string calldata deviceName,
        string calldata deviceType,
        string calldata capacity,
        string calldata pricePerUnit
    ) external {
        if (devices[msg.sender].registeredAt != 0) revert AlreadyRegistered();
        devices[msg.sender] = DePINDevice(agentId, deviceName, deviceType, capacity, pricePerUnit, block.timestamp, true);
        _activeDevices.push(msg.sender);
        emit DeviceRegistered(msg.sender, agentId, deviceName);
    }

    function getActiveDevices() external view returns (address[] memory) {
        return _activeDevices;
    }

    function getDevice(address addr) external view returns (DePINDevice memory) {
        return devices[addr];
    }

    function totalDevices() external view returns (uint256) {
        return _activeDevices.length;
    }
}
```

**Step 2: Compile**

Run: `npx hardhat compile`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add contracts/0g/DePINRegistry.sol
git commit -m "feat(contracts): add DePINRegistry for verified DePIN resources"
```

---

### Task 3: Deploy Both Contracts

**Files:**
- Create: `scripts/deploy-registries.ts`

**Step 1: Write deploy script**

```typescript
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
  const wallet = new ethers.Wallet(pk.startsWith('0x') ? pk : `0x${pk}`, provider);
  console.log('Deployer:', wallet.address);

  // Read compiled artifacts
  const humanArtifact = JSON.parse(readFileSync(join(ROOT, 'artifacts/contracts/0g/HumanSkillRegistry.sol/HumanSkillRegistry.json'), 'utf-8'));
  const depinArtifact = JSON.parse(readFileSync(join(ROOT, 'artifacts/contracts/0g/DePINRegistry.sol/DePINRegistry.json'), 'utf-8'));

  // Deploy HumanSkillRegistry
  console.log('Deploying HumanSkillRegistry...');
  const humanFactory = new ethers.ContractFactory(humanArtifact.abi, humanArtifact.bytecode, wallet);
  const human = await humanFactory.deploy();
  await human.waitForDeployment();
  const humanAddr = await human.getAddress();
  console.log('  HumanSkillRegistry:', humanAddr);

  // Deploy DePINRegistry
  console.log('Deploying DePINRegistry...');
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
  console.log('Updated deployments/0g-galileo.json');
}

main().catch(e => { console.error(e); process.exit(1); });
```

**Step 2: Compile + Deploy**

```bash
npx hardhat compile
npx tsx scripts/deploy-registries.ts
```

Expected: Both contracts deployed, addresses in deployments JSON.

**Step 3: Update .env.local + .env.example**

Add to both:
```
HUMAN_SKILL_REGISTRY=<deployed-address>
DEPIN_REGISTRY=<deployed-address>
```

**Step 4: Commit**

```bash
git add scripts/deploy-registries.ts deployments/0g-galileo.json .env.example
git commit -m "feat(deploy): deploy HumanSkillRegistry + DePINRegistry to 0G Galileo"
```

---

### Task 4: Add Contract Addresses + ABIs to contracts.ts

**Files:**
- Modify: `src/lib/contracts.ts`

**Step 1: Add addresses to the addresses object**

After `resourcePrediction`:
```typescript
humanSkillRegistry: () => getAddress("HUMAN_SKILL_REGISTRY"),
depinRegistry: () => getAddress("DEPIN_REGISTRY"),
```

**Step 2: Commit**

```bash
git add src/lib/contracts.ts
git commit -m "feat(contracts): add HumanSkillRegistry + DePINRegistry addresses"
```

---

### Task 5: Add Read Functions to og-chain.ts

**Files:**
- Modify: `src/lib/og-chain.ts`

**Step 1: Add Human ABI + read function**

After the GPU section, add:

```typescript
// --- Human Skill Registry reads ---

const HUMAN_SKILL_REGISTRY_ABI = [
  {
    name: "getActiveProviders",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "active", type: "address[]" }],
  },
  {
    name: "getProvider",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [{
      components: [
        { name: "agentId", type: "uint256" },
        { name: "skillName", type: "string" },
        { name: "skillLevel", type: "string" },
        { name: "hourlyRate", type: "string" },
        { name: "registeredAt", type: "uint256" },
        { name: "active", type: "bool" },
      ],
      type: "tuple",
    }],
  },
] as const;

export interface OnChainHumanProvider {
  address: string;
  agentId: string;
  skillName: string;
  skillLevel: string;
  hourlyRate: string;
  registeredAt: number;
  active: boolean;
}

export async function getRegisteredHumans(): Promise<OnChainHumanProvider[]> {
  const client = getPublicClient();
  const addr = addresses.humanSkillRegistry();
  const activeAddrs = (await client.readContract({
    address: addr, abi: HUMAN_SKILL_REGISTRY_ABI, functionName: "getActiveProviders",
  })) as readonly Address[];

  return Promise.all(activeAddrs.map(async (a) => {
    const d = (await client.readContract({
      address: addr, abi: HUMAN_SKILL_REGISTRY_ABI, functionName: "getProvider", args: [a],
    })) as { agentId: bigint; skillName: string; skillLevel: string; hourlyRate: string; registeredAt: bigint; active: boolean };
    return { address: a, agentId: d.agentId.toString(), skillName: d.skillName, skillLevel: d.skillLevel, hourlyRate: d.hourlyRate, registeredAt: Number(d.registeredAt), active: d.active };
  }));
}
```

**Step 2: Add DePIN ABI + read function**

```typescript
// --- DePIN Registry reads ---

const DEPIN_REGISTRY_ABI = [
  {
    name: "getActiveDevices",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "active", type: "address[]" }],
  },
  {
    name: "getDevice",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "device", type: "address" }],
    outputs: [{
      components: [
        { name: "agentId", type: "uint256" },
        { name: "deviceName", type: "string" },
        { name: "deviceType", type: "string" },
        { name: "capacity", type: "string" },
        { name: "pricePerUnit", type: "string" },
        { name: "registeredAt", type: "uint256" },
        { name: "active", type: "bool" },
      ],
      type: "tuple",
    }],
  },
] as const;

export interface OnChainDePINDevice {
  address: string;
  agentId: string;
  deviceName: string;
  deviceType: string;
  capacity: string;
  pricePerUnit: string;
  registeredAt: number;
  active: boolean;
}

export async function getRegisteredDePIN(): Promise<OnChainDePINDevice[]> {
  const client = getPublicClient();
  const addr = addresses.depinRegistry();
  const activeAddrs = (await client.readContract({
    address: addr, abi: DEPIN_REGISTRY_ABI, functionName: "getActiveDevices",
  })) as readonly Address[];

  return Promise.all(activeAddrs.map(async (a) => {
    const d = (await client.readContract({
      address: addr, abi: DEPIN_REGISTRY_ABI, functionName: "getDevice", args: [a],
    })) as { agentId: bigint; deviceName: string; deviceType: string; capacity: string; pricePerUnit: string; registeredAt: bigint; active: boolean };
    return { address: a, agentId: d.agentId.toString(), deviceName: d.deviceName, deviceType: d.deviceType, capacity: d.capacity, pricePerUnit: d.pricePerUnit, registeredAt: Number(d.registeredAt), active: d.active };
  }));
}
```

**Step 3: Commit**

```bash
git add src/lib/og-chain.ts
git commit -m "feat(chain): add read functions for HumanSkillRegistry + DePINRegistry"
```

---

### Task 6: Wire Human + DePIN into /api/resources

**Files:**
- Modify: `src/app/api/resources/route.ts`

**Step 1: Import new functions**

Add to imports:
```typescript
import { type OnChainHumanProvider, getRegisteredHumans, type OnChainDePINDevice, getRegisteredDePIN } from "@/lib/og-chain";
```

**Step 2: Add FilterType "depin"**

```typescript
type FilterType = "gpu" | "agent" | "human" | "depin";
const VALID_TYPES = new Set<FilterType>(["gpu", "agent", "human", "depin"]);
```

**Step 3: Add mapper functions**

After `mapGpuToResources`, add:

```typescript
function mapHumanToResources(humans: OnChainHumanProvider[]): ResourceWithAgent[] {
  return humans.map((h) => ({
    type: "human" as const,
    name: h.skillName,
    subtitle: `${h.skillLevel} · Agent #${h.agentId}`,
    reputation: 80,
    verified: true,
    chain: "world" as const,
    price: h.hourlyRate,
    verificationType: "world-id" as const,
    _agentId: h.agentId,
  }));
}

function mapDePINToResources(devices: OnChainDePINDevice[]): ResourceWithAgent[] {
  return devices.map((d) => ({
    type: "depin" as const,
    name: d.deviceName,
    subtitle: `${d.capacity} · ${d.deviceType}`,
    reputation: 75,
    verified: true,
    chain: "hedera" as const,
    price: d.pricePerUnit,
    verificationType: "tee" as const,
    _agentId: d.agentId,
  }));
}
```

**Step 4: Add to data fetching**

In the GET handler, add alongside existing fetches:

```typescript
const [humanResult, depinResult] = await Promise.allSettled([
  getRegisteredHumans(),
  getRegisteredDePIN(),
]);
const humans = humanResult.status === "fulfilled" ? humanResult.value : [];
const depinDevices = depinResult.status === "fulfilled" ? depinResult.value : [];
```

Then add to rawResources:
```typescript
const rawResources: ResourceWithAgent[] = [
  ...(await mapAgentsToResources(agents)),
  ...gpuResources,
  ...mapHumanToResources(humans),
  ...mapDePINToResources(depinDevices),
];
```

**Step 5: Commit**

```bash
git add src/app/api/resources/route.ts
git commit -m "feat(resources): wire HumanSkillRegistry + DePINRegistry into marketplace"
```

---

### Task 7: Seed Demo Data (3 Humans + 3 DePIN)

**Files:**
- Modify: `scripts/seed-demo-data.ts`

**Step 1: Add Phase 7 — Human Providers**

After existing phases, add:

```typescript
// ── Phase 7: Register 3 human skill providers ─────────
console.log("\nPhase 7: Registering human skill providers...");
const humanABI = [
  { name: "registerProvider", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" }, { name: "skillName", type: "string" },
      { name: "skillLevel", type: "string" }, { name: "hourlyRate", type: "string" },
    ], outputs: [] },
] as const;

const HUMANS = [
  { label: "Maria Santos", skill: "Rust Developer", level: "L4", rate: "$25/hr", uri: `${BASE}/maria.json` },
  { label: "Carlos Rivera", skill: "ML Engineer", level: "L3", rate: "$35/hr", uri: `${BASE}/carlos.json` },
  { label: "Aisha Okonkwo", skill: "Smart Contract Auditor", level: "L5", rate: "$50/hr", uri: `${BASE}/aisha.json` },
];

const humanRegistry = C.HumanSkillRegistry;
if (humanRegistry) {
  for (const human of HUMANS) {
    try {
      // Register ERC-8004 identity first
      const h1 = await walletClient.writeContract({
        address: C.IdentityRegistry, abi: identityABI, functionName: "register",
        args: [human.uri], chain: ogGalileo,
      });
      const r1 = await publicClient.waitForTransactionReceipt({ hash: h1, ...WAIT_OPTS });
      const registeredTopic = keccak256(toHex("Registered(uint256,string,address)"));
      const log = r1.logs.find((l: any) => l.address.toLowerCase() === C.IdentityRegistry.toLowerCase() && l.topics[0] === registeredTopic);
      const agentId = BigInt(log!.topics[1] as string);

      // Register in HumanSkillRegistry
      const h2 = await walletClient.writeContract({
        address: humanRegistry, abi: humanABI, functionName: "registerProvider",
        args: [agentId, human.skill, human.level, human.rate], chain: ogGalileo,
      });
      await publicClient.waitForTransactionReceipt({ hash: h2, ...WAIT_OPTS });
      console.log(`  ${human.label}: agentId ${agentId} (${human.skill} ${human.level})`);
    } catch (e: any) {
      console.log(`  ${human.label}: skipped (${e.message?.slice(0, 50)})`);
    }
  }
}
```

**Step 2: Add Phase 8 — DePIN Devices**

```typescript
// ── Phase 8: Register 3 DePIN devices ─────────────────
console.log("\nPhase 8: Registering DePIN devices...");
const depinABI = [
  { name: "registerDevice", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" }, { name: "deviceName", type: "string" },
      { name: "deviceType", type: "string" }, { name: "capacity", type: "string" },
      { name: "pricePerUnit", type: "string" },
    ], outputs: [] },
] as const;

const DEVICES = [
  { label: "Tesla Powerwall", name: "Tesla Powerwall", type: "battery", cap: "13.5 kWh", price: "$0.12/kWh", uri: `${BASE}/tesla-powerwall.json` },
  { label: "Solar Array 5kW", name: "Solar Array (5kW)", type: "solar", cap: "5kW Grid-tied", price: "$0.08/kWh", uri: `${BASE}/solar-array.json` },
  { label: "EV Charger L2", name: "EV Charger (Level 2)", type: "ev-charger", cap: "240V 32A J1772", price: "$0.15/kWh", uri: `${BASE}/ev-charger.json` },
];

const depinRegistry = C.DePINRegistry;
if (depinRegistry) {
  for (const device of DEVICES) {
    try {
      // Register ERC-8004 identity
      const h1 = await walletClient.writeContract({
        address: C.IdentityRegistry, abi: identityABI, functionName: "register",
        args: [device.uri], chain: ogGalileo,
      });
      const r1 = await publicClient.waitForTransactionReceipt({ hash: h1, ...WAIT_OPTS });
      const registeredTopic = keccak256(toHex("Registered(uint256,string,address)"));
      const log = r1.logs.find((l: any) => l.address.toLowerCase() === C.IdentityRegistry.toLowerCase() && l.topics[0] === registeredTopic);
      const agentId = BigInt(log!.topics[1] as string);

      // Register in DePINRegistry
      const h2 = await walletClient.writeContract({
        address: depinRegistry, abi: depinABI, functionName: "registerDevice",
        args: [agentId, device.name, device.type, device.cap, device.price], chain: ogGalileo,
      });
      await publicClient.waitForTransactionReceipt({ hash: h2, ...WAIT_OPTS });
      console.log(`  ${device.label}: agentId ${agentId} (${device.type})`);
    } catch (e: any) {
      console.log(`  ${device.label}: skipped (${e.message?.slice(0, 50)})`);
    }
  }
}
```

**Step 3: Run seed script**

```bash
npx tsx scripts/seed-demo-data.ts
```

**Step 4: Commit**

```bash
git add scripts/seed-demo-data.ts
git commit -m "feat(seed): add Phase 7 (humans) + Phase 8 (DePIN) to demo seeder"
```

---

### Task 8: Build + Verify + Deploy

**Step 1: Build**

```bash
rm -rf .next node_modules/.cache && npx next build
```

**Step 2: Test API**

```bash
curl -s http://localhost:3000/api/resources | node -e "
  let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const r=JSON.parse(d);
    const types={};
    r.forEach(x=>{types[x.type]=(types[x.type]||0)+1});
    console.log('Total:', r.length);
    console.log('By type:', types);
    console.log('Verified:', r.filter(x=>x.verified).length);
  })
"
```

Expected: `Total: 12+`, `By type: { gpu: 2+, agent: 4, human: 3, depin: 3 }`, `Verified: 12`

**Step 3: Push**

```bash
git push origin main
```

---

## Verification

1. [ ] Both contracts compile (`npx hardhat compile`)
2. [ ] Both deployed to 0G Galileo (addresses in deployments JSON)
3. [ ] Seed script registers 3 humans + 3 DePIN with ERC-8004 identities
4. [ ] `/api/resources` returns 12+ resources across all 4 types
5. [ ] All resources show `verified: true`
6. [ ] Filter tabs (All/GPU/Agent/Human/DePIN) show correct resources
7. [ ] `npx next build` passes
8. [ ] Vercel deployment succeeds
