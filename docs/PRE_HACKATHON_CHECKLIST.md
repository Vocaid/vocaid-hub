# fin.vocaid.ai — Pre-Hackathon Checklist (Reliable Resources for the Agentic Economy)

**Hackathon:** ETHGlobal Cannes, April 3-5, 2026 (in-person)
**Architecture:** World Chain (Trust) + 0G Chain (Verify) + Hedera (Settle)
**Partners:** World ($20k) + 0G ($15k) + Hedera ($15k) = $50k accessible
**Total pre-work:** ~3-4 hours
**Last updated:** 2026-04-02

---

## Tier 1: Blocks Wave 1 (Must Do Before Travel)

Without these, you cannot start deploying contracts on Day 1.

### World (Trust Layer)

- [ ] **World Developer Portal account** — developer.worldcoin.org → Create App → Get `APP_ID`. (10 min)
  - Configure action: `verify-human` (Orb verification level)
  - Set redirect URL to `http://localhost:3000`
  - Note: Mini Apps require World App simulator for testing

- [ ] **Install World App on phone** — App Store / Play Store. Create or verify your World ID (Orb-level if possible, device-level otherwise). (10 min)

- [ ] **World App Simulator setup** — Required for testing Mini Apps locally:
  ```bash
  # Option 1: Use World App simulator (recommended for hackathon)
  # The MiniKit SDK has a built-in dev mode that simulates World App
  # Just install @worldcoin/minikit-js and use MiniKit.install(APP_ID)

  # Option 2: Use Worldcoin Dev Portal simulator
  # Navigate to developer.worldcoin.org → Your App → Simulator
  ```

- [ ] **Get World Chain Sepolia testnet ETH** — Bridge from Sepolia or use World Chain faucet. Needed for deploying CredentialGate.sol. (10 min)

### 0G (Verify Layer)

- [ ] **Create 0G wallet** — (5 min)
  ```bash
  node -e "const w = require('ethers').Wallet.createRandom(); console.log('Address:', w.address); console.log('Key:', w.privateKey)"
  ```

- [ ] **Fund 0G Galileo testnet** — Visit `https://faucet.0g.ai/` or `https://faucets.chain.link/0g-testnet-galileo`. Request testnet A0GI tokens. Need enough for deploying ~20 contracts (ERC-8004 + Automata DCAP + GPUProviderRegistry). (10 min)

- [ ] **Get RiscZero Bonsai API key** — For ZK proof generation of TDX attestations. Visit `https://bonsai.xyz` or `https://risczero.com/bonsai`. Free tier may suffice for hackathon. (15 min)
  - Alternative: If no Bonsai key available, fall back to mock TEE validator (no ZK proofs needed)

- [ ] **Verify 0G testnet RPC works** — (2 min)
  ```bash
  curl -X POST https://evmrpc-testnet.0g.ai -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
  # Expected: {"result":"0x40da"} (16602 in hex)
  ```

### Hedera (Settle Layer)

- [ ] **Get Hedera testnet HBAR** — Visit `https://portal.hedera.com`. Request testnet HBAR for account 0.0.8368570. (5 min)
  - Network: hedera-testnet
  - Account: 0.0.8368570
  - USDC token: 0.0.429274
  - Fee payer: 0.0.7162784
  - Block explorer: `https://testnet.hashscan.io`

- [ ] **Verify Hedera testnet works** — (2 min)
  ```bash
  # Verify via @hashgraph/sdk or check balance on testnet.hashscan.io
  # Account 0.0.8368570 should show HBAR balance
  ```

- [ ] **Verify Blocky402 facilitator** — `https://api.testnet.blocky402.com` → Check x402 facilitator is responding. (5 min)

### Tooling

- [ ] **Install Foundry** — Required for Automata DCAP deployment (Foundry-based): (5 min)
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  forge --version  # Should show 0.2.0+
  ```

- [ ] **Install OpenClaw** — (5 min)
  ```bash
  npm install -g openclaw
  openclaw --version
  ```

- [ ] **Verify Node.js 18+** — Required for all SDKs: (1 min)
  ```bash
  node --version  # Must be >= 18.0.0
  ```

**Total Tier 1: ~1.5 hours**

---

## Tier 2: Validates the Stack (Before Travel)

Confirms the SDKs install and testnets respond. Do this at home, not at the venue.

- [ ] **Test Hardhat multi-chain config** — Create a minimal `hardhat.config.ts` with 0G + World networks. Run `npx hardhat compile` with an empty contract. Verify it compiles with `evmVersion: "cancun"`. Hedera uses @hashgraph/sdk, not Hardhat. (10 min)

- [ ] **Test 0G broker SDK** — (15 min)
  ```bash
  npm install @0glabs/0g-serving-broker ethers dotenv
  # Write a test script that calls createZGComputeNetworkBroker(wallet)
  # Verify it initializes without error
  # Call broker.inference.listService() → should return provider list (may be empty on testnet)
  ```

- [ ] **Test @hashgraph/sdk** — (15 min)
  ```bash
  npm install @hashgraph/sdk
  # Write a test script that creates a Client.forTestnet()
  # Verify it initializes and can check HBAR balance for 0.0.8368570
  ```

- [ ] **Test World MiniKit dev mode** — (10 min)
  ```bash
  npx create-next-app@latest test-miniapp --typescript --tailwind --app
  cd test-miniapp
  npm install @worldcoin/minikit-js
  # Add MiniKit.install(APP_ID) to a page
  # Run npm run dev → verify page loads without errors
  ```

- [ ] **Clone ERC-8004 contracts** — (5 min)
  ```bash
  git clone https://github.com/erc-8004/erc-8004-contracts.git /tmp/erc-8004-contracts
  cd /tmp/erc-8004-contracts && npm install
  # Verify: npx hardhat compile → should compile without errors
  ```

- [ ] **Clone 0G agent skills** — (5 min)
  ```bash
  git clone https://github.com/0gfoundation/0g-agent-skills.git /tmp/0g-agent-skills
  # Verify: ls skills/ → should show storage/, compute/, chain/, cross-layer/ directories
  ```

- [ ] **Test OpenClaw agent creation** — (10 min)
  ```bash
  mkdir /tmp/test-agents && cd /tmp/test-agents
  openclaw agents add seer
  openclaw agents add edge
  # Verify: ls .agents/ → should show seer/ and edge/ directories
  ```

**Total Tier 2: ~1.5 hours**

---

## Tier 3: Nice-to-Have (At the Venue or If Time)

- [ ] Join 0G Discord (`discord.gg/0glabs`) — Ask about serving contract addresses + TEE attestation data access
- [ ] Join World Discord (`discord.gg/worldcoin`) — Ask about AgentKit best practices
- [ ] Join Hedera Discord — Ask about Blocky402 x402 facilitator status and HTS best practices
- [ ] Clone Automata DCAP contracts — `git clone https://github.com/automata-network/automata-dcap-attestation.git`
- [ ] Clone RiscZero Ethereum contracts — `git clone https://github.com/risc0/risc0-ethereum.git`
- [ ] Read ERC-8004 spec thoroughly — `https://eips.ethereum.org/EIPS/eip-8004`
- [ ] Read @hashgraph/sdk docs and Blocky402 x402 integration guide

---

## What You Do NOT Need Before the Hackathon

| Skip This | Why |
|-----------|-----|
| Public GitHub repo | Create at the venue when you start coding |
| Any functional code | Fresh-start rule: all code during 48h |
| Pre-deployed contracts | Deploy during Wave 1 |
| Pre-generated ZK proofs | Generate during Wave 1 (or at venue) |
| Pre-recorded demo video | Can't record until app works |

---

## Environment Variables (Fill Before Travel)

Copy `.env.example` → `.env` and fill:

```bash
# World (Trust Layer)
WORLD_APP_ID=app_XXXXX
NEXT_PUBLIC_WORLD_APP_ID=app_XXXXX

# 0G (Verify Layer)
PRIVATE_KEY=0x...                              # Shared across chains (or separate per chain)
NEXT_PUBLIC_0G_RPC=https://evmrpc-testnet.0g.ai
BONSAI_API_KEY=...                             # RiscZero Bonsai (for ZK proofs)
BONSAI_API_URL=https://api.bonsai.xyz

# Hedera (Settle Layer)
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.8368570
HEDERA_USDC_TOKEN=0.0.429274
HEDERA_FEE_PAYER=0.0.7162784

# Optional fallbacks
ANTHROPIC_API_KEY=...                          # If 0G compute is down
FIN_COST_LIMIT=5                               # Max $ for Anthropic fallback

# Contract addresses (filled during Wave 1 deployment)
IDENTITY_REGISTRY=
REPUTATION_REGISTRY=
VALIDATION_REGISTRY=
GPU_PROVIDER_REGISTRY=
CREDENTIAL_GATE=
RESOURCE_PREDICTION=
```

---

## Day 1 at Venue — First 2 Hours

| Minute | Action |
|--------|--------|
| 0-15 | Set up workspace. Connect WiFi + test mobile hotspot. Verify `.env` is loaded. |
| 15-30 | **Find 0G sponsor rep.** Ask: "We're building GPU provider verification on ERC-8004 — your confirmed gap. We need serving contract addresses on Galileo and access to TEE attestation data. Can you help?" (See `DEVELOPER_CONVERSATIONS.md` for full talking points) |
| 30-45 | **Find Hedera sponsor rep.** Ask: "We're building x402 USDC payments via Blocky402 + HTS credential tokens + HCS audit trail. Pure @hashgraph/sdk, no Solidity. Any testnet gotchas?" (See `DEVELOPER_CONVERSATIONS.md`) |
| 45-60 | **Find World sponsor rep.** Ask: "4 OpenClaw agents registered via AgentKit + World ID as hard gate for all resource access. Deep enough for AgentKit $8k?" |
| 60-90 | Create public GitHub repo. Push initial scaffold commit. Start Wave 1 contract deployments. |
| 90-120 | Wave 1 deploying: ERC-8004 on 0G, CredentialGate on World, start Automata DCAP (if feasible). |

---

## Security Reminders

- **NEVER use production keys.** All testnet credentials are hackathon-only.
- **NEVER commit `.env` to git.** `.gitignore` covers it.
- **NEVER run `env` or `printenv` during a live demo.**
- **Rotate or revoke ALL hackathon keys after the event.**

---

## Cost Estimate (48 hours)

| Service | Cost | Notes |
|---------|------|-------|
| 0G testnet | $0 | Free from faucet |
| Hedera testnet | $0 | Free HBAR from portal.hedera.com |
| World Chain Sepolia | $0 | Free testnet ETH |
| RiscZero Bonsai | $0-10 | Free tier for proof generation |
| Anthropic fallback | $10-50 | Only if 0G compute is down |
| **Total** | **$0-60** | |

---

## What to Bring to Cannes

- [ ] Laptop + charger + USB-C adapter
- [ ] Phone with World App installed + World ID verified
- [ ] Mobile hotspot (venue WiFi is unreliable)
- [ ] Power strip
- [ ] `.env` file with testnet credentials (password manager or encrypted USB)
- [ ] This repo cloned locally
- [ ] Headphones (for recording demo video narration)
- [ ] Printed `DEVELOPER_CONVERSATIONS.md` (for sponsor booth meetings)
