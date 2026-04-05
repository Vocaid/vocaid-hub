# Architecture — Vocaid Hub — Reliable Resources for the Agentic Economy

**Partners:** World ($20k) + 0G ($15k) + Hedera ($15k)
**Runtime:** Next.js 15 (frontend/SSR) + Fastify 5 (backend API :5001) — managed by PM2
**Language:** TypeScript throughout (no Python)
**Chains:** World Chain (Trust) + 0G Chain (Verify) + Hedera (Settle)

---

## Two-Process Architecture (Next.js + Fastify)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Next.js    │     │  Fastify     │     │  OpenClaw    │
│  :3000      │────▶│  :5001       │     │  :18789      │
│  (frontend) │     │  (backend)   │     │  (agents)    │
│  SSR + UI   │     │  All /api/*  │     │  Soul + Skills│
└─────────────┘     └──────────────┘     └──────────────┘
      │                    │                     │
      └────────────────────┼─────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         World Chain    0G Chain    Hedera
         (Trust)        (Verify)    (Settle)
```

**Why split?** World ID WASM (`@worldcoin/minikit-js`) and chain SDK initialization are expensive in serverless cold starts. Fastify runs as a persistent process with singletons initialized once at startup. PM2 manages all three processes with autorestart, merged logs, and health monitoring.

**Proxy:** `next.config.ts` rewrites `/api/*` and `/.well-known/*` to Fastify :5001 transparently — the browser never talks to :5001 directly.

3 of 5 core SDKs are TypeScript-only, so both processes share the same language:

| SDK | TypeScript | Python |
|-----|-----------|--------|
| `@worldcoin/minikit-js` | ✅ Native | ❌ None |
| `@0glabs/0g-serving-broker` | ✅ Native | ❌ None |
| `@0glabs/0g-ts-sdk` | ✅ Native | ❌ None |
| `@hashgraph/sdk` | ✅ JS/TS | ✅ Python exists |
| `x402` | ✅ `@x402/fetch` | ✅ `pip install x402` |

---

## Project Structure

```
vocaid-hub/
├── server/                    # Fastify backend (:5001) — all API routes
│   ├── index.ts               # Fastify app + Zod provider + WASM init
│   ├── tsconfig.json          # Backend TS config (extends root)
│   ├── plugins/               # Fastify plugins (auth, world-id-gate, rate-limit, error, x402, response-cache, security-headers)
│   ├── schemas/               # Zod request/response schemas
│   ├── utils/                 # Resilience utilities (fetch-with-timeout, retry, circuit-breaker)
│   ├── clients.ts             # Singleton chain client factories (ethers + viem)
│   ├── __tests__/             # vitest tests (4 files, 34 tests)
│   └── routes/                # Route handlers (25 endpoints)
│       ��── world-id.ts        # /api/rp-signature, /api/verify-proof, /api/world-id/check
│       ├── auth.ts            # /api/auth/* (session from JWT)
│       ├─�� predictions.ts     # /api/predictions CRUD + bet/claim/resolve
│       ├── gpu.ts             # /api/gpu/list, /api/gpu/register
│       ├── edge.ts            # /api/edge/trade
│       ├── seer.ts            # /api/seer/inference
│       ├── reputation.ts      # /api/reputation GET/POST
│       ├── agents.ts          # /api/agents, register, A2A, MCP
│       ├── payments.ts        # /api/payments, /api/initiate-payment
│       ├── resources.ts       # /api/resources (unified listing)
│       ├── activity.ts        # /api/activity (on-chain feed)
│       ├── hedera.ts          # /api/hedera/audit
│       ├── proposals.ts       # /api/proposals
│       ├── agent-decision.ts  # /api/agent-decision
│       └── well-known.ts      # /.well-known/agent-card.json
├── ecosystem.config.cjs       # PM2 process config (api + next + claw)
├── src/
│   ├── app/                   # Next.js 15 App Router (UI only — no API routes)
│   │   ├── layout.tsx         # Root layout with MiniKit provider
│   │   ├── page.tsx           # Landing / entry point
│   │   └── (protected)/       # Auth-gated route group
│   │       ├── layout.tsx     # World ID session check
│   │       ├── home/          # Marketplace (ISR 30s)
│   │       ├── predictions/   # Prediction markets (ISR 10s)
│   │       ├── agent-decision/# Seer agent GPU selection flow (ISR 30s)
│   │       ├── gpu-verify/    # Resources: Register + manage marketplace listings (SSR)
│   │       └── profile/       # Connect Your Agent: API key + chain config (SSR)
│   ├── types/                 # Shared TypeScript types
│   │   └── resource.ts        # ResourceCardProps, ResourceType, Chain, signals
│   ├── lib/                   # Shared server utilities (used by both Next.js + Fastify)
│   │   ├── hedera.ts          # @hashgraph/sdk wrapper (HTS, HCS, scheduled tx)
│   │   ├── hedera-agent.ts    # Hedera Agent Kit wrapper
│   │   ├── blocky402.ts       # x402 facilitator client
│   │   ├── og-chain.ts        # 0G Chain interactions (ethers + ERC-8004)
│   │   ├── og-compute.ts      # 0G inference broker SDK
│   │   ├��─ og-broker.ts       # 0G broker types + helpers
│   │   ├── og-storage.ts      # 0G Storage KV for agent state
│   │   ├── agentkit.ts        # World AgentKit registration (ERC-8004)
│   │   ├── world-id.ts        # World ID verification (chain logic only)
│   │   ├── reputation.ts      # ERC-8004 ReputationRegistry queries
│   │   ├── prediction-math.ts # Prediction market odds/payout calculations
│   │   ├── contracts.ts       # Contract ABIs + addresses from deployments/
│   │   ├── cache.ts           # TTL cache + per-backend circuit breaker
│   │   ├── agent-router.ts    # Agent name validation, dispatch, rate limiter
│   │   ├── agents/            # Per-agent A2A + MCP handlers
│   │   │   ├── seer.ts        # Signal analysis (0G Compute inference)
│   │   │   ├── edge.ts        # Trade execution (signed payloads)
│   ���   │   ├── shield.ts      # Risk management (validation + reputation)
│   │   │   └── lens.ts        # Discovery + reputation feedback
│   │   └── types.ts           # Shared TypeScript types
│   ├── components/            # React components (see DESIGN_SYSTEM.md)
│   │   ├── ResourceCard.tsx   # Resource listing card with chain badge
│   ���   ├── PredictionCard.tsx # Prediction market card with bet UI
│   ��   ├── SignalTicker.tsx   # 2-row auto-scrolling market signal ticker
│   │   ├── ActivityFeed.tsx   # Live activity feed with filter chips
���   │   ├── ResourceStepper.tsx# Unified 3-step registration
│   │   ├── WorldIdGateModal.tsx# Informational World ID verification gate modal
│   │   ├── ProposalQueue.tsx  # Agent prediction proposal approval queue
│   │   ├── PostHireRating.tsx # Post-hire rating + prediction suggestion
│   │   ��── AgentCard.tsx      # OpenClaw agent identity card
│   │   ├── TradingDesk.tsx    # 5-step agent pipeline visualization
│   │   └── Navigation/       # Bottom tab navigation (World App)
│   ├── hooks/                 # React hooks
│   │   └── useWorldIdGate.ts  # World ID verification via MiniKit + address book contract
│   ├── auth/                  # NextAuth configuration
│   └── providers/             # React context providers
├── contracts/                 # Solidity (0G Chain + World Chain ONLY)
│   ├── 0g/                    # ERC-8004 registries, GPUProviderRegistry
│   └── world/                 # CredentialGate.sol
├── agents/                    # OpenClaw agent configs
│   ├── openclaw.json          # Gateway config
│   ├── .agents/               # Agent soul files (seer, edge, shield, lens)
│   └── skills/                # Custom skills (5)
├── scripts/                   # Deployment + demo
│   ├── dev.sh                 # Local dev startup (PM2 + ngrok)
│   ���── deploy-0g.ts           # Deploy contracts to 0G Galileo
│   ├── deploy-world.ts        # Deploy CredentialGate to World Sepolia
│   ├── setup-hedera.ts        # Create HTS tokens + HCS topic
│   ├── seed-demo-data.ts      # Pre-populate demo state
│   └── demo-agent-fleet.ts    # 4-agent autonomy demo
├── deployments/               # Contract addresses (JSON)
├── public/agent-cards/        # ERC-8004 A2A agent cards
├── hardhat.config.ts          # Multi-chain Hardhat config
├── next.config.ts             # Next.js config + /api/* rewrite to Fastify
├── ecosystem.config.cjs       # PM2 process management
├── vitest.config.ts           # Test runner configuration
├── middleware.ts              # NextAuth session middleware
├── package.json
├── tsconfig.json
└── docs/                      # Planning documentation
```

### Settlement Architecture (Chain-Agnostic)

Users always pay USDC via MiniKit on World Chain. The server resolves settlement to the destination chain via `server/utils/settle.ts`:

```
User (World App)
  └─ MiniKit.pay() → USDC transfer to deployer on World Chain
       └─ Server settle() resolver
            ├─ chain: 'hedera' → x402/Blocky402 (leases, resource payments)
            ├─ chain: '0g'     → deployer wallet places A0GI tx (prediction bets)
            └─ chain: 'world'  → direct USDC (future)
```

- **Deployer wallet** funds native token operations (A0GI for bets, HBAR gas for leases)
- **No bridges** — the application layer coordinates cross-chain settlement
- **Users never see** native tokens (A0GI, HBAR) — always USDC
- **HCS audit** logs all settlements to Hedera topic via `logSettlement()`

### No Solidity on Hedera

All Hedera operations use `@hashgraph/sdk` (TypeScript). Zero Solidity on Hedera. This qualifies for the "No Solidity Allowed" track ($3k, 3 winners).

Solidity contracts deploy to **0G Chain** and **World Chain** only.

---

## Next.js Rendering Strategy

| Route | Method | Revalidation | Data Source | Why |
|-------|--------|-------------|-------------|-----|
| `/` | **ISR** | 30 seconds | Fastify → 0G Chain (IdentityRegistry) | Resource list changes slowly |
| `/gpu-verify` | **SSR** | Every request | Fastify → 0G SDK + ERC-8004 | Register + manage marketplace resources (GPU, Agent, Human, DePIN) |
| `/predictions` | **ISR** | 10 seconds | Fastify → 0G Chain (ResourcePrediction) | Near-real-time pool updates |
| `/profile` | **SSR** | Every request | Fastify → World Chain + 0G Chain | Fleet-only: deploy private trading agents |
| `/agent-decision` | **ISR** | 30 seconds | Fastify → 0G Chain (ReputationRegistry) | Seer agent resource ranking |
| `/api/*` | **Fastify** | N/A | Persistent process, direct SDK calls | Holds keys, WASM singleton, calls chains |

### Next.js Best Practices

| Practice | Implementation |
|----------|---------------|
| **Server Components** | Default for all pages. Client Components only for wallet connect, bet placement, MiniKit interactions |
| **Streaming** | `loading.tsx` per route for instant page shells |
| **Image optimization** | `next/image` for all images |
| **Error boundaries** | `error.tsx` per route with chain-specific error messages |
| **Server Actions** | For form submissions (GPU registration, bet placement) |
| **API via Fastify** | All `/api/*` routes on Fastify :5001, proxied by Next.js rewrites |
| **Environment variables** | `NEXT_PUBLIC_*` for client, plain for server (Fastify + SSR) |

### Client vs Server Split

| Layer | Runs On | Has Access To | Examples |
|-------|---------|--------------|---------|
| **Server Components** | Node.js (SSR) | Everything (env vars, SDKs, chain RPCs) | Page data fetching, resource listing |
| **Client Components** | Browser | Only `NEXT_PUBLIC_*` vars, MiniKit, wallet | Wallet connect, MiniKit.verify(), bet forms |
| **Fastify Backend** | PM2-managed process | Everything (private keys, SDKs, WASM) | Chain writes, Hedera transactions, x402 payments |

**Private keys live in Fastify (server-side).** Browser never sees them. Next.js rewrites proxy `/api/*` transparently to Fastify :5001.

---

## Communication Flow

```
Browser                 Next.js :3000              Fastify :5001          OpenClaw :18789
┌──────────┐           ┌──────────────┐           ┌──��───────────┐      ┌─────────────┐
│ MiniKit  │  fetch()  │ SSR pages    │  rewrite  │ /api/verify  │      │ Seer        │
│ .verify()│─────────→ │ Server Comps │─────────→ │  → World ID  │      │ Edge        │
│ .pay()   │           │              │           │  → CredGate  │      │ Shield      │
│          │           │ Middleware   │           │              │      │ Lens        │
│ Wallet   │           │ (auth only)  │           │ /api/gpu/*   │      │             │
│ Connect  │           │              │           │  → 0G SDK    │      │ Agent A2A/  │
│          │           │ Static files │           │  → ERC-8004  │      │ MCP calls   │
│ Forms    │           │              │           │              │      │ via Fastify │
│          │           │              │           │ /api/payments│      │ routes      │
│          │           │              │           │  → Blocky402 │      │             │
│          │           │              │           │  → Hedera    │      │             │
│          │           │              │           │              │      │             │
│          │           │              │           │ WASM (once)  │      │             │
└──────────┘           └──────────────┘           └──────────────┘      └─────────────┘
                                                         │
                              ┌───────────────────────────┤
                              │              │            │
                         World Chain    0G Chain      Hedera
```

### PM2 Process Management

```
┌──────────────────────────────────────────────────────┐
│  PM2 (ecosystem.config.cjs)                          │
│                                                      │
│  ┌─────────┐   ┌──────────┐   ┌───────────────┐    │
│  │  api    │   │  next    │   │  claw         │    │
│  │ :5001   │   │  :3000   │   │  :18789       │    │
│  │ Fastify │   │ Next.js  │   │ OpenClaw      │    │
│  │ tsx     │   │ turbopack│   │ Gateway       │    │
│  │ watch   │   │          │   │               │    │
│  └─────────┘   └──────────┘   └───────────────┘    │
│                                                      │
│  Commands:                                           │
│    npm run dev:pm2   → start all                     │
│    npm run dev:logs  → pm2 logs --lines 50           │
│    npm run dev:stop  → pm2 delete all                │
└──────────────────────────────────────────────────────┘
```

---

## API Key Authentication (Connect Your Agent)

External OpenClaw agents authenticate via API keys generated on the Agents page. Users select a settlement chain, provide their agent's wallet address, and receive a `voc_...` key.

| Component | File | Purpose |
|-----------|------|---------|
| **Storage** | `src/lib/api-key-ledger.ts` | SHA-256 hashed keys, 90-day expiration, auto-purge |
| **Auth Plugin** | `server/plugins/api-key-auth.ts` | `requireApiKey` Fastify preHandler — reads `X-API-Key` header |
| **Routes** | `server/routes/api-keys.ts` | Generate (rate limited), status, revoke — wallet ownership verified |
| **Frontend** | `src/components/ConnectAgentSection.tsx` | 4-state UI (loading / disconnected / just-generated / connected): chain selector, wallet input, key generation, status display |

### Which endpoints require API key?

| Requires `X-API-Key` | Session (World ID) | Public (no auth) |
|----------------------|-------------------|------------------|
| `POST /api/agents/:name/a2a` (execute) | `POST /api/predictions` (create) | `GET /api/agents/:name/a2a` (discover) |
| `POST /api/agents/:name/mcp` (execute) | `POST /api/predictions/:id/bet` | `GET /api/agents/:name/mcp` (schema) |
| | `POST /api/payments` | `GET /api/predictions` |
| | `POST /api/initiate-payment` | `GET /.well-known/agent-card.json` |
| | | `GET /api/reputation` |
| | | `GET /api/hedera/audit` |

### Security measures

- Rate limiting: 5 key generations per IP per hour
- Wallet ownership: session wallet must match requested wallet
- Key expiration: 90-day TTL, auto-expire on validation
- Revoked key purge: removed after 7 days
- Private keys never collected by server — stay in user's local OpenClaw config

---

## Backend Hardening (`server/utils/` + `server/plugins/`)

Production-grade resilience utilities, all with vitest tests (40 tests across 4 files):

| Utility | File | Purpose |
|---------|------|---------|
| **Fetch Timeout** | `server/utils/fetch-with-timeout.ts` | AbortController wrapper with per-service timeout budgets (World ID 10s, Hedera Mirror 8s, Blocky402 15s, 0G Inference 30s) |
| **Retry** | `server/utils/retry.ts` | Exponential backoff with jitter (`delay = min(base * 2^attempt + rand(200), maxDelay)`). Per-service policies (e.g. HEDERA_TX: 2 retries/1s, RPC_WRITE: 0 retries) |
| **Circuit Breaker** | `server/utils/circuit-breaker.ts` | Per-service CLOSED→OPEN→HALF_OPEN state machine. `getBreaker(service)` singleton factory. 6 pre-configured services |
| **Security Headers** | `server/plugins/security-headers.ts` | CSP, CORS, X-Frame-Options, X-Content-Type-Options, HSTS |
| **Response Cache** | `server/plugins/response-cache.ts` | TTL-based GET response cache with `Cache-Control` headers + `X-Cache: HIT/MISS` |
| **Graceful Shutdown** | `server/index.ts` | SIGTERM/SIGINT handler — drains connections before exit |
| **Chain Clients** | `server/clients.ts` | Singleton ethers JsonRpcProvider + viem PublicClient factories — reused across requests |

### Integration Wiring

Resilience utilities are wired into the shared `src/lib/` layer:

| Library | Utility Applied | Details |
|---------|----------------|---------|
| `src/lib/blocky402.ts` | `fetchWithTimeout` + `withRetry` | verifyPayment: 15s timeout + 2 retries; settlePayment: 15s + 1 retry; getSupportedNetworks: 15s timeout |
| `src/lib/og-broker.ts` | `fetchWithTimeout` | callInference: 30s timeout (`TIMEOUT_BUDGETS.OG_INFERENCE`) |
| `server/routes/predictions.ts` | `waitWithTimeout` | All 5 `tx.wait()` calls wrapped with 60s timeout |
| `server/routes/gpu.ts` | `waitWithTimeout` | Both `tx.wait()` calls wrapped with 60s timeout |
| `server/routes/proposals.ts` | `waitWithTimeout` | All 3 `tx.wait()` calls wrapped with 60s timeout |
| `server/routes/edge.ts` | `waitWithTimeout` | Bet `tx.wait()` wrapped with 60s timeout |

### Cache Invalidation on Mutations

POST handlers flush cached GET responses to prevent stale data:

| POST Route | Invalidates |
|-----------|-------------|
| `POST /predictions` (create, bet, claim, resolve) | `/api/predictions`, `/api/agent-decision` |
| `POST /agents/register` | `/api/agents`, `/api/resources` |
| `POST /reputation` | `/api/resources`, `/api/reputation` |
| `POST /gpu/register` | `/api/resources` |
| `POST /edge/trade` | `/api/predictions` |
| `POST /proposals` (submit, approve, reject) | `/api/proposals`, `/api/predictions` |

### Rate Limiting Coverage

All POST handlers are rate-limited via `app.checkRateLimit(ip, path, max, windowMs)`:

| Route | Limit |
|-------|-------|
| `POST /rp-signature` | 30/min |
| `POST /verify-proof` | 10/min |
| `POST /predictions` | 5/min |
| `POST /predictions/:id/bet` | 10/min |
| `POST /predictions/:id/claim` | 10/min |
| `POST /predictions/:id/resolve` | 5/min |
| `POST /gpu/register` | 3/min |
| `POST /edge/trade` | 10/min |
| `POST /seer/inference` | 10/min |
| `POST /reputation` | 10/min |
| `POST /payments` | 5/min |
| `POST /initiate-payment` | 10/min |
| `POST /proposals` | 5/min |

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

## Retroactive Reputation Engine

Vocaid provides **backward-compatible reputation** for the entire 0G provider ecosystem by scanning historical transaction data from the native InferenceServing contract.

### How It Works

```
0G InferenceServing (0xa79F...91E)
  │
  ├── BalanceUpdated events  →  tx count, unique clients, volume per provider
  ├── RefundRequested events →  dispute count per provider
  └── ServiceUpdated events  →  first-seen timestamp, model, TEE type
          │
          ▼
  scripts/compute-retroactive-reputation.ts
          │
          ├── Phase 1: Scan events (last 2M blocks)
          ├── Phase 2: Fetch service metadata (model, pricing, TEE)
          ├── Phase 3: Compute 6 reputation signals + composite
          ├── Phase 4: Auto-register unregistered providers into ERC-8004
          ├── Phase 5: Write scores to ReputationRegistry
          └── Phase 6: Log to Hedera HCS audit topic
```

### 6 Reputation Signals

| Signal | Weight | Formula | Source |
|--------|--------|---------|--------|
| Activity | 25% | `min(100, uniqueClients * 5)` | BalanceUpdated unique user addresses |
| Settlement Health | 20% | `100 - (refundCount / txCount * 100)` | RefundRequested count vs total |
| TEE Compliance | 15% | `100 if verifiability present, else 0` | getService() TEE field |
| Pricing | 15% | `100 - (price / medianPrice * 50)` | getService() inputPrice vs median |
| Dispute Rate | 15% | `100 - (disputes / txCount * 100)` | RefundRequested events |
| Longevity | 10% | `min(100, daysSinceFirst * 2)` | ServiceUpdated first-seen block |

### Testnet Data (April 2026)

| Provider | Model | Txs | Clients | Volume | Composite |
|----------|-------|-----|---------|--------|-----------|
| `0xa48f...7836` | qwen-2.5-7b-instruct | 205 | 43 | 1,397 A0GI | **91** |
| `0x4b2a...4389` | qwen-image-edit-2511 | 4 | 4 | 4.6 A0GI | **74** |
| `0xb8f0...f275` | qwen-2.5-7b-instruct | 17 | 6 | 17 A0GI | **67** |
| `0x8e60...0049` | gpt-oss-20b | 5 | 2 | 11 A0GI | **65** |
| 4 others | various/offline | 1-3 | 1-2 | 1-4 A0GI | 44-60 |

**Total: 8 providers, 239 transactions, 1,439 A0GI volume analyzed.**

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/og-inference-serving.ts` | Event scanner for InferenceServing contract |
| `src/lib/retroactive-reputation.ts` | 6-signal computation + composite scoring |
| `scripts/compute-retroactive-reputation.ts` | Batch script (scan → register → score → HCS) |

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
| Agent prediction proposals | 0G | AgentProposalRegistry.sol |
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
| User session | In-memory (Fastify) | Ephemeral after World ID verify |
| ISR cache | Next.js (in-memory) | Marketplace data cached 30s |
| Demo seed data | JSON files in repo | Pre-populated for demo |

No traditional database. No Redis. No Postgres.

---

## Cross-Chain Payment Architecture

Users always pay in **USDC via World App** (MiniKit.pay). The server handles chain-specific settlement internally. Users never see A0GI, HBAR, or other native tokens.

### Payment Flow: Resource Leasing

```
User taps "Lease GPU-Alpha"
  → MiniKit.pay($0.10 USDC) → World App native payment popup
  → User confirms → USDC sent to deployer wallet on World Chain
  → Server receives confirmation
  → Server settles resource lease on Hedera testnet via x402/Blocky402
  → HCS audit trail logged
  → PaymentConfirmation shows: amount + Hedera tx hash + HashScan link
```

### Payment Flow: Prediction Market Bets

```
User taps "$0.50 YES" on a prediction
  → MiniKit.pay($0.50 USDC) → World App native payment popup
  → User confirms → USDC sent to deployer wallet on World Chain
  → Server receives confirmation
  → Server calls ResourcePrediction.placeBet() on 0G Chain with deployer's A0GI
  → HCS audit trail logged
  → Toast: "Bet placed: $0.50 on YES"
```

### Why Two Payment Flows

**Users** pay via World App (MiniKit.pay) — they see USDC, never native tokens.
**Agents** pay via Hedera x402 — autonomous micropayments, no human interaction.

| Actor | Payment Method | Token | Chain | Min Amount |
|-------|---------------|-------|-------|------------|
| **User** (World App) | MiniKit.pay() | USDC | World Chain mainnet | $0.10 |
| **Agent** (Edge/Lens) | x402 via Blocky402 | USDC | Hedera testnet | $0.0001 |
| **Agent** (Edge) | placeBet() | A0GI | 0G Galileo | 0.001 A0GI |
| **System** | HCS TopicMessageSubmit | — | Hedera testnet | Free |

The deployer wallet coordinates both flows: receives USDC from users on World Chain, holds A0GI for 0G bets, holds HBAR for Hedera gas. No cross-chain bridges — the application layer handles settlement.

### Why Hedera for Leases, 0G for Bets

**Leases on Hedera** — Resource leasing is a **payment-gated access** pattern: pay USDC, get access, log to audit trail. Hedera was purpose-built for this:
- **x402 protocol** via Blocky402: HTTP-native payment gating ($0.0001 gas)
- **HTS tokens**: Non-transferable credentials minted after payment (proof of lease)
- **HCS audit trail**: Immutable log of every lease, queryable via Mirror Node
- **"No Solidity" track**: Zero Solidity on Hedera — all operations via `@hashgraph/sdk` (qualifies for $3k bounty)

**Bets on 0G** — Prediction markets are a **DeFi primitive** requiring on-chain pool management:
- **Smart contract state**: Binary outcome pools (YES/NO), proportional payouts, oracle resolution — needs EVM execution
- **`ResourcePrediction.sol`** deployed on 0G Galileo: `createMarket()`, `placeBet()`, `resolveMarket()`, `claimWinnings()`
- **ERC-8004 integration**: Prediction markets reference agent IDs from the same IdentityRegistry
- **"Best DeFi on 0G" track**: AI-native DeFi using 0G Chain + Compute + Storage (qualifies for $6k bounty)

Moving bets to Hedera would require redeploying the Solidity contract on Hedera EVM — which would disqualify from the "No Solidity" track ($3k). Keeping bets on 0G maximizes bounty coverage across both chains.

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
| `server/` (Fastify routes) | 2, 3, 5, 6, 8, 9, 10 | TS | `components/`, `contracts/` |
| `lib/` | 3, 8 (create), 9-10 (extend) | TS | `components/`, `contracts/` |
| `components/` | 7 (create), 9-10 (add), 13 (polish) | TSX | `server/`, `contracts/`, `agents/` |
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
| CredentialGate | `0x6B927bA02FE8E5e15D5d5f742380A49876ad3E02` |

### 0G Galileo (chainId 16602)

**RPC Fallback Chain** (`server/clients.ts`):
1. `https://0g-galileo-testnet.drpc.org` — dRPC (~124ms, primary)
2. `https://evmrpc-testnet.0g.ai` — Official 0G (~470ms, fallback)
3. `https://16602.rpc.thirdweb.com` — ThirdWeb (~683ms, last resort)

ethers uses `FallbackProvider` (quorum=1, stallTimeout 3s/5s/7s). viem uses `fallback()` transport. Configurable via `OG_RPC_URL`, `OG_RPC_FALLBACK_1`, `OG_RPC_FALLBACK_2`.

| Contract | Address |
|----------|---------|
| IdentityRegistry (proxy) | `0xc16cf40a33e85f41bed6c90c710ff8c70b8c79ec` |
| ReputationRegistry (proxy) | `0xa7ba63bce59d366a1c1b647e4ca75a5c11ca47f4` |
| ValidationRegistry (proxy) | `0x629c61e5a8c78725c8e2cfc6d5b441a4bba0517c` |
| GPUProviderRegistry | `0x94f7d419dd3ff171cb5cd9291a510528ee1ada59` |
| MockTEEValidator | `0x8c4a192ed17dbbe2a7424c0008fafde89c730ccd` |
| ResourcePrediction | `0x82d5f12e55390016c49faab2ccb3c8d55d63fe7a` |
| AgentProposalRegistry | `0x4093025085ea8a3ef36cff0a28e6e7acdf356392` |
| HumanSkillRegistry | `0xcAc906DB5F68c45a059131A45BeA476897b6D2bb` |
| DePINRegistry | `0x1C7FB282c65071d0d5d55704E3CC3FE3C634fB35` |
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