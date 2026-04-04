# Vocaid Hub

![ETHGlobal Cannes 2026](https://img.shields.io/badge/ETHGlobal-Cannes%202026-blueviolet)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![World](https://img.shields.io/badge/World-ID%20%2B%20AgentKit%20%2B%20MiniKit-00C389)
![0G](https://img.shields.io/badge/0G-Chain%20%2B%20Compute%20%2B%20ERC--8004-purple)
![Hedera](https://img.shields.io/badge/Hedera-x402%20%2B%20HTS%20%2B%20HCS-2962FF)

**Reliable Resources for the Agentic Economy**

A protocol where verified humans and AI agents discover, verify, price, and trade ANY resource (human skills, GPU compute, agent capabilities, DePIN hardware) through ERC-8004 registries on 0G Chain, with x402 USDC payments on Hedera via Blocky402, HTS credential tokens, and HCS audit trail — all inside World App.

🌐 **Live Demo:** [vocaid-hub.vercel.app](https://vocaid-hub.vercel.app)

---

> **🤖 AGENTS:** Before starting ANY work, read [`docs/ACTIVE_WORK.md`](docs/ACTIVE_WORK.md)
> for current ownership claims. Check [`docs/PENDING_WORK.md`](docs/PENDING_WORK.md) for
> unclaimed tasks. Update both files before writing code.

---

## Value Proposition

- **First GPU verification on ERC-8004** — 0G developers confirmed this infrastructure gap (0 of 40+ projects in awesome-erc8004 have built it)
- **3-chain architecture:** World Chain (Trust) → 0G Chain (Verify) → Hedera (Settle) — each chain does what it's best at
- **OpenClaw 4-agent fleet** — Seer, Edge, Shield, Lens operate autonomously with ERC-8004 identities, all traceable to a verified human via World ID
- **x402 USDC micropayments** via Blocky402 on Hedera — agent-to-agent payments at $0.0001 gas per transaction

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        MINI APP (Next.js 15)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │    /     │ │/gpu-verify│ │/predictions│ │ /profile │            │
│  │Marketplace│ │GPU Portal│ │Pred Market│ │  My Hub  │            │
│  └────┬─────┘ └────┬─────┘ └────┬──────┘ └────┬─────┘            │
│       │             │            │              │                  │
│  ┌────┴─────────────┴────────────┴──────────────┴─────┐           │
│  │              API ROUTES (Next.js /api/)              │           │
│  │  /api/verify    /api/gpu     /api/predict  /api/agents│          │
│  └──────┬────────────┬────────────┬─────────────┬──────┘           │
└─────────┼────────────┼────────────┼─────────────┼─────────────────┘
          │            │            │             │
    ┌─────┴─────┐ ┌────┴────┐ ┌────┴────┐ ┌─────┴─────┐
    │  WORLD    │ │   0G    │ │ HEDERA  │ │ OPENCLAW  │
    │  CHAIN    │ │  CHAIN  │ │         │ │  GATEWAY  │
    │           │ │         │ │         │ │           │
    │CredGate  │ │ERC-8004 │ │x402/    │ │ Seer Edge │
    │.sol      │ │Identity │ │Blocky402│ │Shield Lens│
    │          │ │Reputation│ │         │ │           │
    │World ID  │ │Validation│ │HTS Cred │ │0G Compute │
    │AgentKit  │ │GPUProvReg│ │HCS Audit│ │0G Storage │
    └──────────┘ └─────────┘ └─────────┘ └───────────┘
```

### Chain Roles

| Chain | Role | What It Does |
|-------|------|-------------|
| **World Chain Sepolia** (4801) | Trust | World ID verification, CredentialGate, AgentKit registration |
| **0G Galileo** (16602) | Verify | ERC-8004 identity/reputation/validation registries, GPU provider verification, prediction markets |
| **Hedera Testnet** | Settle | x402 USDC payments via Blocky402, HTS credential tokens, HCS audit trail |

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | ^15.2.8 | App Router, SSR/ISR, API routes |
| Language | TypeScript | ^5 | Type-safe throughout |
| UI | Tailwind CSS | ^4 | Mobile-first responsive design |
| Auth | World ID + NextAuth | ^5.0.0-beta.25 | ZK proof verification, session management |
| World SDK | @worldcoin/minikit-js + minikit-react | latest | MiniKit commands (verify, pay, signTypedData) |
| 0G SDK | @0glabs/0g-serving-broker + 0g-ts-sdk | ^0.7.4 / ^0.3.3 | Compute broker, storage, chain interactions |
| Hedera SDK | @hashgraph/sdk + hedera-agent-kit | ^2.81.0 / ^3.8.2-rc.1 | HTS tokens, HCS topics, transfers |
| Smart Contracts | Solidity 0.8.24 + Hardhat | ^3.3.0 | ERC-8004 registries, CredentialGate, GPUProviderRegistry |
| Chain Interaction | ethers + viem | ^6.16.0 / 2.45.3 | Contract calls, transaction signing |

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **Foundry** (`forge`, `cast`) — [install](https://book.getfoundry.sh/getting-started/installation)
- **OpenClaw** — `npm install -g openclaw`

### Install

```bash
git clone https://github.com/Vocaid/vocaid-hub.git
cd vocaid-hub
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Fill in the private keys for each layer:

| Group | Variables | Notes |
|-------|----------|-------|
| **World (Trust)** | `WORLD_ID_PRIVATE_KEY`, `BETTER_AUTH_SECRET`, `RP_SIGNING_KEY` | World App ID and RP ID pre-filled |
| **0G (Verify)** | `PRIVATE_KEY`, `OG_BROKER_PRIVATE_KEY` | RPC + contract addresses pre-filled |
| **Hedera (Settle)** | `HEDERA_OPERATOR_KEY` | Operator ID, USDC token, Blocky402 pre-filled |
| **AgentKit** | `OPERATOR_WORLD_ID` | Your World ID nullifier hash |

### Deploy Contracts (optional — already deployed on testnets)

```bash
npx hardhat compile
npx tsx scripts/deploy-0g.ts         # 0G Galileo (Chain ID 16602)
npx tsx scripts/deploy-world.ts      # World Sepolia (Chain ID 4801)
npx tsx scripts/setup-hedera.ts      # Hedera Testnet (HTS + HCS)
npx tsx scripts/register-agents.ts   # Register 4 agents via AgentKit
```

### Seed Demo Data

```bash
npx tsx scripts/seed-demo-data.ts
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in World App or browser.

---

## API Routes

| Route | Method | Description | Chain |
|-------|--------|------------|-------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth session provider | — |
| `/api/verify-proof` | POST | Validate World ID ZK proof + CredentialGate tx | World |
| `/api/world-id/check` | GET | Check World ID verification status | World |
| `/api/rp-signature` | POST | Generate RP signature for World ID | World |
| `/api/gpu/register` | POST | Register GPU provider on ERC-8004 | 0G |
| `/api/gpu/list` | GET | List verified GPU providers | 0G |
| `/api/agents` | GET | List registered agents | 0G |
| `/api/agents/register` | POST | Register agent via AgentKit + ERC-8004 | 0G + World |
| `/api/predictions` | GET/POST | List or create prediction markets | 0G |
| `/api/predictions/[id]/bet` | POST | Place bet on prediction market | 0G |
| `/api/predictions/[id]/claim` | POST | Claim prediction market winnings | 0G |
| `/api/predictions/[id]/resolve` | POST | Resolve prediction market outcome | 0G |
| `/api/payments` | GET/POST | x402 USDC payments via Blocky402 | Hedera |
| `/api/initiate-payment` | POST | MiniKit payment initiation | Hedera |
| `/api/hedera/audit` | GET | Query HCS audit trail via Mirror Node | Hedera |
| `/api/seer/inference` | POST | Seer agent 0G Compute inference | 0G |
| `/api/reputation` | GET | Query ERC-8004 reputation scores | 0G |
| `/api/resources` | GET | Unified resource listing (all types) | 0G + Hedera |

---

## Deployed Contracts

### 0G Galileo (Chain ID 16602)

Explorer: [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai)

| Contract | Address |
|----------|---------|
| IdentityRegistry (proxy) | `0x0bd938c2021ba9de937b03f2a4ac793de453e993` |
| ReputationRegistry (proxy) | `0x3a7d70e5037811aaf0ccc89d4180917a112f3eed` |
| ValidationRegistry (proxy) | `0x345f915375d935298605888926429b9378bddebe` |
| IdentityRegistry (impl) | `0x92a3c59aee03e6ce5c2155fe0a2358b71a4ffe99` |
| ReputationRegistry (impl) | `0xe0c44f212aae8bb3534917ecb6f16c9f436b13f9` |
| ValidationRegistry (impl) | `0x3460c488c23b8c1fb983ffc1d412a8e0e0da1f87` |
| GPUProviderRegistry | `0x9f522055c682237cf685b8214e1e6c233199abe4` |
| MockTEEValidator | `0x80597d12e953d7519a248c9eb750339b1c54fb34` |
| ResourcePrediction | `0x6ce572729a5cbc8aa9df7ac25d8076e80665194e` |
| OG Inference Serving | `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E` |
| OG Ledger | `0xE70830508dAc0A97e6c087c75f402f9Be669E406` |

### World Chain Sepolia (Chain ID 4801)

| Contract | Address |
|----------|---------|
| CredentialGate | `0x0AD24045c38Df31CE7fdBeba81F8774644ADEEd0` |

### Hedera Testnet

Explorer: [testnet.hashscan.io](https://testnet.hashscan.io)

| Resource | ID |
|----------|----|
| Operator Account | `0.0.8368570` |
| VocaidCredential (VCRED) Token | `0.0.8499633` |
| Audit Trail Topic | `0.0.8499635` |
| USDC (Circle native) | `0.0.429274` |
| Blocky402 Facilitator | `https://api.testnet.blocky402.com` |

---

## Project Structure

```
vocaid-hub/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── layout.tsx          # Root layout + MiniKit provider
│   │   ├── page.tsx            # Landing page
│   │   ├── (protected)/        # Auth-gated routes (World ID required)
│   │   │   ├── home/           # Marketplace (ISR 30s)
│   │   │   ├── predictions/    # Prediction markets (ISR 10s)
│   │   │   └── profile/        # User profile + agent fleet (SSR)
│   │   ├── gpu-verify/         # GPU provider registration portal (SSR)
│   │   └── api/                # 18 server-side API routes
│   ├── lib/                    # Shared server utilities (14 files)
│   │   ├── hedera.ts           # @hashgraph/sdk wrapper
│   │   ├── hedera-agent.ts     # Hedera Agent Kit wrapper
│   │   ├── blocky402.ts        # x402 facilitator client
│   │   ├── og-chain.ts         # 0G Chain + ERC-8004
│   │   ├── og-compute.ts       # 0G inference broker
│   │   ├── og-broker.ts        # 0G broker types + helpers
│   │   ├── og-storage.ts       # 0G Storage KV persistence
│   │   ├── agentkit.ts         # World AgentKit registration
│   │   ├── world-id.ts         # World ID verification
│   │   ├── x402-middleware.ts   # x402 payment middleware
│   │   ├── reputation.ts       # ERC-8004 reputation queries
│   │   ├── prediction-math.ts  # Prediction market math
│   │   ├── contracts.ts        # ABIs + addresses
│   │   └── types.ts            # Shared TypeScript types
│   ├── components/             # React components
│   │   ├── ResourceCard.tsx    # Resource listing card
│   │   ├── PredictionCard.tsx  # Prediction market card
│   │   ├── GPUStepper.tsx      # GPU registration stepper
│   │   ├── CreateMarketModal.tsx # Prediction market creation
│   │   ├── PaymentConfirmation.tsx
│   │   ├── AgentCard.tsx       # OpenClaw agent card
│   │   └── Navigation/         # Bottom tab navigation
│   ├── auth/                   # NextAuth configuration
│   └── providers/              # React context providers
├── contracts/                  # Solidity (0G + World only)
│   ├── 0g/                     # ERC-8004 registries, GPUProviderRegistry
│   └── world/                  # CredentialGate.sol
├── agents/                     # OpenClaw agent configs
│   ├── openclaw.json           # Gateway configuration
│   ├── .agents/                # Agent soul files
│   └── skills/                 # Custom skills (5)
├── scripts/                    # Deploy + demo scripts
├── deployments/                # Contract addresses (JSON)
├── public/agent-cards/         # ERC-8004 A2A agent cards
└── docs/                       # 15+ planning documents
```

---

## Agent Fleet

Four OpenClaw agents operate autonomously with ERC-8004 identities on 0G Chain, each linked to a verified human via World ID `operator_world_id`.

| Agent | Role | Capabilities | A2A Card |
|-------|------|-------------|----------|
| 🔮 **Seer** | Signal Analyst | Data feed monitoring, trend detection, anomaly alerting | [`seer.json`](public/agent-cards/seer.json) |
| ⚡ **Edge** | Market Maker | Trade execution, price prediction, payment settlement | [`edge.json`](public/agent-cards/edge.json) |
| 🛡️ **Shield** | Risk Manager | TEE validation, reputation monitoring, risk gate enforcement | [`shield.json`](public/agent-cards/shield.json) |
| 🔍 **Lens** | Discovery | Agent indexing, metadata aggregation, ecosystem monitoring | [`lens.json`](public/agent-cards/lens.json) |

### Agent Skills

| Skill | File | Description |
|-------|------|------------|
| Nanopayments | [`agents/skills/nanopayments.md`](agents/skills/nanopayments.md) | x402 USDC micropayment execution |
| 0G Storage | [`agents/skills/og-storage.md`](agents/skills/og-storage.md) | Decentralized KV state persistence |
| Prediction | [`agents/skills/prediction.md`](agents/skills/prediction.md) | Resource pricing market participation |
| Reputation | [`agents/skills/reputation.md`](agents/skills/reputation.md) | ERC-8004 reputation score queries |
| Shield Check | [`agents/skills/shield-check.md`](agents/skills/shield-check.md) | TEE attestation + risk gate checks |

---

## Documentation Index

| Document | Content | Used By |
|----------|---------|---------|
| [`ACTIVE_WORK.md`](docs/ACTIVE_WORK.md) | WIP tracker, file ownership map, conflict prevention | ALL agents (read FIRST) |
| [`PENDING_WORK.md`](docs/PENDING_WORK.md) | Gap tracker, unclaimed tasks, priority levels | ALL agents |
| [`WAVE_EXECUTION_PLAN.md`](docs/WAVE_EXECUTION_PLAN.md) | 14-agent build plan, coordination protocol, demo script | All agents |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | 3-layer architecture, rendering strategy, chain details | All agents |
| [`TECHNOLOGY_RESEARCH.md`](docs/TECHNOLOGY_RESEARCH.md) | ERC-8004, OpenClaw, 0G, Hedera, x402, DCAP deep dive | Wave 1–3 |
| [`DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Color palette, typography, components, mobile constraints | UI agents |
| [`SCREEN_FLOW.md`](docs/SCREEN_FLOW.md) | 7 screen wireframes, architecture diagram, demo timing | UI agents |
| [`PARTNER_BOUNTIES.md`](docs/PARTNER_BOUNTIES.md) | All 12 ETHGlobal partner tracks with requirements | Wave 4 (submission) |
| [`PITCH_STRATEGY.md`](docs/PITCH_STRATEGY.md) | Slide deck, demo script, Q&A prep, booth pitches | Wave 4 (submission) |
| [`DEVELOPER_CONVERSATIONS.md`](docs/DEVELOPER_CONVERSATIONS.md) | Talking points for 0G, Hedera, World sponsor booths | Hour 0 meetings |
| [`OPENCLAW_RISK_ASSESSMENT.md`](docs/OPENCLAW_RISK_ASSESSMENT.md) | 5 attack surfaces, 9 CVEs, security hardening | Wave 1 (Agent 4) |
| [`MARKET_RISK_ASSESSMENT.md`](docs/MARKET_RISK_ASSESSMENT.md) | $7.6B market, 15 companies, SWOT analysis | Wave 4 (README) |
| [`STRATEGIC_ASSESSMENT.md`](docs/STRATEGIC_ASSESSMENT.md) | One-liner, partner selection, doc index | Overview |
| [`CURSOR_SETUP.md`](docs/CURSOR_SETUP.md) | Coding machine config: tools, MCP servers, deps | Machine setup |
| [`MINIKIT_SCAFFOLD.md`](docs/MINIKIT_SCAFFOLD.md) | Day 1 scaffold commands using World starter kit | Wave 1 (Agent 4) |
| [`PRE_HACKATHON_CHECKLIST.md`](docs/PRE_HACKATHON_CHECKLIST.md) | All pre-requisites (completed) | Before travel |

---

## ETHGlobal Tracks

Targeting **9 tracks** across **3 partners** ($50k accessible prize pool).

| Partner | Track | Prize | Key Requirement |
|---------|-------|-------|----------------|
| World | Best use of Agent Kit | $8k (3 winners) | AgentKit to distinguish human-backed agents from bots |
| World | Best use of World ID 4.0 | $8k (3 winners) | World ID as meaningful constraint (hard gate) |
| World | Best use of MiniKit 2.0 | $4k (3 winners) | Mini App with MiniKit SDK commands |
| 0G | Best OpenClaw Agent on 0G | $6k (3 winners) | OpenClaw + 0G infrastructure (Compute, Storage, Chain) |
| 0G | Wildcard on 0G | $3k (2 winners) | Creative project on 0G full stack |
| 0G | Best DeFi App on 0G | $6k (3 winners) | AI-native DeFi using Chain + Compute + Storage |
| Hedera | AI & Agentic Payments | $6k (2 winners) | AI agent executing payments on Hedera Testnet |
| Hedera | No Solidity Allowed | $3k (3 winners) | @hashgraph/sdk only, 2+ native services (HTS + HCS) |
| Hedera | Tokenization | $2.5k (2 winners) | Create/manage tokens with HTS on Hedera Testnet |

---

## License

MIT — see [`package.json`](package.json)

---

Built at **ETHGlobal Cannes 2026** by [Ale Fonseca](https://github.com/alefnsc).
