# Developer Conversation Decks — ETHGlobal Cannes 2026

**Purpose:** Structured talking points for 0G and Arc developer conversations at the hackathon.

---

## 1. 0G Developers: The verifyService() Gap

### Opening

*"Your compute network has providers, users, and the protocol. Users discover providers via `listService()`, get metadata via `getServiceMetadata()`, and verify individual inference responses via TEE signatures. But there's a missing step: before a user commits resources, they can't independently verify that a provider's hardware is genuine, that their TEE attestation is current, or what their reputation is."*

### The Gap

| What Exists in 0G SDK | What's Missing |
|----------------------|---------------|
| `listService()` → discover providers | No quality/trust signal attached to discovery |
| `getServiceMetadata()` → endpoint, model, pricing | No uptime, latency, success rate history |
| TEE signing per inference response | No pre-commitment TEE attestation verification |
| Provider self-registration via Inference Broker | No independent third-party verification |
| On-chain service data (endpoint, model, price) | No on-chain reputation or validation status |

*"Provider registration is self-reported via the Broker. There's no `verifyService()` method that lets a client independently verify TEE attestation before making the first inference call. An AI agent using 0G Compute has to blindly trust whichever provider `listService()` returns."*

### What We're Building

*"We're deploying ERC-8004 — the industry standard for trustless agent identity (live on Ethereum mainnet since Jan 2026, authored by MetaMask/EF/Google/Coinbase) — on 0G Chain and creating a verification bridge:"*

```
0G Service Contract (existing)         ERC-8004 on 0G Chain (new)
├─ listService()                       ├─ IdentityRegistry → provider NFT identity
├─ getServiceMetadata()                │   with A2A agent card, capabilities
│                                      ├─ ReputationRegistry → quality scores
│  (no trust signal)                   │   uptime%, latency, successRate
│                                      ├─ ValidationRegistry → TEE attestation
│  (no pre-call verification)          │   ZK proof of TDX quote on-chain (~500K gas)
│                                      └─ getSummary() → composable trust score
```

### On-Chain TEE Verification (Not Off-Chain)

*"We're not doing off-chain verification with an on-chain hash — that undermines the trust model. We're deploying Automata Network's DCAP attestation with ZK proof verification directly on 0G Chain:"*

- Provider generates TDX quote inside TEE (~2 seconds)
- Quote sent to RiscZero Bonsai → Groth16 SNARK proof (~5 minutes)
- Proof submitted on-chain to Automata verifier on 0G Chain (~500K gas, sub-second finality)
- Result recorded in ERC-8004 Validation Registry → provider verified

*"500K gas is trivial on 0G — your block limit is 36M gas at 7-13% utilization. The entire verification costs fractions of a cent."*

### What We Need From 0G

**Request 1: Serving contract addresses on Galileo testnet**

*"The Serving/Account/Service contract addresses aren't in the public docs — they're embedded in the broker binaries. We can extract them from `@0glabs/0g-serving-broker` npm package or the Go source, but having them directly would save time. We specifically need the Service Contract address so we can read provider registration data."*

**Request 2: Provider TEE attestation data access**

*"Currently the TDX attestation is embedded in the broker's RA-TLS handshake. Is there:*
- *An API endpoint that returns the raw TDX quote for a given provider?*
- *A method in the SDK that exposes attestation data?*
- *A sample attestation bundle we can use for demo purposes?"*

**Request 3: Feedback on the architecture**

*"We're building a separate verification layer that reads from your contracts and writes to ERC-8004. Is there anything in your roadmap that overlaps? Would you want this integrated into the 0G SDK itself?"*

### Why 0G Should Care

*"This is infrastructure your ecosystem needs. Every decentralized compute network (Akash, Render, io.net) has a proprietary verification system. None use an open standard. ERC-8004 is the first cross-ecosystem standard for agent/provider identity, and nobody has applied it to GPU verification yet. We'd be first.*

*After the hackathon, this could become:*
- *A 0G SDK plugin that wraps our verification layer*
- *The default provider discovery tool for any agent using 0G Compute*
- *An open standard that other compute networks adopt"*

---

## 2. Arc Developers: Resource Prediction Markets

### Opening

*"We're building prediction markets for a new asset class that nobody has tokenized: the price of computation and human skill. Not crypto prices, not elections — the price of H100 inference time, the demand for Rust developers, GPU availability by region."*

### Why This Fits Arc

Arc's Prediction Markets track lists: *"Macroeconomic data markets (CPI, Fed decisions, **jobs**, GDP)"*

Our resource pricing IS a jobs/compute market forecast:

| Market | Question | Resolution Source |
|--------|----------|-----------------|
| **GPU Pricing** | "H100 inference < $0.005/token by May?" | 0G Service Contract pricing (on-chain) |
| **Skill Demand** | "Rust developer demand +15% in Q2?" | Public hiring APIs + assessment data |
| **Resource Availability** | "EU GPU capacity > 1000 nodes by June?" | ERC-8004 Identity Registry count |
| **Agent Performance** | "Agent X maintains >95% success rate?" | ERC-8004 Reputation Registry (on-chain) |

*"All resolution sources are either on-chain (0G contracts, ERC-8004 registries) or verifiable via oracle. These aren't speculation markets — they're real-world signal markets for the inputs to the agentic economy."*

### Why USDC on Arc

*"Resource providers need fiat-stable income. A GPU operator paying electricity bills can't accept volatile tokens. A developer pricing their time needs stable value. USDC on Arc means:*
- *Providers paid in stable value*
- *Prediction markets denominate in real dollars*
- *Agent payments gas-free via Nanopayments ($0.000001 minimum)*
- *Deterministic sub-second settlement — agents pay and receive in one round-trip"*

### Technical Integration

**Three Arc technologies:**

1. **Circle Nanopayments** (`@circle-fin/x402-batching`):
   - Agent-to-agent USDC payments for resource allocation
   - EIP-3009 offchain signing → Gateway batches → zero per-payment gas
   - Buyer SDK: `client.pay("http://api/inference")` — automatic 402 handling

2. **PredictionMarket.sol on Arc** (~120 lines):
   - USDC-denominated (arc USDC: `0x3600...0000`)
   - `createMarket()`, `placeBet()`, `resolveMarket()`, `claimWinnings()`
   - Oracle resolution reads from 0G on-chain pricing or ERC-8004 reputation data

3. **On-chain settlement** (Arc Chain ID `5042002`):
   - Sub-second deterministic finality
   - Create market → place bet → resolve → claim — all within a single demo

### What We Need From Arc/Circle

**Request 1: Arc testnet USDC faucet**
*"faucet.circle.com provides testnet USDC on Arc (Chain ID 5042002)? We need enough for demo: create markets, place bets, pay for agent services."*

**Request 2: Nanopayments minimum deposit**
*"What's the minimum Gateway Wallet deposit for demo purposes? We need to show agent-to-agent payments of $0.01-$0.10."*

**Request 3: ERC-8004 on Arc testnet**
*"ERC-8004 is already deployed on Arc Testnet. Can we use the existing deployment or should we deploy fresh instances?"*

### Why Arc Should Care

*"Polymarket does elections ($40B+ volume in 2025). Augur does sports. Nobody does the price of computation and human skill — the two inputs to the agentic economy.*

*We demonstrate Arc as the settlement layer for the machine economy:*
- *Resource pricing in stablecoins (USDC)*
- *Gas-free high-frequency agent payments (Nanopayments)*
- *Deterministic finality for real-time market resolution*
- *A new asset class that grows with AI adoption"*

### The Agentic Economy Narrative

*"Every AI company in 2026 needs two things: compute and skills. Both are scarce, both fluctuate in price, both lack transparent market mechanisms. Our prediction markets create price discovery for these resources — and Arc's stablecoin-native architecture is the natural settlement layer.*

*The same way Polymarket changed how people bet on elections, resource prediction markets change how agentic companies plan and allocate. And it runs on Arc."*

---

## 3. Automata DCAP ZK Verification — Technical Talking Points

### For 0G Developers (Why On-Chain Matters)

*"Off-chain TEE verification with an on-chain hash breaks the trust model. Anyone can claim they verified a quote and post a hash. On-chain ZK proof verification means the 0G Chain itself validates the TDX attestation — trustlessly, no intermediary."*

| Approach | Trust Model | Gas | Composability |
|----------|-------------|-----|--------------|
| Off-chain verify → hash on-chain | Trust the verifier (centralized) | ~50K | Low — can't verify the hash |
| Full on-chain DCAP | Trustless (chain verifies) | ~4-5M | High — any contract can check |
| **ZK proof on-chain** | **Trustless (ZK proof = math)** | **~500K** | **High — standard Groth16 verify** |

*"500K gas on 0G costs fractions of a cent. Your blocks are at 7-13% utilization. This is the right path for production infrastructure."*

### Deployment Requirements

- **15-20 contracts** across 3 layers (PCCS + DCAP + ZK verifier)
- **~17-30M gas** for full deployment (feasible on 0G testnet, free tokens)
- **RiscZero Groth16 verifier** must be deployed (4 contracts)
- **Proof generation**: ~5 min via RiscZero Bonsai (remote GPU cluster)
- **Demo strategy**: Pre-compute proofs, submit live (on-chain part takes seconds)
