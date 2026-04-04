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
- Agent-to-agent messaging demo: Seer→Edge→Shield→Lens decision cycle (`scripts/demo-agent-fleet.ts`)
- **Files:** `src/lib/agentkit.ts`, `server/routes/agents.ts`, `scripts/register-agents.ts`, `scripts/demo-agent-fleet.ts`

### World — Best use of World ID 4.0 ($8k, 3 winners)
**Evidence:**
- World ID as hard gate for ALL resource access — product breaks without it
- CredentialGate.sol deployed on World Chain Sepolia
- `MiniKit.verify()` triggers ZK proof flow in World App
- Verified humans stored on-chain via `verifyAndRegister()`
- **Files:** `contracts/world/CredentialGate.sol`, `server/routes/world-id.ts`, `src/lib/world-id.ts`

### World — Best use of MiniKit 2.0 ($4k, 3 winners)
**Evidence:**
- Full Mini App built with `@worldcoin/minikit-js` and MiniKit React provider
- MiniKit commands: `verify`, `pay`, `signTypedData`
- `MiniKit.pay()` wired into marketplace hire flow with x402 fallback
- Mobile-optimized UI (375-428px viewport)
- **Files:** `src/app/layout.tsx` (MiniKit provider), `src/components/Pay/index.tsx`, `src/app/(protected)/home/marketplace-content.tsx`, all `src/app/(protected)/*` pages

### 0G — Best OpenClaw Agent on 0G ($6k, 3 winners)
**Evidence:**
- 4 OpenClaw agents with 0g-agent-skills (compute, storage, chain skills)
- GPU provider verification — first ERC-8004 Validation Registry use for compute verification
- Seer agent connected to 0G Compute for AI inference
- Agent state persistence via 0G Storage
- Edge agent trade execution with Shield clearance + HCS audit (`/api/edge/trade`)
- Seer agent 0G Compute inference with mock fallback (`/api/seer/inference`)
- **Files:** `agents/openclaw.json`, `agents/.agents/*/soul.md`, `src/lib/og-broker.ts`, `src/lib/og-compute.ts`, `src/lib/og-storage.ts`, `server/routes/edge.ts`, `server/routes/seer.ts`, `scripts/demo-agent-fleet.ts`

### 0G — Wildcard on 0G ($3k, 2 winners)
**Evidence:**
- Multi-resource marketplace (humans + GPUs + agents + DePIN) on 0G full stack
- Unified ERC-8004 identity across all resource types
- Resource prediction markets deployed on 0G Chain
- Retroactive reputation engine — scans 0G InferenceServing events to compute historical reputation for the entire existing provider ecosystem (8 providers, 239 txs, 6-signal composite scoring)
- Trading Desk — visual 5-step agent pipeline (Register → Shield → Lens → Seer → Edge) with real A2A calls
- **Files:** `src/app/(protected)/home/*`, `src/components/ResourceCard.tsx`, `src/components/TradingDesk.tsx`, `src/lib/retroactive-reputation.ts`, `contracts/0g/ResourcePrediction.sol`

### Hedera — AI & Agentic Payments ($6k, 2 winners)
**Evidence:**
- Agent-to-agent USDC payments via x402 protocol through Blocky402 facilitator
- x402 middleware returns 402 Payment Required for unpaid queries
- USDC token: `0.0.429274` (Circle native on Hedera)
- $0.0001 gas per transaction
- **Files:** `src/lib/blocky402.ts`, `server/routes/payments.ts`, `src/components/PaymentConfirmation.tsx`

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
| IdentityRegistry | `0xc16cf40a33e85f41bed6c90c710ff8c70b8c79ec` |
| ReputationRegistry | `0xa7ba63bce59d366a1c1b647e4ca75a5c11ca47f4` |
| ValidationRegistry | `0x629c61e5a8c78725c8e2cfc6d5b441a4bba0517c` |
| GPUProviderRegistry | `0x94f7d419dd3ff171cb5cd9291a510528ee1ada59` |
| MockTEEValidator | `0x8c4a192ed17dbbe2a7424c0008fafde89c730ccd` |
| ResourcePrediction | `0x82d5f12e55390016c49faab2ccb3c8d55d63fe7a` |
| AgentProposalRegistry | `0x4093025085ea8a3ef36cff0a28e6e7acdf356392` |
| HumanSkillRegistry | `0xcAc906DB5F68c45a059131A45BeA476897b6D2bb` |
| DePINRegistry | `0x1C7FB282c65071d0d5d55704E3CC3FE3C634fB35` |

### World Sepolia (Chain ID 4801)

| Contract | Address |
|----------|---------|
| CredentialGate | `0x6B927bA02FE8E5e15D5d5f742380A49876ad3E02` |

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
