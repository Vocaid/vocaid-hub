# ETHGlobal Cannes 2026 — Submission Form Content

**Copy-paste this content into the ETHGlobal submission form.**

---

## Project Details

**Project name:** Vocaid Hub

**Category:** Artificial Intelligence

**Emoji:** 🔮

**Demo link:** https://vocaid-hub.vercel.app

**Short description (max 100 chars):**
```
Verified resource allocation for AI agents — GPU, skills, DePIN — via ERC-8004 on 3 chains
```

**Description (min 280 chars):**
```
Vocaid Hub is a protocol where verified humans and AI agents discover, verify, price, and trade ANY resource — GPU compute, human skills, agent capabilities, and DePIN hardware — through ERC-8004 registries on 0G Chain.

The key innovation: we built the GPU provider verification tool that 0G's own developers confirmed doesn't exist. Providers register with on-chain TEE attestation, build reputation through quality/uptime/latency signals, and become discoverable by any agent via A2A protocol.

Four OpenClaw agents (Seer, Edge, Shield, Lens) operate autonomously — analyzing signals, pricing resources, enforcing risk limits, and monitoring provider quality. Each agent is registered via World AgentKit with ERC-8004 identity, traceable to a verified human via World ID.

Payments settle in USDC via x402 on Hedera through the Blocky402 facilitator. Credential tokens (HTS, non-transferable, KYC-gated) and an immutable HCS audit trail provide compliance infrastructure — all using @hashgraph/sdk with zero Solidity on Hedera.

Resource prediction markets on 0G Chain let anyone bet on future GPU pricing, skill demand, and provider availability — a new asset class for the agentic economy.

Three chains, each doing what it does best: World (Trust) → 0G (Verify) → Hedera (Settle).
```

**How it's made (min 280 chars):**
```
Built as a unified Next.js 15 application with API routes running on Node.js server-side with TypeScript throughout. Three core SDKs (MiniKit, 0G broker, 0G SDK) are TypeScript-only, which drove the single-runtime decision.

0G Chain (Galileo, chainId 16602): We deployed ERC-8004 registries (IdentityRegistry, ReputationRegistry, ValidationRegistry) via Hardhat Ignition with evmVersion cancun. GPUProviderRegistry bridges 0G's listService() SDK with ERC-8004 identity. MockTEEValidator provides ECDSA-based TEE verification. ResourcePrediction.sol implements USDC-denominated prediction markets with oracle resolution.

World Chain (Sepolia, chainId 4801): CredentialGate.sol verifies World ID ZK proofs on-chain. All API routes are gated by requireWorldId() — the product genuinely breaks without World ID. Four agents registered via AgentKit with operator_world_id_hash in ERC-8004 metadata.

Hedera Testnet: Zero Solidity. All operations via @hashgraph/sdk — HTS non-transferable credential tokens (VCRED, 0.0.8499633) with KYC gating, HCS audit trail (topic 0.0.8499635), and x402 USDC payments via the Blocky402 facilitator (https://api.testnet.blocky402.com, verified live, no API key). We confirmed Blocky402 supports hedera-testnet by curling the /supported endpoint.

OpenClaw 4-agent fleet with wallet key isolation: Seer (read-only, no wallet key), Edge (payment authority), Shield (read-only), Lens (reputation writer only). 14 0G skills + 5 custom skills. Gateway on localhost:18789 with exec allowlist (node/npx/curl only).

The reputation signal system uses 7 ERC-8004 tags: cost, latency, uptime, compute, region, quality, availability. Lens agent writes feedback, Seer reads it for pricing, Shield enforces minimums.

Notable hack: We discovered Blocky402's Hedera testnet support isn't documented on their website but IS live on their API — confirmed by curling https://api.testnet.blocky402.com/supported and finding {"network":"hedera-testnet","x402Version":1,"extra":{"feePayer":"0.0.7162784"}}.
```

---

## Tech Stack

**Ethereum developer tools:**
- Hardhat
- Viem
- Ethers.js

**Blockchain networks:**
- 0G (Galileo Testnet)
- World Chain (Sepolia)
- Hedera (Testnet)

**Programming languages:**
- TypeScript
- Solidity

**Web frameworks:**
- Next.js

**Databases:**
- None (all on-chain or decentralized storage)

**Design tools:**
- Figma (architecture diagrams)

**Other technologies:**
- ERC-8004 (Trustless Agent Identity)
- OpenClaw (AI Agent Framework)
- World MiniKit 2.0
- World AgentKit
- @hashgraph/sdk (Hedera Token Service + Consensus Service)
- Blocky402 (x402 Payment Facilitator)
- @0glabs/0g-serving-broker (GPU Compute)
- @0glabs/0g-ts-sdk (Storage + Chain)
- Tailwind CSS
- Lucide React (Icons)

**AI tools description:**
```
Claude Code (Anthropic) was the primary development assistant — used for architecture design, code generation across all 3 chains, debugging chain interactions, documentation, and hackathon strategy research. All output was reviewed, tested, and modified by the team.

Cursor IDE was used for AI-assisted code completion and inline editing during rapid implementation phases.

Human contributions: architecture design (3-chain separation), partner selection strategy (World+0G+Hedera), GPU verification concept (identified 0G infrastructure gap in direct conversation with 0G developers), ERC-8004 reputation signal system design, OpenClaw agent security model, demo choreography, and all live testing/debugging.
```

---

## Judging & Prizes

**Submission type:** Top 10 Finalist & Partner Prizes

**Partners (select exactly 3):**
1. ✅ **World** ($20,000)
2. ✅ **0G** ($15,000)
3. ✅ **Hedera** ($15,000)

**Additional technologies used (not applying for prizes):**
- None (all partner tech is in the 3 selected)

**Future Opportunities:**
- ✅ Yes, interested in grants and accelerators

---

## Contract Addresses (for submission verification)

### 0G Galileo (chainId 16602)
```
IdentityRegistry:     0xc16cf40a33e85f41bed6c90c710ff8c70b8c79ec
ReputationRegistry:   0xa7ba63bce59d366a1c1b647e4ca75a5c11ca47f4
ValidationRegistry:   0x629c61e5a8c78725c8e2cfc6d5b441a4bba0517c
GPUProviderRegistry:  0x94f7d419dd3ff171cb5cd9291a510528ee1ada59
MockTEEValidator:     0x8c4a192ed17dbbe2a7424c0008fafde89c730ccd
ResourcePrediction:   0x82d5f12e55390016c49faab2ccb3c8d55d63fe7a
```

### World Chain Sepolia (chainId 4801)
```
CredentialGate:       0x6B927bA02FE8E5e15D5d5f742380A49876ad3E02
```

### Hedera Testnet
```
Operator:             0.0.8368570
Credential Token:     0.0.8499633 (VCRED, non-transferable, KYC-gated)
Audit Topic:          0.0.8499635
USDC:                 0.0.429274
Blocky402 Facilitator: https://api.testnet.blocky402.com (hedera-testnet)
```

---

## GitHub Repository
```
Vocaid/vocaid-hub — Primary, Monorepo
```

---

## Checklist Before Submit

- [ ] Logo image (512x512, square)
- [ ] Cover image (640x360, 16:9)
- [ ] At least 3 screenshots
- [ ] Demo video uploaded (2-4 min, 720p+, human voiceover)
- [ ] Demo link: https://vocaid-hub.vercel.app
- [ ] GitHub repo is PUBLIC
- [ ] All fields filled (name, tagline, description, how it's made)
- [ ] Tech stack selections complete
- [ ] 3 partners selected: World, 0G, Hedera
- [ ] AI attribution filled
- [ ] All checkboxes checked (start from scratch, version control, open source, etc.)
