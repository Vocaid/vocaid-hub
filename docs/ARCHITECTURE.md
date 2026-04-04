# Architecture — Vocaid Hub — Reliable Resources for the Agentic Economy

**Partners:** World ($20k) + 0G ($15k) + Hedera ($15k)
**Runtime:** Next.js 15 (unified — frontend + API routes + chain interactions)
**Language:** TypeScript throughout (no Python)
**Chains:** World Chain (Trust) + 0G Chain (Verify) + Hedera (Settle)

---

## Why One Runtime (No Python Backend)

3 of 5 core SDKs are TypeScript-only:

| SDK | TypeScript | Python |
|-----|-----------|--------|
| `@worldcoin/minikit-js` | ✅ Native | ❌ None |
| `@0glabs/0g-serving-broker` | ✅ Native | ❌ None |
| `@0glabs/0g-ts-sdk` | ✅ Native | ❌ None |
| `@hashgraph/sdk` | ✅ JS/TS | ✅ Python exists |
| `x402` | ✅ `@x402/fetch` | ✅ `pip install x402` |

A Python backend would need to shell out to Node.js for MiniKit, 0G broker, and 0G SDK. Next.js API routes run server-side with the same security model — private keys never reach the browser.

---

## Project Structure

```
vocaid-hub/
├── src/
│   ├── app/                   # Next.js 15 App Router
│   ├── layout.tsx             # Root layout with MiniKit provider
│   ├── page.tsx               # Landing / entry point
│   ├── (protected)/           # Auth-gated route group
│   │   ├── layout.tsx         # World ID session check
│   │   ├── home/
│   │   │   └── page.tsx       # Marketplace (ISR 30s)
│   │   ├── predictions/
│   │   │   └── page.tsx       # Prediction markets (ISR 10s)
│   │   ├── agent-decision/
│   │   │   └── page.tsx       # Seer agent GPU selection flow (ISR 30s)
│   │   └── profile/
│   │       └── page.tsx       # User profile + agent fleet (SSR)
│   ├── gpu-verify/
│   │   └── page.tsx           # GPU provider portal (SSR)
│   ├── .well-known/
│   │   └── agent-card.json/   # A2A agent card endpoint (ERC-8004)
│   └── api/                   # Server-side API routes (holds keys)
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts   # NextAuth session provider
│       ├── verify-proof/
│       │   └── route.ts       # World ID v4 proof validation + CredentialGate + VCRED mint
│       ├── world-id/
│       │   └── check/
│       │       └── route.ts   # World ID status check
│       ├── rp-signature/
│       │   └── route.ts       # RP signature for World ID
│       ├── gpu/
│       │   ├── register/
│       │   │   └── route.ts   # GPU provider ERC-8004 registration
│       │   └── list/
│       │       └── route.ts   # List verified providers
│       ├── payments/
│       │   └── route.ts       # Hedera x402 via Blocky402 + auto-feedback + HCS audit
│       ├── initiate-payment/
│       │   └── route.ts       # MiniKit payment initiation
│       ├── hedera/
│       │   └── audit/
│       │       └── route.ts   # HCS audit trail via Mirror Node
│       ├── seer/
│       │   └── inference/
│       │       └── route.ts   # Seer 0G Compute inference via broker SDK
│       ├── edge/
│       │   └── trade/
│       │       └── route.ts   # Edge agent trade execution + Shield clearance
│       ├── predictions/
│       │   ├── route.ts       # List/create markets
│       │   └── [id]/
│       │       ├── bet/
│       │       │   └── route.ts # Place bet
│       │       ├── claim/
│       │       │   └── route.ts # Claim winnings
│       │       └── resolve/
│       │           └── route.ts # Resolve market outcome
│       ├── agents/
│       │   ├── register/
│       │   │   └── route.ts   # AgentKit registration
│       │   └── route.ts       # List agents
│       ├── reputation/
│       │   └── route.ts       # Query reputation scores
│       ├── agent-decision/
│       │   └── route.ts       # Seer agent GPU ranking + selection
│       ├── resources/
│       │   └── route.ts       # Unified resource listing
│       └── agents/
��           └── [name]/
│               ├── a2a/
│               │   └── route.ts   # A2A capability card + task execution
│               └── mcp/
│                   └── route.ts   # MCP tool schema + tool execution
│
├── lib/                       # Shared server utilities
│   ├── hedera.ts              # @hashgraph/sdk wrapper (HTS, HCS, scheduled tx)
│   ├── hedera-agent.ts        # Hedera Agent Kit (HederaAIToolkit wrapper)
│   ├── blocky402.ts           # x402 facilitator client
│   ├── og-chain.ts            # 0G Chain interactions (ethers + ERC-8004)
│   ├── og-compute.ts          # 0G inference broker SDK
│   ├── og-broker.ts           # 0G broker types + helpers
│   ├── og-storage.ts          # 0G Storage KV for agent state
│   ├── agentkit.ts            # World AgentKit registration (ERC-8004)
│   ├── world-id.ts            # World ID verification + auth gate
│   ├── reputation.ts          # ERC-8004 ReputationRegistry queries
│   ├── prediction-math.ts    # Prediction market odds/payout calculations
│   ├── x402-middleware.ts     # x402 payment-gating wrapper for API routes
│   ├── contracts.ts           # Contract ABIs + addresses from deployments/
│   ├── cache.ts               # TTL cache + per-backend circuit breaker
│   ├── agent-router.ts        # Agent name validation, dispatch, rate limiter
│   ├── agents/                # Per-agent A2A + MCP handlers
│   │   ├── seer.ts            # Signal analysis (0G Compute inference)
│   │   ├── edge.ts            # Trade execution (signed payloads)
│   │   ├── shield.ts          # Risk management (validation + reputation)
│   │   └─��� lens.ts            # Discovery + reputation feedback
│   └── types.ts               # Shared TypeScript types
│
├── components/                # React components (see DESIGN_SYSTEM.md)
│   ├── AgentCard.tsx          # OpenClaw agent identity card
│   ├── AuthButton/            # World ID auth trigger
│   ├── ChainBadge.tsx         # World/0G/Hedera chain indicator
│   ├── CreateMarketModal.tsx  # Prediction market creation modal
│   ├── GPUStepper.tsx         # GPU provider registration stepper
│   ├── Navigation/            # Bottom tab navigation (World App)
│   ├── PageLayout/            # Page wrapper with header
│   ├── PaymentConfirmation.tsx # x402 payment receipt
│   ├── PredictionCard.tsx     # Prediction market card with bet UI
│   ├── ReputationBar.tsx      # ERC-8004 reputation score bar
│   ├── ResourceCard.tsx       # Resource listing card with chain badge
│   ├── ResourceCardSkeleton.tsx # Loading skeleton for ResourceCard
│   ├── VerificationStatus.tsx # TEE/World ID verification badge
│   └── Verify/               # MiniKit verify command wrapper
│
├── auth/                      # NextAuth configuration
│   ├── index.ts               # NextAuth + World App Wallet provider
│   └── wallet/                # SIWE helpers (client + server)
│
├── providers/                 # React context providers
│   └── index.tsx              # MiniKit + NextAuth + Eruda
│
├── public/                    # Static assets
│   └── agent-cards/           # ERC-8004 agent card JSONs
│       ├── seer.json
│       ├── edge.json
│       ├── shield.json
│       └── lens.json
│
├── contracts/                 # Solidity (0G Chain + World Chain ONLY)
│   ├── 0g/
│   │   ├── IdentityRegistryUpgradeable.sol
│   │   ├── ReputationRegistryUpgradeable.sol
│   │   ├── ValidationRegistryUpgradeable.sol
│   │   ├── GPUProviderRegistry.sol
│   │   ├── ResourcePrediction.sol
│   │   ├── MockTEEValidator.sol
│   │   ├── ERC1967Proxy.sol
│   │   └── interfaces/
│   │       ├── IIdentityRegistry.sol
│   │       ├── IReputationRegistry.sol
│   │       └── IValidationRegistry.sol
│   └── world/
│       ├── CredentialGate.sol
│       ├── IWorldID.sol
│       └── ByteHasher.sol
│
├── agents/                    # OpenClaw agent configs
│   ├── openclaw.json          # Gateway config
│   ├── .agents/
│   │   ├── seer/
│   │   │   ├── soul.md
│   │   │   └── skills/
│   │   ├── edge/
│   │   ├── shield/
│   │   └── lens/
│   └── skills/                # Custom skills (shared)
│       ├── nanopayments.md
│       ├── reputation.md
│       ├── prediction.md
│       ├── shield-check.md
│       └── og-storage.md
│
├── scripts/                   # Deployment + demo
│   ├── deploy-0g.ts           # Deploy contracts to 0G Galileo
│   ├── deploy-world.ts        # Deploy CredentialGate to World Sepolia
│   ├── register-agents.ts     # Register 4 agents via AgentKit + ERC-8004
│   ├── setup-hedera.ts        # Create HTS tokens + HCS topic
│   ├── seed-demo-data.ts      # Pre-populate demo state (GPU providers, markets, reputation)
│   ├── demo-flow.md           # 7-step demo walkthrough for presenters
│   ├── demo-agent-fleet.ts    # 4-agent autonomy demo (Seer→Edge→Shield→Lens)
│   └── dev.sh                 # Local dev startup (contracts + ngrok + Next.js)
│
├── deployments/               # Contract addresses (filled during Wave 1)
│   ├── 0g-galileo.json
│   ├── world-sepolia.json
│   └── hedera-testnet.json
│
├── hardhat.config.ts          # Multi-chain Hardhat config
├── .env.example               # Environment variables template
├── next.config.ts             # Next.js config with MiniKit
├── vitest.config.ts           # Test runner configuration
├── middleware.ts               # NextAuth session middleware
├── package.json
├── tsconfig.json
└── docs/                      # Planning documentation (this folder)
```

### No Solidity on Hedera

All Hedera operations use `@hashgraph/sdk` (TypeScript). Zero Solidity on Hedera. This qualifies for the "No Solidity Allowed" track ($3k, 3 winners).

Solidity contracts deploy to **0G Chain** and **World Chain** only.

---

## Next.js Rendering Strategy

| Route | Method | Revalidation | Data Source | Why |
|-------|--------|-------------|-------------|-----|
| `/` | **ISR** | 30 seconds | API route → 0G Chain (IdentityRegistry) | Resource list changes slowly |
| `/gpu-verify` | **SSR** | Every request | API route → 0G SDK (listService) | Must show live provider status |
| `/predictions` | **ISR** | 10 seconds | API route → 0G Chain (ResourcePrediction) | Near-real-time pool updates |
| `/profile` | **SSR** | Every request | API route → World Chain + 0G Chain | User-specific verified status |
| `/api/*` | **API Route** | N/A | Server-side, direct SDK calls | Holds keys, calls chains |

### Next.js Best Practices

| Practice | Implementation |
|----------|---------------|
| **Server Components** | Default for all pages. Client Components only for wallet connect, bet placement, MiniKit interactions |
| **Streaming** | `loading.tsx` per route for instant page shells |
| **Image optimization** | `next/image` for all images |
| **Error boundaries** | `error.tsx` per route with chain-specific error messages |
| **Server Actions** | For form submissions (GPU registration, bet placement) |
| **Route Handlers** | `/api/*` for chain interactions — server-side only |
| **Environment variables** | `NEXT_PUBLIC_*` for client, plain for server (API routes) |

### Client vs Server Split

| Layer | Runs On | Has Access To | Examples |
|-------|---------|--------------|---------|
| **Server Components** | Vercel Edge / Node | Everything (env vars, SDKs, chain RPCs) | Page data fetching, resource listing |
| **Client Components** | Browser | Only `NEXT_PUBLIC_*` vars, MiniKit, wallet | Wallet connect, MiniKit.verify(), bet forms |
| **API Routes** | Vercel Serverless | Everything (private keys, SDKs) | Chain writes, Hedera transactions, x402 payments |

**Private keys live in API routes (server-side).** Browser never sees them. Same security as a separate backend.

---

## Communication Flow

```
Browser (Client Components)         Vercel (Server)
┌─────────────────┐                ┌──────────────────────────┐
│                 │                │  Server Components       │
│  MiniKit        │                │  (fetch chain data)      │
│  .verify()      │                │                          │
│  .pay()         │                │  API Routes              │
│                 │   fetch()      │  ┌──────────────────────┐│
│  Wallet         │───────────────→│  │ /api/verify          ││
│  Connect        │←──────────────│  │  → World ID validate  ││
│                 │                │  │  → CredentialGate tx  ││
│  Form           │                │  │                      ││
│  Submissions    │                │  │ /api/gpu/register    ││
│                 │                │  │  → 0G SDK listService││
│                 │                │  │  → GPUProviderReg tx ││
│                 │                │  │  → IdentityReg tx    ││
│                 │                │  │                      ││
│                 │                │  │ /api/payments        ││
│                 │                │  │  → Blocky402 verify  ││
│                 │                │  │  → Hedera x402 settle││
│                 │                │  │  → HCS audit log     ││
│                 │                │  │                      ││
│                 │                │  │ /api/predictions     ││
│                 │                │  │  → ResourcePred tx   ││
│                 │                │  └──────────────────────┘│
│                 │                │                          │
│                 │                │  OpenClaw Gateway :18789 │
│                 │                │   Seer → 0G Compute     │
│                 │                │   Edge → predictions     │
│                 │                │   Shield → validation    │
│                 │                │   Lens → reputation      │
└─────────────────┘                └──────────────────────────┘
```

---

## Agent Registration Flow (Approach B)

### Why Human-in-the-Loop

1. World AgentKit track ($8k) requires proving human accountability
2. World ID track ($8k) requires World ID as meaningful constraint
3. Self-registering agents enable Sybil attacks
4. $16k depends on this design choice

### Flow

```
Step 1: Human verifies World ID (once)
  Browser → MiniKit.verify() → World App ZK proof
  Browser → POST /api/verify
  API Route → CredentialGate.verifyAndRegister(proof) → World Chain
  Result: nullifierHash stored, verifiedHumans[addr] = true

Step 2: Human registers agents (once per agent)
  API Route → AgentKit.register(agentWallet, operatorWorldId)
  API Route → IdentityRegistry.register(agentURI, metadata) → 0G Chain
  metadata = {
    operator_world_id: nullifierHash,
    role: "seer" | "edge" | "shield" | "lens",
    agentkit_id: "seer-01",
    type: "ai-agent"
  }
  Result: Agent gets ERC-8004 NFT on 0G Chain

Step 3: Agents operate autonomously
  OpenClaw Gateway runs locally alongside Vercel dev server
  All agent actions traceable to verified human via operator_world_id
```

### No Additional World Chain Contract Needed

`CredentialGate.sol` handles both human verification and the anchor for agent-to-human linkage. The ERC-8004 metadata on 0G Chain stores `operator_world_id_hash` linking back to the verified human.

---

## Reputation Signal System

### 7 Signal Types (ERC-8004 ReputationRegistry)

| Signal | tag1 | tag2 | Unit | Applies To |
|--------|------|------|------|-----------|
| **Cost Efficiency** | `cost` | `per-token` / `per-hour` | $ | GPU, Human, Agent |
| **Latency** | `latency` | `p50` / `p99` | ms | GPU, Agent |
| **Uptime** | `uptime` | `30d` | % | GPU, DePIN |
| **Processing Power** | `compute` | `flops` / `context-window` | TFLOPS / tokens | GPU |
| **Region** | `region` | `eu` / `us` / `asia` | 0-100 score | GPU, DePIN |
| **Quality** | `quality` | `overall` | 0-100 | Human, Agent, GPU |
| **Availability** | `schedule` | `timezone` / `hours` | UTC offset | Human, DePIN |

### Signal Producers (Who Writes)

| Producer | Signals | Method |
|----------|---------|--------|
| **Lens Agent** | latency, uptime, quality | Periodic heartbeat inference → measure → `giveFeedback()` |
| **Edge Agent** | cost | Reads `getServiceMetadata()` → writes cost/per-token |
| **Shield Agent** | uptime (outage) | Monitors health → flags outages |
| **Users** (post-hire) | quality | After hire completes → rate quality |
| **0G SDK** | compute specs | `verifyService()` → hardware capabilities |

### Signal Consumers (Who Reads)

| Consumer | Query | Use |
|----------|-------|-----|
| **Agents** (A2A/MCP) | `getSummary(agentId, [], "latency", "p50")` | Pick lowest latency provider |
| **Humans** (UI) | `GET /api/resources?sort=cost` | Browse resources sorted by signals |
| **Seer Agent** | All reputation data | Generate fair pricing for prediction markets |

### Agent-to-Agent Signal Flow

```
Seer                    Shield                  Edge                    Lens
  │                       │                       │                       │
  │ 1. Detect signal      │                       │                       │
  │ (0G inference +       │                       │                       │
  │  reputation reads)    │                       │                       │
  ├──agentToAgent─────────│                       │                       │
  │  {signal, confidence} │                       │                       │
  │                       │ 2. Risk check         │                       │
  │                       │ (ValidationRegistry)  │                       │
  │                       │ (ReputationRegistry)  │                       │
  │                       ├──agentToAgent─────────│                       │
  │                       │  {approved/denied}    │                       │
  │                       │                       │ 3. Execute            │
  │                       │                       │ (predict/pay/hire)    │
  │                       │                       │                       │
  │                       │                       │                       │ 4. Observe + record
  │                       │                       │                       │ (measure quality)
  │                       │                       │                       │ (giveFeedback())
```

### Agent Security Model (Wallet Key Isolation)

| Agent | Role | Has Wallet Key? | Has Hedera Key? | Can Sign? |
|-------|------|----------------|-----------------|-----------|
| **Seer** | Signal analysis (read-only) | ❌ | ❌ | No — reads only |
| **Edge** | Payments + trades | ✅ | ✅ | Yes — only agent with payment authority |
| **Shield** | Risk validation (read-only) | ❌ | ❌ | No — reads only |
| **Lens** | Reputation writer | ✅ (0G only) | ❌ | Limited — writes reputation to 0G Chain only |

If Seer or Shield is compromised, the attacker gets read access to chain data but **cannot sign transactions or move funds**. Only Edge compromise enables financial loss. Lens compromise enables fake reputation writes (mitigated by reputation filtering by reviewer address).

---

## On-Chain vs Off-Chain Data

### On-Chain (Permanent, Verifiable)

| Data | Chain | Contract/Service |
|------|-------|-----------------|
| Agent/provider identity | 0G | ERC-8004 IdentityRegistry |
| Reputation scores | 0G | ERC-8004 ReputationRegistry |
| TEE validation results | 0G | ERC-8004 ValidationRegistry |
| GPU provider registration | 0G | GPUProviderRegistry |
| Prediction market state | 0G | ResourcePrediction.sol |
| World ID verification | World | CredentialGate.sol |
| HTS credential tokens | Hedera | HTS (via @hashgraph/sdk) |
| HCS audit trail | Hedera | HCS (via @hashgraph/sdk) |
| x402 USDC settlements | Hedera | TransferTransaction (via Blocky402) |

### Off-Chain (Ephemeral or Too Large)

| Data | Storage | Why Off-Chain |
|------|---------|-------------|
| Agent card JSON | `public/agent-cards/` on Vercel | ERC-8004 agentURI points here |
| TEE attestation bundle | IPFS or 0G Storage | Too large (~2-4KB), hash on-chain |
| Agent session state | 0G Storage KV | Decentralized but not on-chain |
| User session | In-memory (API route) | Ephemeral after World ID verify |
| ISR cache | Vercel Edge | Marketplace data cached 30s |
| Demo seed data | JSON files in repo | Pre-populated for demo |

No traditional database. No Redis. No Postgres.

---

## Hedera Integration Details

### Blocky402 x402 Facilitator (VERIFY AT VENUE — ask Hedera sponsor)

| Config | Value |
|--------|-------|
| **Facilitator URL** | `https://api.testnet.blocky402.com` |
| **Network ID** | `hedera-testnet` |
| **Fee Payer** | `0.0.7162784` (Blocky402 pays gas) |
| **USDC Token** | `0.0.429274` (native Circle USDC on Hedera) |
| **Endpoints** | `/supported`, `/verify`, `/settle` (need live verification) |
| **API Key** | None required (open access) |

### Hedera SDK Operations (TypeScript — No Solidity)

| Operation | SDK Method | Track |
|-----------|-----------|-------|
| Create credential token | `new TokenCreateTransaction()` | Tokenization + No Solidity |
| Grant KYC | `new TokenGrantKycTransaction()` | Tokenization |
| Mint credential | `new TokenMintTransaction()` | Tokenization |
| Freeze credential | `new TokenFreezeTransaction()` | Tokenization |
| Create audit topic | `new TopicCreateTransaction()` | No Solidity |
| Log agent decision | `new TopicMessageSubmitTransaction()` | No Solidity |
| Query audit trail | Mirror Node REST API | No Solidity |
| x402 USDC payment | `TransferTransaction` via Blocky402 | AI/Agentic |

---

## WIP Boundaries (Agent Conflict Prevention)

### Directory-Level Ownership

| Directory | Agents | Language | Never Touch |
|-----------|--------|----------|------------|
| `app/` (pages) | 4 (scaffold), 7 (marketplace), 13 (polish) | TSX | `contracts/`, `agents/` |
| `app/api/` (routes) | 2, 3, 5, 6, 8, 9, 10 | TS | `components/`, `contracts/` |
| `lib/` | 3, 8 (create), 9-10 (extend) | TS | `components/`, `contracts/` |
| `components/` | 7 (create), 9-10 (add), 13 (polish) | TSX | `app/api/`, `contracts/`, `agents/` |
| `contracts/` | 1, 5 | Solidity | Everything else |
| `agents/` | 4, 8, 11 | OpenClaw | `app/`, `contracts/` |
| `deployments/` | 1, 2, 3, 5 (write), all (read) | JSON | — |
| `scripts/` | 1, 2, 3, 12 | TS | `app/`, `components/` |

### Shared Files (Claim in ACTIVE_WORK.md First)

| File | Primary Owner | May Extend |
|------|--------------|-----------|
| `lib/hedera.ts` | Agent 3 (Wave 1) | Agents 9, 11 (Wave 3) |
| `lib/og-chain.ts` | Agent 8 (Wave 2) | Agents 5, 11 (Wave 2-3) |
| `lib/contracts.ts` | Agent 1 (Wave 1) | Agents 5, 10 (Wave 2-3) |
| `package.json` | Agent 4 (Wave 1) | Any agent adding deps |

---

## Key Addresses (All Deployed — April 3-4, 2026)

### Wallet
| Item | Value |
|------|-------|
| Deployer (EVM) | `0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE` |
| Hedera Operator | `0.0.8368570` |

### World Chain Sepolia (chainId 4801)
| Contract | Address |
|----------|---------|
| CredentialGate | `0x0AD24045c38Df31CE7fdBeba81F8774644ADEEd0` |

### 0G Galileo (chainId 16602)
| Contract | Address |
|----------|---------|
| IdentityRegistry (proxy) | `0x0bd938c2021ba9de937b03f2a4ac793de453e993` |
| ReputationRegistry (proxy) | `0x3a7d70e5037811aaf0ccc89d4180917a112f3eed` |
| ValidationRegistry (proxy) | `0x345f915375d935298605888926429b9378bddebe` |
| GPUProviderRegistry | `0x9f522055c682237cf685b8214e1e6c233199abe4` |
| MockTEEValidator | `0x80597d12e953d7519a248c9eb750339b1c54fb34` |
| ResourcePrediction | `0x6ce572729a5cbc8aa9df7ac25d8076e80665194e` |
| 0G Inference Serving (external) | `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E` |
| 0G Ledger (external) | `0xE70830508dAc0A97e6c087c75f402f9Be669E406` |

### Hedera Testnet
| Resource | ID |
|----------|-----|
| HTS Credential Token (VCRED) | `0.0.8499633` |
| HCS Audit Topic | `0.0.8499635` |
| USDC | `0.0.429274` |
| Blocky402 Facilitator | `https://api.testnet.blocky402.com` |
| Blocky402 Fee Payer | `0.0.7162784` |

### Other
| Item | Value |
|------|-------|
| World APP_ID | `app_74d7b06d88b9e220ad1cc06e387c55f3` |
| World RP_ID | `rp_21826eb5449cc811` |
| Vercel URL | `https://vocaid-hub.vercel.app` |

### Seed Data (On-Chain)
| Item | Count | IDs |
|------|-------|-----|
| ERC-8004 Identities | 6 | #25-30 (GPU-Alpha, GPU-Beta, Seer, Edge, Maria, Carlos) |
| GPU Providers | 1 (Alpha registered) | Via GPUProviderRegistry |
| Prediction Markets | 2 | #9, #10 |
| Reputation Entries | 3 | GPU-Alpha: quality 87, uptime 99.2%, latency 120ms |
| TEE Validations | 1 | GPU-Alpha via MockTEEValidator |