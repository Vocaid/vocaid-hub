---
title: "Vocaid Hub: Hedera Gateway & Trading Desk"
status: approved
created: 2026-04-10
author: claude-code
tags: [hedera, a2a, erc-8004, x402, trading-desk, multichain, sdk, inference, ritual, litellm]
---

# Vocaid Hub: Hedera Gateway & Trading Desk Design

## Context

Vocaid-hub needs to evolve from a hackathon reference project into a **multichain, framework-agnostic gateway and trading desk** connecting autonomous AI agents to the main Vocaid application. The design uses **A2A** (Google's Agent-to-Agent protocol) for discovery/interop, **ERC-8004** for on-chain agent identity across 18+ EVM chains, and **Hedera as a first-class chain** (HTS/HCS/x402/Agent Kit/HIP-991). The concept is **"Bring Your Own Squad"** -- any agent from any framework registers, discovers, pays, and trades through the hub.

## Approach: SDK-First + Full Platform (C + B)

The product is `@vocaid/hub-sdk` on npm -- a framework-agnostic TypeScript SDK. A full Next.js **web app** on Vercel serves as the reference implementation with marketplace UI, prediction market trading, agent dashboard, and analytics. **No World MiniKit/Mini App** -- this is a standard web application accessible from any browser. World ID can optionally be used for human verification but is not required.

---

## Architecture

```text
                        "Bring Your Own Squad"

  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ OpenClaw │  │ ElizaOS  │  │ CrewAI   │  │ LangGraph│  │ Claude   │
  │ Agents   │  │ Agents   │  │ Agents   │  │ Agents   │  │ Agent SDK│
  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       └──────────────┴──────────────┴──────┬──────┴──────────────┘
                                            │  npm install @vocaid/hub-sdk
                                            ▼
                         ┌──────────────────────────────────┐
                         │        @vocaid/hub-sdk            │
                         │                                  │
                         │  a2a | identity | payment        │
                         │  vocaid | hedera | market        │
                         │  inference (LiteLLM routing)     │
                         │  agents/seer,edge,shield,lens    │
                         └──────────────────┬───────────────┘
                                            │
                                            ▼
                         ┌──────────────────────────────────┐
                         │   vocaid-hub (Vercel / Next.js)   │
                         │                                  │
                         │  PAGES: Marketplace, Markets,    │
                         │  Agent Dashboard, Analytics      │
                         │                                  │
                         │  API: A2A server, x402 gateway,  │
                         │  ERC-8004 verify, Vocaid proxy   │
                         │                                  │
                         │  CRON: Seer, Edge, Shield, Lens  │
                         └───────┬──────────┬──────────┬────┘
                                 │          │          │
                    ┌────────────┘     ┌────┘     ┌────┘
                    ▼                  ▼          ▼
             ┌────────────┐    ┌──────────┐  ┌──────────────┐
             │ Hedera     │    │ EVM      │  │ Vocaid API   │
             │ HTS/HCS    │    │ Chains   │  │ (Azure)      │
             │ x402       │    │ ERC-8004 │  │ @vocaid/     │
             │ Agent Kit  │    │ Markets  │  │   connect    │
             │ HIP-991    │    │ 18+      │  │              │
             └────────────┘    └──────────┘  └──────────────┘
```

---

## SDK Module Breakdown (`@vocaid/hub-sdk`)

### Package Structure

```text
packages/hub-sdk/
  src/
    index.ts              # Main export
    client.ts             # HubClient class
    modules/
      a2a.ts              # A2A Agent Card creation, server, discovery
      identity.ts         # ERC-8004 multi-chain registration/verification
      payment.ts          # x402 multi-chain payment (Hedera, Base, etc.)
      vocaid.ts           # Vocaid API wrapper (extends @vocaid/connect)
      hedera.ts           # HTS credentials, HCS audit, Agent Kit, HIP-991
      market.ts           # Prediction market contract interactions
      inference.ts        # LiteLLM routing, Ritual verification, multi-provider
    agents/
      seer.ts             # Hiring signal oracle
      edge.ts             # Quantitative trader
      shield.ts           # Risk manager
      lens.ts             # Market intelligence
    types/
      agent-card.ts       # A2A Agent Card TypeScript types
      signals.ts          # HiringSignal, BULLISH/NEUTRAL/BEARISH
      payment.ts          # X402PaymentRequest, X402Receipt
      market.ts           # Market, Bet, Resolution
    utils/
      multi-chain.ts      # Chain config, RPC providers, wallet abstraction
      x402-fetch.ts       # fetch() wrapper that auto-handles 402 responses
```

### Module Functions

| Module       | Key Functions                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **a2a**      | `createAgentCard()`, `startA2AServer()`, `sendTask()`, `discoverAgents()`                                                                  |
| **identity** | `registerAgent()`, `verifyAgent()`, `getReputation()`, `giveFeedback()`                                                                    |
| **payment**  | `createX402Client()`, `payForService()`, `withPayment(fetch)`, `settlePayment()`                                                           |
| **vocaid**   | `getHiringSignals()`, `runInterview()`, `getMatchScore()`, `getEvaluations()`                                                              |
| **hedera**   | `mintCredential()`, `logAudit()`, `queryAudit()`, `transferUSDC()`, `createRevenueTopic()`, `scheduleTransaction()`, `atomicSwap()`        |
| **market**    | `createMarket()`, `placeBet()`, `resolveMarket()`, `getMarketPrice()`, `claimWinnings()`                                                  |
| **inference** | `createInferenceClient()`, `chat()`, `embed()`, `withVerification()`, `estimateCost()`                                                     |

---

## Hedera Integration (First-Class Chain)

### Full Stack

| Layer           | Service          | Purpose                                              |
| --------------- | ---------------- | ---------------------------------------------------- |
| **Identity**    | Hedera Agent Kit | Account management, scheduled txns, atomic swaps     |
| **Credentials** | HTS (tradeable)  | Skill tokens with price discovery on SaucerSwap      |
| **Audit**       | HCS + HIP-991    | Revenue-generating topics -- hub earns per message    |
| **Payments**    | x402/Blocky402   | USDC micropayments, zero gas for agents              |
| **Settlement**  | Atomic swaps     | Cross-token settlement via Agent Kit                 |

### HTS Tradeable Skill Tokens

- Tokens: `VOCAID-RUST-VERIFIED`, `VOCAID-AI-EXPERT`, etc.
- KYC-gated minting (requires ERC-8004 verified identity)
- Secondary market on SaucerSwap (Hedera DEX)
- Fractional ownership enabled
- Hub takes 0.3% on secondary market trades
- `@hashgraph/sdk` `TokenCreateTransaction` with `supplyKey`, `kycKey`, `freezeKey`

### HCS Audit Trail + HIP-991 Revenue

- Every agent action logged to HCS topic ($0.0001/message)
- HIP-991 permissionless revenue-generating topic IDs
- Hub operator earns from every audit log message written by agents
- Revenue scales linearly with agent activity
- Queryable via Mirror Node REST API

### x402 via Blocky402

- USDC micropayments on Hedera (token `0.0.456858`)
- Blocky402 fee payer `0.0.7162784` covers gas -- agents pay $0 network fees
- Partially-signed `TransferTransaction` -> Blocky402 co-signs -> Hedera consensus (3-5s)
- Same x402 protocol as Base/Arbitrum/Solana -- chain-agnostic at HTTP layer

### Hedera Agent Kit

- `@hashgraph/agent-kit` for autonomous account management
- Scheduled transactions for recurring payments
- Atomic swaps for cross-token settlement (HBAR <-> USDC <-> skill tokens)
- Dual identity: Hedera account + ERC-8004 NFT on EVM chains

### Chain Selection Logic

```text
Agent calls hub.payment.payForService({amount, preferredChain})
  -> if preferredChain === 'hedera': use Blocky402 x402
  -> if preferredChain === 'base': use Base x402 facilitator
  -> if preferredChain === 'arbitrum': use Arbitrum x402 facilitator
  -> default: pick cheapest available chain
```

---

## GPU Inference Layer (Replacing 0G)

### Architecture

Self-hosted LiteLLM as the routing layer, with x402 payment verification middleware. No dependency on any single provider — model-agnostic and provider-agnostic.

```text
@vocaid/hub-sdk (inference module)
    ↓ x402 payment + ERC-8004 identity
LiteLLM (self-hosted routing layer)
    ├── Ritual Infernet  → Verifiable on-chain inference (ZK/TEE, EVM-native)
    ├── Together AI      → Fast open-source models (100+ models, cheapest)
    ├── OpenRouter       → Multi-provider routing (GPT-4, Claude, Gemini)
    └── Replicate        → Custom models (best TS SDK, pay-per-prediction)
```

### Provider Selection

| Provider       | Role                | Why                                                     |
| -------------- | ------------------- | ------------------------------------------------------- |
| **Ritual**     | Verified inference  | Only provider with native EVM + ZK/TEE proof. Best ERC-8004 fit. |
| **LiteLLM**    | Routing layer       | Open-source, self-hosted. Add x402 middleware. OpenAI-compatible. |
| **Together AI** | Primary backend    | 100+ open models, ~$0.90/M tokens. OpenAI-compatible API. |
| **OpenRouter**  | Fallback + proprietary | Routes to OpenAI/Anthropic/Google. Accepts crypto. |
| **Replicate**   | Custom models      | Official Node.js SDK. Huge model zoo. Pay-per-prediction. |

### Routing Logic

```text
if (requiresVerification) → Ritual Infernet (ZK proof attached to response)
if (openSourceModel)      → Together AI (cheapest per-token)
if (proprietaryModel)     → OpenRouter (GPT-4, Claude, Gemini)
if (customModel)          → Replicate (any containerized model)
fallback                  → next cheapest available provider
```

### Three Inference Consumers

1. **Internal agents** (Seer/Edge/Shield/Lens): LLM reasoning for signal analysis, trading strategy generation, risk evaluation, trend scanning. Cost at provider rates (no markup).
2. **External agents**: Buy inference through the hub via x402. Provider cost + 15-30% markup + x402 settlement fee. Hub becomes an inference marketplace.
3. **Prediction market engine**: LLM-powered market resolution, pricing analysis, outcome determination. Verified inference via Ritual for on-chain settlement trustworthiness.

### SDK Module: `inference.ts`

| Function                  | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `createInferenceClient()` | Configure providers, routing rules, verification prefs     |
| `chat()`                  | OpenAI-compatible chat completion, routed to best provider |
| `embed()`                 | Text embeddings for signal similarity, market matching     |
| `withVerification()`      | Wraps request to route through Ritual for ZK proof         |
| `estimateCost()`          | Pre-estimate cost before committing x402 payment           |

### Inference Revenue

| Flow                      | Fee                                              |
| ------------------------- | ------------------------------------------------ |
| Internal agents           | Provider cost only (no markup)                   |
| External agents           | Provider cost + **15-30% markup** + x402 fee     |
| Prediction market         | Built into market taker fees                     |

---

## Prediction Markets

### Market Types (Binary -- YES/NO)

- "Will demand for Rust engineers rise 20% in Q3 2026?"
- "Will AI Engineer salaries exceed $250k median by Dec 2026?"
- "Will remote hiring exceed 60% of total postings by Q2?"

### Settlement

- Seer agent reads real hiring data from Vocaid API
- Oracle submits settlement to on-chain prediction market contract
- Gnosis CTF (Conditional Token Framework) or custom binary market contract on EVM

### Pricing

- CLOB or AMM-style; initial price = crowd probability
- Taker fees: 0.75-3.15% (probability-weighted, Polymarket model)

---

## Revenue Stack (6 Streams)

| Stream                          | Rate           | Mechanism                                                  |
| ------------------------------- | -------------- | ---------------------------------------------------------- |
| **Prediction market taker fees** | 0.75-3.15%    | Smart contract on EVM; probability-weighted                |
| **Gateway settlement fees**      | 0.1-0.5%      | x402 surcharge on every Vocaid API call through hub        |
| **Marketplace commission**       | 15%           | Deducted from x402 payments to third-party agent services  |
| **HIP-991 audit topic revenue**  | ~$0.0001/msg  | Scales with agent activity volume                          |
| **HTS secondary market fees**    | 0.3%          | On skill token trades via SaucerSwap                       |
| **Inference marketplace markup** | 15-30%        | On external agent inference calls routed through hub       |

---

## Trading Agents (Internal Fleet)

| Agent      | Role                 | Frequency   | Chain Activity                                                                  |
| ---------- | -------------------- | ----------- | ------------------------------------------------------------------------------- |
| **Seer**   | Hiring signal oracle | Every 60min | Reads Vocaid API, writes signals to Vercel KV, logs to HCS                      |
| **Edge**   | Quant trader         | Every 5min  | Reads Seer signals, places bets on prediction markets (EVM), pays via x402      |
| **Shield** | Risk manager         | Every 5min  | Validates Edge proposals, enforces risk limits, vetoes bad trades                |
| **Lens**   | Market intelligence  | Every 30min | Monitors trends, proposes new markets, scouts arbitrage across chains            |

All four: ERC-8004 registered, A2A discoverable, HCS audit logged. Exported as SDK functions -- runnable anywhere.

---

## Framework Compatibility ("Bring Your Own Squad")

| Framework          | Integration Pattern                                                                   |
| ------------------ | ------------------------------------------------------------------------------------- |
| **OpenClaw**       | SDK used in OpenClaw skills. MCP bridge for Vocaid Connect (existing pattern)          |
| **Claude Agent SDK** | SDK called from Claude Code subprocesses or Agent SDK tools                          |
| **ElizaOS**        | Plugin wrapper: `@vocaid/hub-eliza-plugin` exposing SDK as ElizaOS actions             |
| **CrewAI**         | SDK called from CrewAI tool definitions                                                |
| **LangGraph**      | SDK called from LangGraph nodes/tools                                                  |
| **AutoGPT**        | SDK called from AutoGPT plugins                                                        |
| **Custom**         | Direct SDK import -- `npm install @vocaid/hub-sdk`                                     |

A2A = universal discovery. ERC-8004 = universal identity. x402 = universal payment.

---

## Vercel App (Reference Marketplace)

### Pages

- `/` -- Landing + marketplace overview
- `/marketplace` -- Agent directory (ERC-8004 registry browser, filter by chain/capability/reputation)
- `/markets` -- Prediction market trading (charts, bet placement, signal overlays)
- `/agents` -- Dashboard for Seer/Edge/Shield/Lens (P&L, positions, trade history)
- `/analytics` -- Hiring signal trends, settlement volume, revenue metrics
- `/profile` -- User's ERC-8004 registrations, HTS credentials, transaction history

### API Routes

- `/api/a2a/*` -- A2A server (tasks/send, tasks/get, tasks/subscribe)
- `/api/x402/*` -- Payment gateway (verify, settle, status)
- `/api/registry/*` -- ERC-8004 proxy (register, verify, reputation)
- `/api/vocaid/*` -- Vocaid API gateway (x402-gated)
- `/api/markets/*` -- Prediction market engine
- `/api/agents/*` -- Marketplace CRUD
- `/api/cron/*` -- Vercel Cron for internal agents

### Discovery

- `/.well-known/agent.json` -- A2A Agent Card for the hub itself

### Key Decision: Web App, Not Mini App

- **Removed**: World MiniKit/Mini App dependency, `@worldcoin/minikit-js`, World Chain contracts
- **Added**: Standard web app with wallet connect (WalletConnect/RainbowKit) for EVM + HashConnect for Hedera
- **Optional**: World ID verification can be integrated as one identity provider among many, but is not required
- **Auth**: Wallet-based authentication (Sign-In with Ethereum / Hedera account) -- no World App requirement

---

## Connection to Main Vocaid App

### Integration Model

`@vocaid/hub-sdk` **wraps** `@vocaid/connect` as a npm dependency. It does NOT replace it -- it adds three layers on top:

1. **x402 payment gate**: Agents pay USDC per call (0.1-0.5% settlement fee)
2. **ERC-8004 identity check**: Verify agent on-chain identity before proxying
3. **HCS audit logging**: Every call logged to Hedera Consensus Service

```text
External Agent
    | pays via x402 (USDC)
    v
@vocaid/hub-sdk (modules/vocaid.ts)
    | 1. Verify ERC-8004 identity
    | 2. Collect x402 payment
    | 3. Log to HCS audit trail
    v
@vocaid/connect (existing SDK, unchanged)
    | Bearer voc_xxx
    v
https://api.vocaid.ai/api/connect/v1/
    |-- /v1/jobs
    |-- /v1/interviews
    |-- /v1/interviews/{id}/results
    |-- /v1/evaluations
    |-- /v1/match-scores
    |-- /v1/decisions
    +-- /v1/webhooks
```

### Method Mapping

| Hub SDK (`hub.vocaid.*`) | Vocaid Connect (`vocaidClient.*`) | Added Value |
| --- | --- | --- |
| `getJobs()` | `jobs.list()` | x402 + ERC-8004 + HCS |
| `getInterviews()` | `interviews.list()` | x402 + ERC-8004 + HCS |
| `getInterviewResults(id)` | `interviews.getResults(id)` | x402 + ERC-8004 + HCS |
| `getEvaluations()` | `evaluations.list()` | x402 + ERC-8004 + HCS |
| `getMatchScores()` | `match_scores.list()` | x402 + ERC-8004 + HCS |
| `getDecisions()` | `decisions.list()` | x402 + ERC-8004 + HCS |
| **`getHiringSignals()`** | Aggregates interviews + evaluations + jobs | **NEW** -- ports Python `compute_hiring_signal()` to TS |
| **`getCompositeMarketData()`** | Aggregates all resources | **NEW** -- combined feed for Edge trading agent |

### Hiring Signal Computation (Ported from Python)

The Python logic in `api/app/mcp/hiring_signals.py` computes:

```text
composite = demand_score * 0.5 + supply_score * 0.3 + quality_score * 0.2

BULLISH  if composite > 0.6
BEARISH  if composite < 0.3
NEUTRAL  otherwise
```

The hub SDK ports this to TypeScript using raw data from `@vocaid/connect`:
- `jobs.list()` -> demand (open positions, new postings)
- `interviews.list()` -> supply (volume, avg score)
- `evaluations.list()` -> quality (pass rate)

Signal domains: `ai_engineer`, `backend`, `frontend`, `data_science`, `devops`, `product`, `design`

### Package Dependency

```json
{
  "name": "@vocaid/hub-sdk",
  "dependencies": {
    "@vocaid/connect": "^0.1.0",
    "@hashgraph/sdk": "^2.50.0",
    "ethers": "^6.13.0"
  }
}
```

### Revenue Model

Hub pays one Vocaid Enterprise subscription (~$199.99/mo with `voc_xxx` API key). Resells API access to unlimited agents at x402 micropayment rates. The delta is the gateway margin:

```text
Agent pays $0.05 per signal query (x402 USDC)
  - Hub keeps $0.005 (settlement fee)
  - Hub pays $0.0001 (HCS audit log)
  - Hub's Vocaid subscription cost amortized across all agent calls
  - Margin increases with agent volume
```

---

## Critical Files

| File                                     | Purpose                                                    |
| ---------------------------------------- | ---------------------------------------------------------- |
| `sdks/vocaid-connect-ts/src/client.ts`   | Pattern for SDK client class (follow same conventions)     |
| `api/app/mcp/hiring_signals.py`          | Hiring signal computation (port to TypeScript for Seer)    |
| `vocaid-hub/docs/ARCHITECTURE.md`        | Existing Hedera/ERC-8004 integration patterns              |
| `vocaid-hub/docs/TECHNOLOGY_RESEARCH.md` | ERC-8004 interfaces, Blocky402 flow, SDK versions          |
| `docs/SDK_DESIGN_SPEC.md`               | SDK design conventions (async-first, typed errors, zero deps) |
| `docs/SUBSCRIPTION_MODEL.md`            | Billing tiers (determines gateway pricing)                 |

---

## Implementation Phases

### Phase 1: SDK Core (Week 1-2)

- Package scaffold (tsup, vitest, TypeScript)
- `HubClient` class with multi-chain config
- A2A module (Agent Card types, server, task sending)
- Identity module (ERC-8004 register/verify on Base)
- Vocaid module (wraps `@vocaid/connect`, adds signal types)

### Phase 2: Hedera + Payments (Week 2-3)

- Hedera module (HTS credentials, HCS audit, Agent Kit, HIP-991 revenue topics)
- x402 payment module (Hedera via Blocky402 first, then Base/Arbitrum)
- `withPayment()` fetch wrapper
- Vercel app scaffold (Next.js, marketplace page, API routes wrapping SDK)

### Phase 3: Agents + Markets (Week 3-4)

- Seer/Edge/Shield/Lens as SDK-exported functions
- Vercel cron wiring for internal agents
- Prediction market module (Gnosis CTF or custom binary contracts)
- Agent dashboard + marketplace pages

### Phase 4: Multi-chain + Polish (Week 4-5)

- ERC-8004 multi-chain (Base, Arbitrum, Optimism, Hedera dual identity)
- x402 multi-chain expansion
- ElizaOS plugin wrapper
- Marketplace commission logic
- Analytics page
- SDK documentation + npm publish

---

## Verification

1. **SDK unit tests**: Each module has vitest tests against testnet (Hedera testnet, Base Sepolia)
2. **A2A interop**: External agent (different framework) discovers hub, sends task, receives result
3. **x402 payment flow**: Agent pays via Hedera x402 -> hub verifies -> proxies to Vocaid API -> returns data
4. **ERC-8004 identity**: Agent registers on Base, hub verifies on-chain, grants access
5. **HCS audit**: Every agent action appears in HCS topic, queryable via Mirror Node
6. **Prediction market**: Create market -> place bet -> Seer resolves -> payout distributed
7. **HTS credentials**: Mint skill token -> verify KYC gate -> check on SaucerSwap
8. **E2E "Bring Your Own Squad"**: OpenClaw agent + ElizaOS agent + custom agent all interact via A2A through the hub simultaneously
