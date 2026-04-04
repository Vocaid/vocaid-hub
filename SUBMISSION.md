# Vocaid Hub — ETHGlobal Cannes 2026 Submission

## Event
ETHGlobal Cannes 2026 | April 3-5, 2026

## Project
Vocaid Hub — Reliable Resources for the Agentic Economy

A protocol where verified humans and AI agents discover, verify, price, and trade ANY resource through ERC-8004 registries on 0G Chain, with x402 USDC payments on Hedera via Blocky402 — all inside World App.

## Partners
World ($20k pool) + 0G ($15k pool) + Hedera ($15k pool)

---

## Tracks Targeted

### World — Best use of Agent Kit ($8k, 3 winners)
**Evidence:**
- 4 OpenClaw agents (Seer, Edge, Shield, Lens) registered via AgentKit
- Each agent linked to operator's World ID via `operator_world_id` metadata
- ERC-8004 identity NFT on 0G Chain per agent
- A2A Agent Cards at `/public/agent-cards/*.json`
- **Files:** `src/lib/agentkit.ts`, `src/app/api/agents/register/route.ts`, `scripts/register-agents.ts`

### World — Best use of World ID 4.0 ($8k, 3 winners)
**Evidence:**
- World ID as hard gate for ALL resource access — product breaks without it
- CredentialGate.sol deployed on World Chain Sepolia
- `MiniKit.verify()` triggers ZK proof flow in World App
- Verified humans stored on-chain via `verifyAndRegister()`
- **Files:** `contracts/world/CredentialGate.sol`, `src/app/api/verify-proof/route.ts`, `src/lib/world-id.ts`

### World — Best use of MiniKit 2.0 ($4k, 3 winners)
**Evidence:**
- Full Mini App built with `@worldcoin/minikit-js` and MiniKit React provider
- MiniKit commands: `verify`, `signTypedData`
- Mobile-optimized UI (375-428px viewport)
- **Files:** `src/app/layout.tsx` (MiniKit provider), all `src/app/(protected)/*` pages

### 0G — Best OpenClaw Agent on 0G ($6k, 3 winners)
**Evidence:**
- 4 OpenClaw agents with 0g-agent-skills (compute, storage, chain skills)
- GPU provider verification — first ERC-8004 Validation Registry use for compute verification
- Seer agent connected to 0G Compute for AI inference
- Agent state persistence via 0G Storage
- **Files:** `agents/openclaw.json`, `agents/.agents/*/soul.md`, `src/lib/og-broker.ts`, `src/lib/og-compute.ts`, `src/lib/og-storage.ts`

### 0G — Wildcard on 0G ($3k, 2 winners)
**Evidence:**
- Multi-resource marketplace (humans + GPUs + agents + DePIN) on 0G full stack
- Unified ERC-8004 identity across all resource types
- Resource prediction markets deployed on 0G Chain
- **Files:** `src/app/(protected)/home/*`, `src/components/ResourceCard.tsx`, `contracts/0g/ResourcePrediction.sol`

### Hedera — AI & Agentic Payments ($6k, 2 winners)
**Evidence:**
- Agent-to-agent USDC payments via x402 protocol through Blocky402 facilitator
- x402 middleware returns 402 Payment Required for unpaid queries
- USDC token: `0.0.429274` (Circle native on Hedera)
- $0.0001 gas per transaction
- **Files:** `src/lib/blocky402.ts`, `src/app/api/payments/route.ts`, `src/components/PaymentConfirmation.tsx`

### Hedera — No Solidity Allowed ($3k, 3 winners)
**Evidence:**
- ALL Hedera operations use `@hashgraph/sdk` (TypeScript) — zero Solidity on Hedera
- HTS: Non-transferable credential tokens (`TokenCreateTransaction`, `TokenMintTransaction`)
- HCS: Agent decision audit trail (`TopicCreateTransaction`, `TopicMessageSubmitTransaction`)
- 2+ native Hedera services (HTS + HCS + transfers)
- **Files:** `src/lib/hedera.ts`, `scripts/setup-hedera.ts`

### Hedera — Tokenization ($2.5k, 2 winners)
**Evidence:**
- HTS soulbound (non-transferable) credential tokens
- `freezeDefault: true` prevents token transfer
- Token represents verified credentials (GPU provider, World ID verified, etc.)
- Credential Token: `0.0.8499633` (VocaidCredential / VCRED)
- **Files:** `src/lib/hedera.ts`, `scripts/setup-hedera.ts`

---

## Deployed Contracts

### 0G Galileo (Chain ID 16602)
Explorer: https://chainscan-galileo.0g.ai

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0x0bd938c2021ba9de937b03f2a4ac793de453e993` |
| ReputationRegistry | `0x3a7d70e5037811aaf0ccc89d4180917a112f3eed` |
| ValidationRegistry | `0x345f915375d935298605888926429b9378bddebe` |
| GPUProviderRegistry | `0x9f522055c682237cf685b8214e1e6c233199abe4` |
| MockTEEValidator | `0x80597d12e953d7519a248c9eb750339b1c54fb34` |
| ResourcePrediction | `0x6ce572729a5cbc8aa9df7ac25d8076e80665194e` |

### World Sepolia (Chain ID 4801)

| Contract | Address |
|----------|---------|
| CredentialGate | `0x0AD24045c38Df31CE7fdBeba81F8774644ADEEd0` |

### Hedera Testnet
Explorer: https://testnet.hashscan.io

| Item | ID |
|------|-----|
| Operator Account | `0.0.8368570` |
| USDC Token | `0.0.429274` |
| Credential Token (VCRED) | `0.0.8499633` |
| Audit Trail Topic | `0.0.8499635` |
| Blocky402 Facilitator | `https://api.testnet.blocky402.com` |

---

## Innovation

**GPU Provider Verification on ERC-8004** — First implementation of ERC-8004's Validation Registry for GPU compute verification. Confirmed gap by 0G team: no existing tool verifies GPU providers on-chain. We wire TEE attestation (Intel TDX) to ERC-8004's `validationRequest/validationResponse` flow, making GPU providers discoverable, verified, and reputable on any EVM chain.

---

## Team
- Ale Fonseca — Architecture, full-stack development

## Links
- GitHub: [vocaid-hub repository]
- Demo Video: [link to 3-min recording]
- Live App: [deployment URL or localhost instructions]
