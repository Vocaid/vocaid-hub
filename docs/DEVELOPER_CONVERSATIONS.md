# Developer Conversation Decks — ETHGlobal Cannes 2026

**Purpose:** Structured talking points for 0G and Hedera developer conversations at the hackathon.

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

## 2. Hedera Developers: x402 USDC + HTS Tokens + HCS Audit + "No Solidity" Track

### Opening

*"We're building the settlement and credential layer for an agentic resource marketplace — x402 USDC payments via Blocky402, non-transferable HTS credential tokens, and HCS audit trails. Zero Solidity on Hedera — pure @hashgraph/sdk."*

### Why This Fits Hedera

Hedera's bounty tracks match our architecture perfectly:

| Track | Our Fit | Prize |
|-------|---------|-------|
| **AI & Agentic Payments** | x402 USDC payments via Blocky402 facilitator for agent-to-agent resource payments | $6k |
| **Tokenization** | HTS non-transferable credential tokens for verified humans/GPUs/agents | $2.5k |
| **No Solidity Allowed** | Pure @hashgraph/sdk — HTS + HCS, zero Solidity | $3k |

### Technical Integration

**Four Hedera technologies:**

1. **x402 USDC via Blocky402** (`@hashgraph/sdk`):
   - Agent-to-agent USDC payments (token 0.0.429274) for resource allocation
   - Blocky402 facilitator at https://api.testnet.blocky402.com
   - Fee payer: 0.0.7162784, $0.0001 gas per payment

2. **HTS Non-Transferable Tokens**:
   - Credential tokens for verified humans, GPUs, agents
   - Non-transferable = soulbound verification badges
   - Created via @hashgraph/sdk TokenCreateTransaction

3. **HCS Audit Trail**:
   - Every verification, payment, and reputation update logged to HCS topic
   - Immutable audit trail for compliance
   - Mirror Node queries for historical data

4. **"No Solidity" Architecture**:
   - At least 2 native Hedera services: HTS + HCS
   - Pure @hashgraph/sdk, zero Solidity contracts
   - Qualifies for "No Solidity Allowed" track ($3k, 3 winners)

### What We Need From Hedera

**Request 1: Testnet HBAR faucet**
*"portal.hedera.com provides testnet HBAR? We have account 0.0.8368570 with 1,098 HBAR. Need enough for HTS token creation + HCS messages during demo."*

**Request 2: Blocky402 testnet status**
*"We're using Blocky402 facilitator at https://api.testnet.blocky402.com for x402 payments. Is the testnet facilitator stable for demo purposes?"*

**Request 3: HTS + HCS best practices**
*"We're creating non-transferable HTS tokens for credentials and logging to HCS for audit. Any gotchas with combining these on testnet?"*

### Why Hedera Should Care

*"We demonstrate Hedera as the settlement layer for the machine economy:*
- *x402 USDC payments for agent services ($0.0001 gas)*
- *HTS soulbound tokens for verifiable credentials*
- *HCS audit trail for compliance and transparency*
- *Zero Solidity — pure native Hedera services*
- *A new asset class (resource pricing) that grows with AI adoption"*

### The Agentic Economy Narrative

*"Every AI company in 2026 needs two things: compute and skills. Both are scarce, both fluctuate in price, both lack transparent market mechanisms. Our resource marketplace creates price discovery for these resources — and Hedera's low-cost, high-throughput architecture is the natural settlement layer.*

*x402 payments, soulbound credentials, immutable audit trails — all on Hedera, all without Solidity."*

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
