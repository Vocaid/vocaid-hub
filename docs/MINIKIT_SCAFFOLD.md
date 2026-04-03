# MiniKit Mini App Scaffold — Day 1 Reference

**When to run:** Hour 1 at the hackathon venue (after creating fresh GitHub repo)
**Time:** ~10 minutes
**Agent:** Wave 1, Agent 4 (Scaffold + OpenClaw)
**Compliance:** Uses World's official public starter kit (`@worldcoin/create-mini-app`) — explicitly allowed per ETHGlobal rules: *"Open-source libraries and boilerplates can be used to jumpstart development"*

---

## Step 1: Create Fresh GitHub Repo (Hour 0)

```bash
# At the venue, AFTER hackathon officially starts
gh repo create vocaid-hub --public --clone
cd vocaid-hub
```

## Step 2: Scaffold Mini App with Official Starter Kit

```bash
# World's official CLI — creates Next.js 15 + MiniKit 2.0 + TypeScript + Tailwind
npx @worldcoin/create-mini-app .

# OR if you prefer the template repo approach:
# npx create-next-app . --example https://github.com/worldcoin/minikit-next-template
```

This creates:
```
vocaid-hub/
├── app/
│   ├── layout.tsx          # Root layout with MiniKit provider
│   ├── page.tsx            # Landing page
│   └── api/                # API routes
├── components/
│   └── Verify/             # World ID verify component (pre-built)
├── public/                 # Static assets
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── package.json
└── .env.example
```

## Step 3: Install Additional Dependencies

```bash
# Blockchain SDKs
npm install ethers@^6.13.0 viem@^2.0.0 @openzeppelin/contracts@^5.0.0

# 0G SDK
npm install @0glabs/0g-serving-broker@^0.6.5 @0glabs/0g-ts-sdk@^0.3.3

# Circle Nanopayments (Arc)
npm install @circle-fin/x402-batching @x402/fetch @x402/evm @x402/core

# Hardhat (Solidity development)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Utility
npm install dotenv
```

## Step 4: Add Hardhat Multi-Chain Config

Create `hardhat.config.ts` at project root:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    "0g-galileo": {
      url: "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    "arc-testnet": {
      url: "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    "world-sepolia": {
      url: process.env.WORLD_RPC || "",
      chainId: 4801,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
export default config;
```

## Step 5: Create Contract Directories

```bash
mkdir -p contracts/0g contracts/world contracts/arc
mkdir -p deployments scripts
```

## Step 6: Configure Environment

```bash
cp .env.example .env
# Fill in:
# WORLD_APP_ID=app_74d7b06d88b9e220ad1cc06e387c55f3
# NEXT_PUBLIC_WORLD_APP_ID=app_74d7b06d88b9e220ad1cc06e387c55f3
# WORLD_RP_ID=rp_21826eb5449cc811
# WORLD_ID_PRIVATE_KEY=0x96cad2...  (from World Developer Portal)
# PRIVATE_KEY=0x...
# (see CURSOR_SETUP.md Part 4 for full list)
```

## Step 7: Update MiniKit Configuration

Edit `app/layout.tsx` to ensure MiniKit is configured with the correct APP_ID:

```typescript
// The template already includes MiniKit.install()
// Verify it uses process.env.NEXT_PUBLIC_WORLD_APP_ID
```

## Step 8: Initial Commits

```bash
git add .
git commit -m "init: scaffold Mini App with World MiniKit starter kit"

# Add Hardhat config
git add hardhat.config.ts contracts/ deployments/ scripts/
git commit -m "init: add multi-chain Hardhat config (0G + Arc + World)"

# Add .env.example
git add .env.example
git commit -m "init: add .env.example with World + 0G + Arc variables"
```

## Step 9: Verify

```bash
# Mini App starts
npm run dev
# Open http://localhost:3000 — should see MiniKit template page

# Hardhat compiles (even with no contracts yet)
npx hardhat compile
# Expected: "Nothing to compile"
```

---

## What the Template Provides (DO NOT rebuild these)

The official starter kit already includes:
- Next.js 15 app router setup
- MiniKit provider configuration
- World ID verify component
- Tailwind CSS styling
- TypeScript configuration
- API route structure

**Do NOT recreate these from scratch** — the template handles them. Focus hackathon time on the custom features (ERC-8004, GPU verification, prediction markets, agents).

---

## What We Add ON TOP of the Template

| Component | Where | Agent |
|-----------|-------|-------|
| Multi-chain Hardhat config | `hardhat.config.ts` | Agent 4 (Wave 1) |
| ERC-8004 contract interfaces | `contracts/0g/` | Agent 1 (Wave 1) |
| GPUProviderRegistry.sol | `contracts/0g/` | Agent 5 (Wave 2) |
| CredentialGate.sol | `contracts/world/` | Agent 2 (Wave 1) |
| ResourcePrediction.sol | `contracts/arc/` | Agent 3 (Wave 1) |
| GPU provider portal page | `app/gpu-verify/` | Agent 5 (Wave 2) |
| Resource marketplace page | `app/marketplace/` | Agent 7 (Wave 2) |
| Prediction market page | `app/predictions/` | Agent 10 (Wave 3) |
| OpenClaw agent configs | `agents/` | Agent 4 (Wave 1) |
| Circle Nanopayments lib | `lib/nanopayments.ts` | Agent 9 (Wave 3) |
| AgentKit registration | `app/api/agents/` | Agent 6 (Wave 2) |
