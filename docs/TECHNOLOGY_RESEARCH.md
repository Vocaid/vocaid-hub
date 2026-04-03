# fin.vocaid.ai — Technology Deep Research

**Date:** 2026-04-02
**Purpose:** Technical feasibility evaluation for Hybrid Resource Allocation Protocol
**Context:** ETHGlobal Cannes 2026 (April 3-5)

---

## 1. ERC-8004: Trustless Agent Identity (GPU Verification Focus)

### Overview
- **Status:** Live on Ethereum mainnet since Jan 29, 2026
- **Authors:** Marco De Rossi (MetaMask), Davide Crapis (EF), Jordan Ellis (Google), Erik Reppel (Coinbase)
- **Contracts:** github.com/erc-8004/erc-8004-contracts (Hardhat + Hardhat Ignition)
- **Deployed on 30+ chains** including Hedera Testnet, Arc Testnet, Base, Arbitrum, Polygon, Mantle, Optimism

### Three Registries

**IdentityRegistry (ERC-721 + URIStorage):**
```solidity
register(string agentURI, MetadataEntry[] metadata) → uint256 agentId
setAgentURI(uint256 agentId, string newURI)
setAgentWallet(uint256 agentId, address wallet, uint256 deadline, bytes signature)
getMetadata(uint256 agentId, string key) → bytes
```

Agent registration file (JSON at agentURI):
```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "GPU-Provider-Alpha",
  "services": [
    {"name": "A2A", "endpoint": "https://provider.example/a2a", "version": "1.0"},
    {"name": "MCP", "endpoint": "https://provider.example/mcp", "version": "1.0"}
  ],
  "supportedTrust": ["reputation", "tee-attestation"]
}
```

**ReputationRegistry:**
```solidity
giveFeedback(uint256 agentId, int128 value, uint8 decimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)
getSummary(uint256 agentId, address[] clients, string tag1, string tag2) → (uint64 count, int128 summaryValue, uint8 decimals)
readAllFeedback(uint256 agentId, address[] clients, string tag1, string tag2, bool includeRevoked) → arrays
```

Tags: "starred" (quality 0-100), "uptime" (%), "successRate" (%), "responseTime" (ms).

**ValidationRegistryUpgradeable:**
```solidity
validationRequest(address validatorAddress, uint256 agentId, string requestURI, bytes32 requestHash)
validationResponse(bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)
getValidationStatus(bytes32 requestHash) → (address, uint256, uint8, bytes32, string, uint256)
getSummary(uint256 agentId, address[] validators, string tag) → (uint64 count, uint8 avgResponse)
getAgentValidations(uint256 agentId) → bytes32[]
```

- UUPS upgradeable with OwnableUpgradeable
- Response: uint8 (0-100), binary = 0 fail / 100 pass
- requestURI/responseURI: off-chain evidence (IPFS, HTTPS)
- tag: free-form categorization ("gpu-tee-attestation", "gpu-benchmark")
- Progressive validation: validationResponse() can be called multiple times

### GPU Provider Verification — Innovation Gap

**Confirmed: Nobody has built GPU provider verification on ERC-8004.**

Searched the awesome-erc8004 directory (40+ projects). Closest implementations:
- **Automata Network**: DCAP Attestation (TDX/SGX verification contracts) — standalone, not wired to Validation Registry
- **Phala Network**: ERC-8004 TEE agent identity — uses own attestation pipeline, not Validation Registry
- **Verity Protocol**: On-chain reliability scoring — ReputationRegistry only, not hardware verification

### TEE Attestation Data Structure (dstack/0G format)

```json
{
  "tee_type": "TDX",
  "code_hash": "0x...",
  "image_id": "sha256:...",
  "rtmrs": ["0x...", "0x..."],
  "node_signature": "0x...",
  "tdx_quote": "0x...",
  "event_log": [...],
  "timestamp": 1711900000,
  "gpu_attestation": {
    "gpu_model": "H100",
    "nvtrust_report": "0x...",
    "spdm_session_id": "...",
    "driver_version": "..."
  }
}
```

### GPU Verification Data Flow

```
1. Provider runs Inference Broker (H100+TEE) → already on 0G
2. TEE generates attestation bundle (TDX quote + NVTrust report)
3. IdentityRegistry.register(providerURI, metadata) → agentId NFT
4. Upload attestation to IPFS → requestURI
5. ValidationRegistry.validationRequest(validatorContract, agentId, requestURI, hash)
6. Validator contract verifies TDX quote + NVTrust → validationResponse(hash, 100, ...)
7. ReputationRegistry accumulates uptime/latency/quality feedback over time
8. Consumers query getSummary() to find verified providers
```

### Automata DCAP ZK Proof Verification (On-Chain Path)

**Why on-chain, not off-chain:** Off-chain verification with an on-chain hash undermines trust, reliability, and web3 credibility. ZK proof costs ~10x more gas but provides full trustless verification.

| Approach | Trust Model | Gas | Web3 Credibility |
|----------|-------------|-----|------------------|
| Off-chain verify → hash | Centralized (trust verifier) | ~50K | Low |
| Full on-chain DCAP | Trustless (chain verifies) | ~4-5M | High |
| **ZK proof on-chain** | **Trustless (math proves)** | **~350-500K** | **High** |

**Deployment Stack (~15-20 contracts):**

Layer 1 — On-Chain PCCS (5 DAO contracts): AutomataPckDao, AutomataPcsDao, AutomataFmspcTcbDao, AutomataEnclaveIdentityDao, AutomataTcbEvalDao + helpers/parsers

Layer 2 — DCAP Attestation (6+ contracts): AutomataDcapAttestationFee (main entrypoint), PCCSRouter, V3/V4/V5 QuoteVerifiers

Layer 3 — ZK Verifier (RiscZero recommended): RiscZeroGroth16Verifier, EmergencyStop, VerifierRouter, TimelockController (4 contracts)

**Deployment order:** ZK Verifier (no deps) → PCCS DAOs (no deps on ZK) → DCAP Attestation (depends on both)

**Gas estimates:**
- Full deployment: ~17-30M gas total (feasible on 0G testnet — 36M block limit, 7-13% utilization, free tokens)
- Per-verification: ~350-500K gas (RiscZero Groth16)

**Proof generation:**
- TDX quote generation: ~2 seconds (on provider's TDX machine)
- ZK proof via RiscZero Bonsai: **~5 minutes** (remote GPU cluster)
- Proof size: ~256 bytes Groth16 + ~200-500 bytes journal
- On-chain verification: sub-second on 0G

**Demo strategy:** Pre-compute 2-3 proofs before demo. Submit them live (on-chain part takes seconds). Have dashboard showing verification result in real-time.

**Tooling:** Foundry/Forge for deployment (`evm/forge-script/`). `tdx-attestation-sdk` (Rust) for quote generation. `dcap-bonsai-cli` for proof generation. Requires Bonsai API key.

**RiscZero identifiers:**
- ImageID: `6f661ba5aaed148dbd2ae6217a47be56b3d713f37c65cc5ea3b006a9525bc807`
- SP1 VKEY: `0021feaf3f6c78429dac7756fac5cfed39b606e34603443409733e13a1cf06cc`

**Neither RiscZero nor SP1 verifiers are deployed on 0G Chain.** Must deploy ourselves.

**Fallback:** If DCAP deployment takes >4h at hackathon, fall back to mock validator (signature-based, ~30K gas). ERC-8004 registration flow identical either way.

### Competing Standards

| Network | Verification | On-Chain | Standard |
|---------|-------------|----------|----------|
| Akash (AEP-29) | Intel TDX, AMD SEV-SNP, NVIDIA NVTrust | Cosmos SDK modules | Proprietary |
| Render | Proof-of-Render per job | Solana settlement | Proprietary PoR |
| io.net | Hourly PoW + Proof of Time-Lock | Off-chain validation | Proprietary |
| Phala/dstack | RA-TLS + TDX + NVTrust | ERC-8004 agent identity | dstack SDK |
| 0G | TEE signing per inference | EVM smart contracts | Proprietary trio |
| **ERC-8004** | **Generic: pluggable validators** | **Any EVM chain** | **Open standard** |

No universal EVM standard exists. ERC-8004's Validation Registry is the closest generic framework.

---

## 2. 0G Compute Network

### SDK: @0glabs/0g-serving-broker

```typescript
const broker = await createZGComputeNetworkBroker(wallet);

// Service Discovery
broker.inference.listService()                              // List providers
broker.inference.acknowledgeProviderSigner(providerAddress)  // Establish trust
broker.inference.getServiceMetadata(providerAddress)         // { endpoint, model }
broker.inference.getRequestHeaders(providerAddress, body?)   // Auth headers

// Account Management
broker.ledger.depositFund(amount)
```

**Note:** No public `verifyService()` method exists. TEE verification happens during inference (each response includes TEE signature with model root hash).

### Network Details

| Parameter | Value |
|-----------|-------|
| Testnet (Galileo) | Chain ID `16602` |
| RPC | `https://evmrpc-testnet.0g.ai` |
| Faucet | `https://faucet.0g.ai` |
| Mainnet (Aristotle) | Chain ID `16661` |
| GPU Requirements | NVIDIA H100/H200 + Intel TDX |
| Contract requirement | `evmVersion: "cancun"` in Hardhat config |

### Provider Requirements
- CPU: Intel TDX (Trusted Domain Extensions) enabled
- GPU: NVIDIA H100 or H200 with TEE support
- Software: Docker Compose + Inference Broker + dstack/Cryptopilot
- Registration: Run Inference Broker → auto-registers on-chain

---

## 3. OpenClaw Agent Configuration

### Multi-Agent Setup (4 agents in one process)

```bash
# Create agents
openclaw agents add seer
openclaw agents add edge
openclaw agents add shield
openclaw agents add lens

# Start all agents in one Gateway process
openclaw gateway
```

Each agent gets isolated workspace at `~/.openclaw/agents/<agentId>/` with:
- `soul.md` — Identity, personality, principles
- `agent.md` — Model selection, tools, protocols
- `user.md` — User context, domain adaptation
- `AGENTS.md` — Workflow instructions

### openclaw.json Configuration

```json
{
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

### Installing 0g-agent-skills

```bash
git clone https://github.com/0gfoundation/0g-agent-skills .0g-skills
npm install @0glabs/0g-ts-sdk@^0.3.3 @0glabs/0g-serving-broker@^0.6.5 ethers@^6.13.0 dotenv

# Copy skills to agent workspaces
for agent in seer edge shield lens; do
  cp -r .0g-skills/skills/* .agents/$agent/skills/
done
```

### 14 Skills in 0g-agent-skills

| Category | Skills | Purpose |
|----------|--------|---------|
| **Storage (3)** | upload-file, download-file, merkle-verification | File storage with Merkle proofs |
| **Compute (6)** | streaming-chat, text-to-image, speech-to-text, provider-discovery, account-management, fine-tuning | AI inference via TEE providers |
| **Chain (3)** | deploy-contract, interact-contract, scaffold-project | Smart contract operations |
| **Cross-Layer (2)** | storage-chain, compute-storage | Multi-service pipelines |

### Agent-to-Agent Communication

| Protocol | Purpose | Setup for Hackathon |
|----------|---------|-------------------|
| **OpenClaw-native `agentToAgent`** | Local inter-agent messaging | Built-in, zero setup. Use `--mode local` |
| **A2A protocol** | Distributed cross-server agents | Requires A2A endpoints per agent (port per agent) |
| **MCP** | Agent-to-tool connections | For connecting agents to external services |

**Recommendation:** Use OpenClaw-native `agentToAgent` for hackathon (simplest). A2A for production.

### ERC-8004 Integration

```bash
openclaw skills install erc-8004
```

### Resource Requirements

| Resource | Hackathon Need |
|----------|---------------|
| RAM | 16 GB sufficient (Gateway ~500MB, agents ~50-100MB each) |
| CPU | 4+ cores |
| Storage | SSD |
| Network | Decent internet (compute happens on 0G network) |

---

## 4. Hedera — Settle Layer (SELECTED) + Arc Chain (NOT SELECTED — Historical Reference)

### Hedera Testnet Configuration (SELECTED)

| Parameter | Value |
|-----------|-------|
| Network | hedera-testnet |
| Account | 0.0.8368570 |
| Fee Payer | 0.0.7162784 |
| USDC Token | 0.0.429274 |
| HBAR Balance | 1,098 |
| USDC Balance | 20 |
| Block Explorer | `https://testnet.hashscan.io` |
| Faucet | `https://portal.hedera.com` |
| SDK | `@hashgraph/sdk` |
| x402 Facilitator | Blocky402 (`https://api.testnet.blocky402.com`) |

### Hedera x402 Integration via Blocky402

**x402 Flow on Hedera:**
1. Buyer has USDC (token 0.0.429274) in Hedera account
2. Buyer requests paid resource -> seller responds `402 Payment Required`
3. Buyer signs USDC transfer authorization via @hashgraph/sdk
4. Blocky402 facilitator processes payment ($0.0001 gas)
5. Seller verifies payment, serves resource

**SDK:**
```bash
npm install @hashgraph/sdk
```

```typescript
import { Client, TransferTransaction, Hbar, AccountId, TokenId } from "@hashgraph/sdk";

const client = Client.forTestnet();
client.setOperator(AccountId.fromString("0.0.8368570"), privateKey);

// Transfer USDC for resource payment
const tx = new TransferTransaction()
  .addTokenTransfer(TokenId.fromString("0.0.429274"), "0.0.8368570", -amount)
  .addTokenTransfer(TokenId.fromString("0.0.429274"), sellerAccount, amount);
await tx.execute(client);
```

### HTS Credential Tokens (Non-Transferable)

```typescript
import { TokenCreateTransaction, TokenType, TokenSupplyType } from "@hashgraph/sdk";

// Create non-transferable credential token
const tx = new TokenCreateTransaction()
  .setTokenName("Vocaid GPU Verified")
  .setTokenSymbol("VGPU")
  .setTokenType(TokenType.NonFungibleUnique)
  .setSupplyType(TokenSupplyType.Infinite)
  .setTreasuryAccountId(treasuryId)
  .setFreezeDefault(true); // Non-transferable
await tx.execute(client);
```

### HCS Audit Trail

```typescript
import { TopicCreateTransaction, TopicMessageSubmitTransaction } from "@hashgraph/sdk";

// Create audit topic
const topicTx = new TopicCreateTransaction().setAdminKey(adminKey);
const topicId = (await topicTx.execute(client)).getReceipt(client).topicId;

// Log verification event
const msgTx = new TopicMessageSubmitTransaction()
  .setTopicId(topicId)
  .setMessage(JSON.stringify({ type: "gpu-verified", agentId: 42, timestamp: Date.now() }));
await msgTx.execute(client);
```

---

### Arc Chain + Circle Nanopayments (NOT SELECTED — Historical Reference)

> **Arc was evaluated but NOT selected as the 3rd partner. Hedera was selected instead.** This section is retained for historical reference only.

### Arc Testnet Configuration (NOT SELECTED)

| Parameter | Value |
|-----------|-------|
| Chain ID | `5042002` |
| CAIP-2 | `eip155:5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| WebSocket | `wss://rpc.testnet.arc.network` |
| Block Explorer | `https://testnet.arcscan.app` |
| Faucet | `https://faucet.circle.com` |
| Gas Token | USDC (18 decimals for gas, 6 for ERC-20) |
| Base Fee | ~160 Gwei (~$0.01/tx) |
| Finality | Deterministic, sub-second, single block |
| USDC Address | `0x3600000000000000000000000000000000000000` |
| EURC Address | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |
| GatewayWallet | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

### Circle Nanopayments Integration

**x402 Flow:**
1. Buyer deposits USDC into Gateway Wallet (one-time onchain tx)
2. Buyer requests paid resource → seller responds `402 Payment Required`
3. Buyer signs EIP-3009 authorization offchain (zero gas)
4. Buyer retries with `PAYMENT-SIGNATURE` header
5. Seller verifies signature, serves resource immediately
6. Gateway batches authorizations and settles onchain in bulk

**Buyer SDK:**
```bash
npm install @circle-fin/x402-batching viem tsx typescript
```

```typescript
import { GatewayClient } from "@circle-fin/x402-batching/client";
const client = new GatewayClient({ chain: "arcTestnet", privateKey: "0x..." });

// One-time deposit
await client.deposit("1"); // 1 USDC

// Pay for resource (automatic 402 handling)
const { data } = await client.pay("http://api.example.com/gpu-inference");
```

**Seller SDK:**
```bash
npm install @circle-fin/x402-batching @x402/core @x402/evm viem express
```

```typescript
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
const gateway = createGatewayMiddleware({
  sellerAddress: "0x...",
  networks: ["eip155:5042002"],
});
app.get("/inference", gateway.require("$0.01"), (req, res) => {
  res.json({ result: "...", paid_by: req.payment.payer });
});
```

### EIP-3009 (Gasless Transfer Authorization)

```solidity
function transferWithAuthorization(
    address from, address to, uint256 value,
    uint256 validAfter, uint256 validBefore,
    bytes32 nonce, uint8 v, bytes32 r, bytes32 s
) external;
```

Key: Nonce is random bytes32 (NOT sequential). Gas paid by Gateway facilitator, not buyer/seller.

### Prediction Market Contract Pattern (~120 lines)

```solidity
contract PredictionMarket is ReentrancyGuard, Ownable {
    IERC20 public immutable usdc;
    enum MarketState { Active, Resolved, Cancelled }
    enum Outcome { None, Yes, No }

    struct Market {
        string question;
        uint256 resolutionTime;
        MarketState state;
        Outcome winningOutcome;
        uint256 yesPool;
        uint256 noPool;
    }

    function createMarket(string question, uint256 resolutionTime) → marketId
    function placeBet(uint256 marketId, Outcome side, uint256 amount)
    function resolveMarket(uint256 marketId, Outcome outcome)  // onlyOwner or oracle
    function claimWinnings(uint256 marketId)
    function cancelMarket(uint256 marketId)
}
```

Oracle resolution: Read price from 0G marketplace (or Chainlink feed), resolve if price >= strikePrice.

---

## 5. x402 Micropayments — Complete Chain Comparison

| Chain | Status | Facilitators | Settlement | Gas | ERC-8004 | Bounty |
|-------|--------|-------------|------------|-----|----------|--------|
| **Base** | Most mature | CDP, Primer, RelAI, 5+ | ~2s | Low L2 | Yes | No partner |
| **Solana** | Production | SolPay, AutoIncentive | ~400ms | Very low | No | No partner |
| **Polygon** | Production | RelAI, Bitrefill | ~2s | Very low | Yes | No partner |
| **Avalanche** | Production | Available | ~1s | Low | Yes | No partner |
| **Stellar** | Production | OpenZeppelin | ~5s | Near-zero | No | No partner |
| **Arc** | Circle Gateway | Circle Nanopayments | Sub-second (batched) | $0 per-payment | Yes | NOT SELECTED |
| **Hedera** | Blocky402 | x402 USDC via Blocky402 | ~3-5s | $0.0001 | Yes | $15k (SELECTED) |
| **0G** | **NOT x402** | **NONE** | Own mechanism | Unknown | Deployable | $15k |

**0G does NOT have native x402.** 0G uses its own payment mechanism: `ServingBroker.depositFund()` + batch settlement. Separate from x402 protocol.

### Agentic Payment Protocols

| Protocol | Layer | Settlement | Best For |
|----------|-------|------------|---------|
| **x402** | HTTP-native | Stablecoin (USDC) | Machine-to-machine: APIs, compute, data |
| **ACP** | Checkout | Fiat via Stripe | Shopping agents (irrelevant for us) |
| **AP2** | Authorization | Processor-defined | Enterprise auditable payments |
| **MPP** | Session | Stablecoins on Tempo | Streaming micropayments |
| **OpenClaw ACP** | Agent coordination | Hedera HBAR | Hedera-specific agent payments (SELECTED) |
| **Circle Nanopayments** | Batched | USDC (gas-free) | Sub-cent agent payments, high frequency (NOT SELECTED — Arc) |

---

## 6. World-Hedera Partnership Assessment

### Finding: No Formal Partnership Exists

- Zero evidence of formal collaboration, joint announcement, or shared initiative
- World = OP Stack / Ethereum L2 (Optimism superchain)
- Hedera = hashgraph-based with own governing council
- No shared standards bodies
- No bridge between World Chain and Hedera
- No joint hackathon winners or projects found

### HCS-14 vs ERC-8004

| Dimension | HCS-14 | ERC-8004 |
|-----------|--------|----------|
| Chain | Hedera-native | Any EVM chain |
| Identity | W3C DID-based (AID + UAID) | ERC-721 NFT |
| Reputation | Via Registry Broker | On-chain Reputation Registry |
| Validation | N/A | On-chain Validation Registry |
| Ecosystem | 72,000+ agents via Registry Broker | 40+ projects, 30+ chain deployments |
| Relation | Complementary (identity layer) | Complementary (trust layer) |

### UCP (Universal Commerce Protocol)

Google's protocol for agentic commerce, NOT Hedera-specific. Chain-agnostic. Built on REST + JSON-RPC with A2A, MCP, and AP2 support. Backed by Google, Shopify, Salesforce.

### Recommendation on Hedera

**SELECTED as 3rd partner (replacing Arc).** Hedera provides 8 strong-fit tracks vs Arc's 7, explicit ERC-8004 and OpenClaw ACP in bounty rules, and the "No Solidity" track is an easy safety win ($3k, 3 winners). x402 USDC payments via Blocky402 facilitator at https://api.testnet.blocky402.com. HTS for non-transferable credential tokens. HCS for audit trail.

---

## 7. Innovation Gap Analysis

### What Has Been Built at ETHGlobal

| Category | Existing Projects |
|----------|------------------|
| AI Agent chatbots | Many (World ID, ENS naming) |
| Token marketplaces | Many (ERC-20, NFT) |
| Prediction markets | Crypto prices, elections, sports |
| Agent payments | API-to-API micropayments, x402 demos |
| DePIN | Device authentication (ioID), compute renting |

### What Has NOT Been Built (Our Innovation)

| Innovation | Why It's Novel | Evidence |
|-----------|---------------|----------|
| **ERC-8004 GPU Provider Verification** | Nobody has used Validation Registry for compute verification. 0G confirmed this gap | awesome-erc8004: 0 of 40+ projects do GPU verification |
| **Multi-Resource Marketplace** | Same protocol for humans + GPUs + agents + DePIN | Existing projects are siloed by resource type |
| **Resource Prediction Markets** | Prediction markets for GPU pricing, skill demand, availability | No one has built resource pricing markets for the agentic economy |
| **Triple-Verified Agent Identity** | World ID (human) + AgentKit (ownership) + ERC-8004 (on-chain) | No project combines all three |
| **0G + OpenClaw + ERC-8004 + x402** | This protocol stack combination doesn't exist | Each piece exists separately |

---

## Sources

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-8004 Contracts](https://github.com/erc-8004/erc-8004-contracts)
- [Awesome ERC-8004](https://github.com/sudeepb02/awesome-erc8004)
- [0G Serving User Broker](https://github.com/0gfoundation/0g-serving-user-broker)
- [0G Agent Skills](https://github.com/0gfoundation/0g-agent-skills)
- [0G Inference Provider Docs](https://docs.0g.ai/build-with-0g/compute-network/provider)
- [OpenClaw Multi-Agent Docs](https://docs.openclaw.ai/concepts/multi-agent)
- [OpenClaw AGENTS.md](https://github.com/openclaw/openclaw/blob/main/AGENTS.md)
- [OpenClaw A2A Protocol](https://github.com/marketclaw-tech/openclaw-a2a)
- [Arc Connect Docs](https://docs.arc.network/arc/references/connect-to-arc)
- [Arc Contract Addresses](https://docs.arc.network/arc/references/contract-addresses)
- [Circle Nanopayments](https://www.circle.com/nanopayments)
- [Circle Buyer Quickstart](https://developers.circle.com/gateway/nanopayments/quickstarts/buyer)
- [Circle Seller Quickstart](https://developers.circle.com/gateway/nanopayments/quickstarts/seller)
- [x402 Protocol](https://github.com/coinbase/x402)
- [x402 Networks & Tokens](https://docs.x402.org/core-concepts/network-and-token-support)
- [Phala + 0G Partnership](https://phala.com/posts/phala-network-and-0g-partner-for-enhanced-confidential-ai-computing)
- [Akash AEP-29](https://akash.network/roadmap/aep-29/)
- [HCS-14 Universal Agent IDs](https://hol.org/blog/hcs-14-universal-agent-ids/)
- [Hedera Agent Trust (ETHGlobal)](https://ethglobal.com/showcase/hedera-agent-trust-mur21)
- [Agentic Payment Protocols Compared](https://www.crossmint.com/learn/agentic-payments-protocols-compared)
- [Prediction Market Contract](https://github.com/SivaramPg/evm-simple-prediction-market-contract)
