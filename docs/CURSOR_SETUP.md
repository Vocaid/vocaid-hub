# Cursor IDE Setup — Reliable Resources for the Agentic Economy Coding Machine

**Purpose:** Step-by-step guide for configuring a fresh machine with Cursor IDE to execute the fin.vocaid.ai hackathon build.
**Target:** macOS (Apple Silicon preferred) or Linux
**Cursor Agent Mode:** The agent should be able to read this file and self-configure.

---

## Part 1: System Dependencies

### 1.1 Install Core Tools

Run these commands in order. Each must succeed before proceeding.

```bash
# 1. Node.js 20+ (LTS recommended over 24.x for SDK compatibility)
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.zshrc  # or restart terminal
fnm install 20
fnm use 20
node --version  # Expected: v20.x.x
npm --version   # Expected: 10.x.x

# 2. Foundry (Solidity toolchain — forge, cast, anvil, chisel)
curl -L https://foundry.paradigm.xyz | bash
source ~/.zshrc
foundryup
forge --version  # Expected: forge 1.5.x

# 3. OpenClaw (agent framework)
npm install -g openclaw
openclaw --version  # Expected: OpenClaw 2026.4.x

# 4. Git (should already be installed)
git --version  # Expected: 2.x.x

# 5. pnpm (faster than npm for monorepo)
npm install -g pnpm
pnpm --version  # Expected: 9.x.x or 10.x.x
```

### 1.2 Install Project-Specific Dependencies

These will be installed inside the project during Wave 1, but pre-install globally to cache:

```bash
# Hardhat (Solidity development)
npm install -g hardhat

# TypeScript
npm install -g typescript ts-node
```

### 1.3 Verify All Tools

```bash
echo "=== Tool Verification ===" && \
node --version && \
npm --version && \
forge --version && \
openclaw --version && \
git --version && \
pnpm --version && \
echo "=== All tools OK ==="
```

---

## Part 2: Project Dependencies (package.json)

When the hackathon starts and the fresh repo is created, install these dependencies:

### 2.1 Core Dependencies

```json
{
  "dependencies": {
    "@worldcoin/minikit-js": "latest",
    "@0glabs/0g-serving-broker": "^0.6.5",
    "@0glabs/0g-ts-sdk": "^0.3.3",
    "@hashgraph/sdk": "latest",
    "@openzeppelin/contracts": "^5.0.0",
    "@openzeppelin/contracts-upgradeable": "^5.0.0",
    "ethers": "^6.13.0",
    "viem": "^2.0.0",
    "dotenv": "^16.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "hardhat": "^2.22.0",
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "typescript": "^5.5.0",
    "ts-node": "^10.9.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.0.0",
    "autoprefixer": "^10.0.0"
  }
}
```

### 2.2 Install Command (at hackathon)

```bash
npm install
```

---

## Part 3: Cursor Configuration

### 3.1 Cursor Rules (`.cursor/rules/`)

Create the rules directory and add project-specific rules:

```bash
mkdir -p .cursor/rules
```

#### File: `.cursor/rules/project.mdc`

```markdown
---
description: Project conventions for fin.vocaid.ai Reliable Resources for the Agentic Economy Protocol
globs: ["**/*.ts", "**/*.tsx", "**/*.sol"]
---

# Project: fin.vocaid.ai — Reliable Resources for the Agentic Economy Protocol

## Architecture
- Three chains: World Chain (Trust), 0G Chain (Verify), Hedera (Settle)
- World ID + AgentKit for identity
- ERC-8004 registries on 0G Chain for agent/provider identity + reputation + validation
- Hedera x402 via Blocky402 for USDC agent payments ($0.0001 gas)
- OpenClaw 4-agent fleet: Seer, Edge, Shield, Lens

## Tech Stack
- Frontend: Next.js 15 + MiniKit 2.0 (Mini App inside World App)
- Contracts: Solidity 0.8.24, Hardhat + Foundry, evmVersion "cancun" for 0G
- Agent Framework: OpenClaw with 0g-agent-skills
- Payments: @hashgraph/sdk for Hedera, x402 via Blocky402
- Identity: @worldcoin/minikit-js, ERC-8004

## Chain Configuration
- 0G Galileo: chainId 16602, RPC https://evmrpc-testnet.0g.ai, evmVersion cancun
- Hedera Testnet: network hedera-testnet, USDC token 0.0.429274
- World Chain Sepolia: chainId 4801

## Coding Standards
- TypeScript strict mode
- No any types
- Use ethers v6 (not v5)
- Use @hashgraph/sdk for Hedera interactions
- Solidity: 0.8.24, optimizer enabled, 200 runs, evmVersion cancun
- Conventional commits: feat(scope):, fix(scope):, docs:
- Small focused commits — never batch unrelated changes

## File Organization
- contracts/0g/ — ERC-8004 registries, GPUProviderRegistry, MockTEEValidator
- contracts/world/ — CredentialGate.sol
- contracts/hedera/ — ResourcePrediction.sol, x402PaymentRouter.sol
- app/ — Next.js MiniKit Mini App
- agents/ — OpenClaw agent configs + custom skills
- scripts/ — Deployment scripts
- deployments/ — Contract addresses per chain

## Security Rules
- Never commit .env files
- Never hardcode private keys
- Use allowlist mode for OpenClaw exec tool
- All RPC calls must use HTTPS
- Only testnet tokens — zero real funds
```

#### File: `.cursor/rules/solidity.mdc`

```markdown
---
description: Solidity conventions for multi-chain deployment
globs: ["**/*.sol"]
---

# Solidity Rules

## Compiler
- Version: 0.8.24
- Optimizer: enabled, 200 runs
- evmVersion: cancun (required for 0G Chain)

## Standards
- Use OpenZeppelin 5.x contracts
- ReentrancyGuard on all external state-changing functions
- Events for all state changes
- NatSpec documentation on public functions

## Multi-Chain Awareness
- 0G Chain (chainId 16602): ERC-8004 registries + GPUProviderRegistry
- Hedera Testnet: USDC token 0.0.429274, prediction markets
- World Chain Sepolia (chainId 4801): CredentialGate with World ID

## ERC-8004 Interfaces
- IIdentityRegistry: register(), setMetadata(), getMetadata()
- IReputationRegistry: giveFeedback(), getSummary()
- IValidationRegistry: validationRequest(), validationResponse(), getValidationStatus()
```

#### File: `.cursor/rules/agents.mdc`

```markdown
---
description: OpenClaw agent conventions
globs: ["agents/**/*"]
---

# OpenClaw Agent Rules

## Fleet
- 4 agents: Seer (signals), Edge (pricing), Shield (risk), Lens (monitoring)
- All run in one Gateway process via `openclaw gateway`
- Inter-agent communication via agentToAgent tool (local mode)

## Skills
- Use 0g-agent-skills (14 skills from 0G Foundation — audited)
- Write custom skills for: Nanopayments, Reputation, Prediction Market, 0G Storage
- NEVER install skills from ClawHub — write from scratch or audit line-by-line
- Each skill is a SKILL.md file in the agent's skills/ directory

## Security
- Exec mode: allowlist (only node, npx, curl)
- Gateway bind: 127.0.0.1 only, never 0.0.0.0
- autoApproveLocalhost: false
- No private keys in agent-accessible .env — use separate signing service or per-agent env
```

### 3.2 MCP Servers (`.cursor/mcp.json`)

Create the MCP configuration for Cursor agent mode:

#### File: `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "description": "Read and write project files"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      },
      "description": "GitHub repo operations, PRs, issues"
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      },
      "description": "Web search for documentation and troubleshooting"
    }
  }
}
```

**Note:** Keep MCP servers minimal. Cursor has a ~40 tool ceiling. These 3 servers cover: file ops, GitHub integration, and web search. Add more only if needed.

### 3.3 Codebase Indexing

Cursor automatically indexes your codebase when you open a project. To ensure proper indexing:

```bash
# 1. Open the project in Cursor
cursor .

# 2. Wait for indexing to complete (check status bar)
# Cursor will show "Indexing..." then "Ready"

# 3. Verify indexing works
# In Cursor chat, type: @codebase what files exist in contracts/
# Should return file list from the project
```

**Indexing settings** (Cursor Settings > Features > Codebase Indexing):
- Enable "Index on open"
- Enable "Reindex on file changes"
- Set ignore patterns: `node_modules/`, `.next/`, `dist/`, `.turbo/`

### 3.4 Docs Indexing (Add Project Documentation as Context)

Add the vocaid-hub docs as indexed documentation in Cursor:

```bash
# Cursor Settings > Features > Docs
# Add these documentation sources:

# 1. Project docs (local)
# Path: docs/  (Cursor indexes these automatically if in the project root)

# 2. External docs (add via @docs in chat)
# @docs https://docs.world.org                    # World ID / MiniKit
# @docs https://docs.0g.ai                        # 0G Compute / Storage / Chain
# @docs https://docs.hedera.com                    # Hedera network
# @docs https://docs.blocky402.com                 # Blocky402 x402 facilitator
# @docs https://eips.ethereum.org/EIPS/eip-8004   # ERC-8004 spec
# @docs https://docs.openclaw.ai                  # OpenClaw
# @docs https://hardhat.org/docs                  # Hardhat
```

To use in chat: type `@docs` then select the source, or `@codebase` for project files.

---

## Part 4: Environment Variables

### 4.1 Create `.env` File

```bash
cat > .env << 'EOF'
# World (Trust Layer)
WORLD_APP_ID=app_74d7b06d88b9e220ad1cc06e387c55f3
NEXT_PUBLIC_WORLD_APP_ID=app_74d7b06d88b9e220ad1cc06e387c55f3
WORLD_RP_ID=rp_21826eb5449cc811
WORLD_ID_PRIVATE_KEY=0x96cad234984f2a08e9770b47999c2e7b9dcc8c6fae1c26e8c2055386abe65ce6

# 0G (Verify Layer)
PRIVATE_KEY=0x...  # Wallet private key for 0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE
NEXT_PUBLIC_0G_RPC=https://evmrpc-testnet.0g.ai
OG_CHAIN_ID=16602

# Hedera (Settle Layer)
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.8368570
HEDERA_USDC_TOKEN=0.0.429274
HEDERA_FEE_PAYER=0.0.7162784

# World Chain
NEXT_PUBLIC_WORLD_RPC=https://worldchain-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
WORLD_CHAIN_ID=4801

# Optional
BONSAI_API_KEY=                    # RiscZero (if approved)
BONSAI_API_URL=https://api.bonsai.xyz
ANTHROPIC_API_KEY=                 # Fallback if 0G compute is down
FIN_COST_LIMIT=5                   # Max $ for Anthropic fallback

# Contract Addresses (filled after Wave 1 deployment)
IDENTITY_REGISTRY=
REPUTATION_REGISTRY=
VALIDATION_REGISTRY=
GPU_PROVIDER_REGISTRY=
CREDENTIAL_GATE=
RESOURCE_PREDICTION=
MOCK_TEE_VALIDATOR=
EOF
```

### 4.2 Create `.env.example` (committed to git)

Same as above but with placeholder values instead of real keys.

---

## Part 5: Hardhat Multi-Chain Configuration

### 5.1 `hardhat.config.ts`

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
      url: process.env.NEXT_PUBLIC_0G_RPC || "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Hedera Testnet: configured via @hashgraph/sdk, not Hardhat network
    "world-sepolia": {
      url: process.env.NEXT_PUBLIC_WORLD_RPC || "",
      chainId: 4801,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
export default config;
```

---

## Part 6: OpenClaw Agent Setup

### 6.1 Install 0G Agent Skills

```bash
git clone https://github.com/0gfoundation/0g-agent-skills.git agents/.0g-skills
cd agents
npm install @0glabs/0g-ts-sdk@^0.3.3 @0glabs/0g-serving-broker@^0.6.5 ethers@^6.13.0 dotenv
```

### 6.2 Create 4 Agents

```bash
cd agents
openclaw agents add seer
openclaw agents add edge
openclaw agents add shield
openclaw agents add lens
```

### 6.3 Copy 0G Skills to All Agents

```bash
for agent in seer edge shield lens; do
  cp -r .0g-skills/skills/* .agents/$agent/skills/
done
```

### 6.4 Install ERC-8004 Skill

```bash
openclaw skills install erc-8004
```

### 6.5 Configure Gateway

Create `agents/openclaw.json`:

```json
{
  "gateway": {
    "bindAddress": "127.0.0.1",
    "port": 18789,
    "autoApproveLocalhost": false
  },
  "exec": {
    "mode": "allowlist",
    "allowedCommands": ["node", "npx", "curl"]
  },
  "agents": {
    "list": [
      {"id": "seer", "name": "Seer", "groupChat": {"mentionPatterns": ["@seer"]}},
      {"id": "edge", "name": "Edge", "groupChat": {"mentionPatterns": ["@edge"]}},
      {"id": "shield", "name": "Shield", "groupChat": {"mentionPatterns": ["@shield"]}},
      {"id": "lens", "name": "Lens", "groupChat": {"mentionPatterns": ["@lens"]}}
    ]
  }
}
```

### 6.6 Start Gateway

```bash
openclaw gateway
```

---

## Part 7: Clone Reference Repos (Pre-Cache)

These are reference repos — do NOT use their code directly. Clone to `/tmp/` for reference during development:

```bash
# ERC-8004 contracts (deploy via Hardhat Ignition)
git clone https://github.com/erc-8004/erc-8004-contracts.git /tmp/erc-8004-contracts

# 0G Agent Skills (copy skills to OpenClaw agents)
git clone https://github.com/0gfoundation/0g-agent-skills.git /tmp/0g-agent-skills

# Automata DCAP (deploy via Foundry if attempting ZK verification)
git clone https://github.com/automata-network/automata-dcap-attestation.git /tmp/automata-dcap

# RiscZero Ethereum (ZK verifier contracts — only if Bonsai key available)
git clone https://github.com/risc0/risc0-ethereum.git /tmp/risc0-ethereum
```

---

## Part 8: Verify Everything Works

Run this verification script after setup:

```bash
#!/bin/bash
echo "=== fin.vocaid.ai Machine Setup Verification ==="

echo -n "Node.js: " && node --version
echo -n "npm: " && npm --version
echo -n "pnpm: " && pnpm --version
echo -n "Foundry: " && forge --version 2>&1 | head -1
echo -n "OpenClaw: " && openclaw --version
echo -n "TypeScript: " && tsc --version
echo -n "Git: " && git --version

echo ""
echo "=== Chain RPC Verification ==="
echo -n "0G Galileo: "
curl -s -X POST https://evmrpc-testnet.0g.ai \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' | grep -o '"result":"[^"]*"'

echo "Hedera Testnet: configured via @hashgraph/sdk (non-EVM)"

echo ""
echo "=== Reference Repos ==="
echo -n "ERC-8004: " && ls /tmp/erc-8004-contracts/contracts/ 2>/dev/null | wc -l | xargs echo "contracts"
echo -n "0G Skills: " && ls /tmp/0g-agent-skills/skills/ 2>/dev/null | wc -l | xargs echo "categories"

echo ""
echo "=== Cursor Config ==="
echo -n ".cursor/rules/: " && ls .cursor/rules/*.mdc 2>/dev/null | wc -l | xargs echo "rule files"
echo -n ".cursor/mcp.json: " && (test -f .cursor/mcp.json && echo "exists" || echo "MISSING")

echo ""
echo "=== Done ==="
```

Expected output:
```
Node.js: v20.x.x
npm: 10.x.x
pnpm: 9.x.x
Foundry: forge Version: 1.5.x
OpenClaw: OpenClaw 2026.4.x
TypeScript: Version 5.x.x
Git: git version 2.x.x

0G Galileo: "result":"0x40da"
Hedera Testnet: configured via @hashgraph/sdk (non-EVM)

ERC-8004: 8 contracts
0G Skills: 4 categories

.cursor/rules/: 3 rule files
.cursor/mcp.json: exists
```

---

## Part 9: Quick Reference

### Key Addresses

| Item | Value |
|------|-------|
| Wallet | `0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE` |
| World APP_ID | `app_74d7b06d88b9e220ad1cc06e387c55f3` |
| World RP_ID | `rp_21826eb5449cc811` |
| Hedera USDC Token | `0.0.429274` (testnet) |
| Vercel URL | `https://vocaid-hub.vercel.app` |

### Chain IDs

| Chain | ID | RPC |
|-------|-----|-----|
| 0G Galileo | 16602 | `https://evmrpc-testnet.0g.ai` |
| Hedera Testnet | hedera-testnet | `@hashgraph/sdk` |
| World Sepolia | 4801 | `https://worldchain-sepolia.g.alchemy.com/v2/KEY` |

### Block Explorers

| Chain | Explorer |
|-------|---------|
| 0G | `https://chainscan-galileo.0g.ai` |
| Hedera | `https://testnet.hashscan.io` |
| World | World Chain Sepolia Blockscout |

### Faucets

| Chain | URL |
|-------|-----|
| 0G | `https://faucet.0g.ai` (0.1 A0GI daily) |
| Hedera | `https://portal.hedera.com` (Hedera Testnet faucet) |
| World | Bridge from Sepolia or Alchemy faucet |

---

## Part 10: Context Documents

The Cursor agent should read these docs (in `vocaid-hub/docs/`) for full project context:

| Doc | Purpose | Read When |
|-----|---------|-----------|
| `STRATEGIC_ASSESSMENT.md` | What we're building and why | First |
| `WAVE_EXECUTION_PLAN.md` | Which agent builds what, in what order | Before any coding |
| `TECHNOLOGY_RESEARCH.md` | SDK methods, chain configs, contract interfaces | During implementation |
| `PARTNER_BOUNTIES.md` | Prize track requirements to satisfy | When writing submission |
| `DEVELOPER_CONVERSATIONS.md` | Talking points for sponsor meetings | Before booth presentations |
| `OPENCLAW_RISK_ASSESSMENT.md` | Security mitigations to apply | When configuring OpenClaw |
| `MARKET_RISK_ASSESSMENT.md` | Known risks to acknowledge | When writing README/submission |
| `PRE_HACKATHON_CHECKLIST.md` | Setup verification | During machine setup |
