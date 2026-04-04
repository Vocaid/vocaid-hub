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
┌───────────────────────────────────────────────────────────────────────────────┐
│                         MINI APP (Next.js 15 :3000)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │    /     │ │/resources │ │/predict  │ │/agent-dec│ │ /profile │           │
│  │Marketplace│ │Resources │ │Pred Mkt  │ │Seer Flow │ │  My Hub  │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └─────────────┴────────────┴─────────────┴─────────────┘               │
│                              /api/* rewrite                                   │
└──────────────────────────────────┬────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴────────────────────────────────────────────┐
│                       FASTIFY BACKEND (:5001)                                 │
│  Zod validation · WASM singleton · Fastify plugins (auth, rate-limit, x402)  │
│  /api/verify  /api/gpu  /api/predictions  /api/agents  /api/payments  ...    │
└──────┬────────────┬────────────┬─────────────┬───────────────────────┬────────┘
       │            │            │             │                       │
 ┌─────┴─────┐ ┌────┴────┐ ┌────┴────┐ ┌─────┴─────┐          ┌─────┴─────┐
 │  WORLD    │ │   0G    │ │ HEDERA  │ │ OPENCLAW  │          │   PM2     │
 │  CHAIN    │ │  CHAIN  │ │         │ │  GATEWAY  │          │  Manager  │
 │           │ │         │ │         │ │  :18789   │          │           │
 │CredGate  │ │ERC-8004 │ │x402/    │ │ Seer Edge │          │ api       │
 │.sol      │ │Identity │ │Blocky402│ │Shield Lens│          │ next      │
 │          │ │Reputation│ │         │ │           │          │ claw      │
 │World ID  │ │Validation│ │HTS Cred │ │0G Compute │          │           │
 │AgentKit  │ │GPUProvReg│ │HCS Audit│ │0G Storage │          │           │
 └──────────┘ └─────────┘ └─────────┘ └───────────┘          └───────────┘
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
| Framework | Next.js + Fastify | ^15.2.8 / ^5 | Next.js SSR/ISR frontend, Fastify backend API |
| Process Manager | PM2 | ^5 | Multi-process management (api + next + claw) |
| Language | TypeScript | ^5 | Type-safe throughout |
| UI | Tailwind CSS | ^4 | Mobile-first responsive design |
| Auth | World ID + NextAuth | ^5.0.0-beta.25 | ZK proof verification, session management |
| World SDK | @worldcoin/minikit-js + minikit-react | latest | MiniKit commands (verify, pay, signTypedData) |
| 0G SDK | @0glabs/0g-serving-broker + 0g-ts-sdk | ^0.7.4 / ^0.3.3 | Compute broker, storage, chain interactions |
| Hedera SDK | @hashgraph/sdk + hedera-agent-kit | ^2.81.0 / ^3.8.2-rc.1 | HTS tokens, HCS topics, transfers |
| Smart Contracts | Solidity 0.8.24 + Hardhat | ^3.3.0 | ERC-8004 registries, CredentialGate, GPUProviderRegistry |
| Chain Interaction | ethers + viem | ^6.16.0 / 2.45.3 | Contract calls, transaction signing |
| Testing | vitest | ^4.1.2 | 125 tests across 12 test files |

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
| **Demo** | `DEMO_WALLET_KEY` | 2nd wallet for reputation feedback + multi-provider registration (avoids self-feedback restriction). |

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

### Run Agent Fleet Demo (optional)

```bash
npx tsx scripts/demo-agent-fleet.ts
```

### Run Development Server

```bash
# Option 1: PM2 (recommended — manages all 3 processes)
npm run dev:pm2        # Start api (:5001) + next (:3000) + claw (:18789)
npm run dev:logs       # Tail all logs (pm2 logs --lines 50)
npm run dev:stop       # Stop all processes

# Option 2: Individual processes
npm run dev:backend    # Fastify only (:5001)
npm run dev            # Next.js only (:3000)

# Option 3: Dev script (includes ngrok + health checks)
./scripts/dev.sh
```

Open [http://localhost:3000](http://localhost:3000) in World App or browser.
API health: `curl http://localhost:5001/health`

---

## API Routes (Fastify :5001)

All routes served by Fastify with Zod validation, proxied through Next.js rewrites (`/api/*` → `:5001`).

| Route | Method | Description | Chain |
|-------|--------|------------|-------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth session provider | — |
| `/api/verify-proof` | POST | Validate World ID ZK proof (v4 API) + CredentialGate tx + VCRED mint | World + Hedera |
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
| `/api/payments` | GET/POST | x402 USDC payments via Blocky402 + auto-feedback + HCS audit | Hedera + 0G |
| `/api/initiate-payment` | POST | MiniKit payment initiation | Hedera |
| `/api/hedera/audit` | GET | Query HCS audit trail via Mirror Node | Hedera |
| `/api/seer/inference` | POST | Seer agent 0G Compute inference | 0G |
| `/api/edge/trade` | POST | Edge agent trade execution + Shield clearance | 0G |
| `/api/reputation` | GET | Query ERC-8004 reputation scores | 0G |
| `/api/resources` | GET | Unified resource listing (all types) | 0G + Hedera |
| `/api/agent-decision` | GET | Seer agent GPU ranking + selection decision | 0G |
| `/api/activity` | GET | Live on-chain activity feed (reputation, trades, DePIN, skills, payments) | 0G + Hedera |
| `/api/proposals` | GET/POST | Agent prediction proposals — submit, approve, reject | 0G |
| `/api/agents/[name]/a2a` | GET/POST | A2A capability card + task execution per agent | 0G + Hedera |
| `/api/agents/[name]/mcp` | GET/POST | MCP tool schema + tool execution per agent | 0G + Hedera |

---

## Agent Access (A2A / Machine-to-Machine)

External AI agents can discover and transact with Vocaid Hub using standard HTTP — no SDK, no browser session required.

```bash
# 1. Discover agents (ERC-8004 standard path)
curl -s https://vocaid-hub.vercel.app/.well-known/agent-card.json | jq '.agents | length'
# → 4

# 2. Call Seer for AI inference (0G Compute)
curl -s -X POST https://vocaid-hub.vercel.app/api/seer/inference \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Analyze H100 GPU pricing trends"}'

# 3. Execute trade via Edge agent (Shield clearance + bet)
curl -s -X POST https://vocaid-hub.vercel.app/api/edge/trade \
  -H "Content-Type: application/json" \
  -d '{"marketId":0,"side":"yes","amount":"0.01","reason":"Seer signal"}'

# 4. Full demo: ./scripts/demo-agent-curl.sh
```

| Capability | Endpoint | Auth Required |
|-----------|----------|---------------|
| Agent discovery | `GET /.well-known/agent-card.json` | None |
| AI inference | `POST /api/seer/inference` | None |
| Trade execution | `POST /api/edge/trade` | None |
| x402 payment | `POST /api/payments` (with `X-PAYMENT` header) | x402 signed payload |
| Agent registration | `POST /api/agents/register` | World ID verified |
| Audit trail | `GET /api/hedera/audit` | None |

---

## Deployed Contracts

### 0G Galileo (Chain ID 16602)

Explorer: [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai)

| Contract | Address |
|----------|---------|
| IdentityRegistry (proxy) | `0xc16cf40a33e85f41bed6c90c710ff8c70b8c79ec` |
| ReputationRegistry (proxy) | `0xa7ba63bce59d366a1c1b647e4ca75a5c11ca47f4` |
| ValidationRegistry (proxy) | `0x629c61e5a8c78725c8e2cfc6d5b441a4bba0517c` |
| IdentityRegistry (impl) | `0xdfadbef62c82f7b16562f4b307c8c12fcfc6089f` |
| ReputationRegistry (impl) | `0x8993b2ad4f1f1719bfcc34d483ab62897776f92a` |
| ValidationRegistry (impl) | `0x72fac42905a66710e8493d6ab234adb8ba997369` |
| GPUProviderRegistry | `0x94f7d419dd3ff171cb5cd9291a510528ee1ada59` |
| MockTEEValidator | `0x8c4a192ed17dbbe2a7424c0008fafde89c730ccd` |
| ResourcePrediction | `0x82d5f12e55390016c49faab2ccb3c8d55d63fe7a` |
| AgentProposalRegistry | `0x4093025085ea8a3ef36cff0a28e6e7acdf356392` |
| HumanSkillRegistry | `0xcAc906DB5F68c45a059131A45BeA476897b6D2bb` |
| DePINRegistry | `0x1C7FB282c65071d0d5d55704E3CC3FE3C634fB35` |
| OG Inference Serving | `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E` |
| OG Ledger | `0xE70830508dAc0A97e6c087c75f402f9Be669E406` |

### World Chain Sepolia (Chain ID 4801)

| Contract | Address |
|----------|---------|
| CredentialGate | `0x6B927bA02FE8E5e15D5d5f742380A49876ad3E02` |

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
├── server/                     # Fastify backend (:5001) — all 25 API routes
│   ├── index.ts                # Fastify app + Zod provider + WASM init
│   ├── tsconfig.json           # Backend TS config
│   ├── plugins/                # Auth, World ID gate, rate-limit, error, x402, response-cache, security-headers
│   ├── schemas/                # Zod request/response validation
│   ├── utils/                  # Resilience: fetch-with-timeout, retry, circuit-breaker
│   ├── clients.ts              # Singleton ethers/viem client factories
│   ├── __tests__/              # 40 vitest tests (4 test files)
│   └── routes/                 # 15 route modules (25 endpoints)
├── ecosystem.config.cjs        # PM2 config (api + next + claw)
├── src/
│   ├── app/                    # Next.js 15 App Router (UI only — no API routes)
│   │   ├── layout.tsx          # Root layout + MiniKit provider
│   │   ├── page.tsx            # Landing page
│   │   └── (protected)/        # Auth-gated routes (World ID required)
│   │       ├── home/           # Marketplace (ISR 30s) — resource cards
│   │       ├── predictions/    # Prediction markets (ISR 10s) — page, loading, error
│   │       ├── agent-decision/ # Seer agent resource ranking (ISR 30s) — 4-step visual
│   │       ├── gpu-verify/     # Resources: Register + manage marketplace listings (SSR)
│   │       └── profile/        # Fleet-only: deploy private trading agents (SSR)
│   ├── types/                  # Shared TypeScript types (frontend + backend)
│   │   └── resource.ts         # ResourceCardProps, ResourceType, Chain, signals
│   ├── lib/                    # Shared server utilities (20 files)
│   │   ├── hedera.ts           # @hashgraph/sdk wrapper
│   │   ├── hedera-agent.ts     # Hedera Agent Kit wrapper
│   │   ├── blocky402.ts        # x402 facilitator client
│   │   ├── og-chain.ts         # 0G Chain + ERC-8004
│   │   ├── og-compute.ts       # 0G inference broker
│   │   ├── og-broker.ts        # 0G broker types + helpers
│   │   ├── og-storage.ts       # 0G Storage KV persistence
│   │   ├── agentkit.ts         # World AgentKit registration
│   │   ├── world-id.ts         # World ID verification
│   │   ├── reputation.ts       # ERC-8004 reputation queries
│   │   ├── prediction-math.ts  # Prediction market math
│   │   ├── contracts.ts        # ABIs + addresses
│   │   ├── cache.ts            # TTL cache + circuit breaker
│   │   ├── agent-router.ts     # Agent dispatch + rate limiter
│   │   ├── agents/             # Per-agent A2A + MCP handlers
│   │   │   ├── seer.ts         # Signal analysis (0G Compute)
│   │   │   ├── edge.ts         # Trade execution (signed payloads)
│   │   │   ├── shield.ts       # Risk management (validation)
│   │   │   └── lens.ts         # Discovery + reputation feedback
│   │   └── types.ts            # Shared TypeScript types
│   ├── components/             # React components
│   │   ├── ResourceCard.tsx    # Resource listing card
│   │   ├── PredictionCard.tsx  # Prediction market card
│   │   ├── SignalTicker.tsx    # 2-row auto-scrolling market signal ticker
│   │   ├── ActivityFeed.tsx    # Live activity feed with filter chips
│   │   ├── ResourceStepper.tsx  # Unified 3-step registration (GPU/Agent/Human/DePIN)
│   │   ├── CreateMarketModal.tsx # Prediction market creation
│   │   ├── ProposalQueue.tsx    # Agent prediction proposal approval queue
│   │   ├── PostHireRating.tsx   # Post-hire rating + prediction suggestion
│   │   ├── RegisterAgentModal.tsx # Agent registration (legacy, orphaned)
│   │   ├── PaymentConfirmation.tsx
│   │   ├── AgentCard.tsx       # OpenClaw agent card
│   │   ├── TradingDesk.tsx    # 5-step agent pipeline visualization
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
│   ├── deploy-0g.ts            # Deploy contracts to 0G Galileo
│   ├── deploy-world.ts         # Deploy CredentialGate to World Sepolia
│   ├── setup-hedera.ts         # Create HTS tokens + HCS topic
│   ├── register-agents.ts      # Register 4 agents via AgentKit
│   ├── seed-demo-data.ts       # Pre-populate demo state
│   ├── demo-flow.md            # 7-step demo walkthrough
│   ├── demo-agent-fleet.ts     # 4-agent decision cycle demo
│   └── demo-agent-curl.sh      # Agent accessibility demo (curl)
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

## Retroactive Reputation Engine

Vocaid doesn't just score new providers — it retroactively computes reputation for the **entire existing 0G provider ecosystem** by reading historical transaction data from the native InferenceServing contract.

```bash
npx tsx scripts/compute-retroactive-reputation.ts
```

**How it works:**
1. Scans `BalanceUpdated`, `RefundRequested`, and `ServiceUpdated` events from 0G's InferenceServing contract (last 2M blocks)
2. Discovers all providers with transaction history (8 found on testnet with 239 total transactions)
3. Computes 6 weighted reputation signals per provider: activity (25%), settlement health (20%), TEE compliance (15%), pricing competitiveness (15%), dispute rate (15%), longevity (10%)
4. Auto-registers unregistered providers into ERC-8004 IdentityRegistry
5. Writes composite scores to ReputationRegistry
6. Logs computation event to Hedera HCS audit trail

**Key files:** [`og-inference-serving.ts`](src/lib/og-inference-serving.ts) (event scanner), [`retroactive-reputation.ts`](src/lib/retroactive-reputation.ts) (signal computation), [`compute-retroactive-reputation.ts`](scripts/compute-retroactive-reputation.ts) (batch script)

See [`ARCHITECTURE.md`](docs/ARCHITECTURE.md#retroactive-reputation-engine) for the full signal breakdown and testnet data.

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
| [`SECURITY_ASSESSMENT.md`](docs/SECURITY_ASSESSMENT.md) | 15 findings across 7 contracts + 19 routes, mitigations applied | All agents |
| [`OPENCLAW_RISK_ASSESSMENT.md`](docs/OPENCLAW_RISK_ASSESSMENT.md) | 5 attack surfaces, 9 CVEs, security hardening | Wave 1 (Agent 4) |
| [`MARKET_RISK_ASSESSMENT.md`](docs/MARKET_RISK_ASSESSMENT.md) | $7.6B market, 15 companies, SWOT analysis | Wave 4 (README) |
| [`STRATEGIC_ASSESSMENT.md`](docs/STRATEGIC_ASSESSMENT.md) | One-liner, partner selection, doc index | Overview |
| [`CURSOR_SETUP.md`](docs/CURSOR_SETUP.md) | Coding machine config: tools, MCP servers, deps | Machine setup |
| [`MINIKIT_SCAFFOLD.md`](docs/MINIKIT_SCAFFOLD.md) | Day 1 scaffold commands using World starter kit | Wave 1 (Agent 4) |
| [`DEMO_RECORDING_SCRIPT.md`](docs/DEMO_RECORDING_SCRIPT.md) | Step-by-step demo video recording guide | Wave 4 (submission) |
| [`PRE_HACKATHON_CHECKLIST.md`](docs/PRE_HACKATHON_CHECKLIST.md) | All pre-requisites (completed) | Before travel |

---

## License

MIT — see [`package.json`](package.json)

---

Built at **ETHGlobal Cannes 2026** by [Ale Fonseca](https://github.com/alefnsc).
