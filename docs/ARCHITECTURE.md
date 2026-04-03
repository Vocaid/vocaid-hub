# Architecture — Vocaid Hub Hybrid Resource Allocation

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
├── app/                       # Next.js 15 App Router
│   ├── layout.tsx             # Root layout with MiniKit provider
│   ├── page.tsx               # Landing / entry point
│   ├── (protected)/           # Auth-gated route group
│   │   ├── layout.tsx         # World ID session check
│   │   ├── home/
│   │   │   └── page.tsx       # Marketplace (ISR 30s)
│   │   ├── predictions/
│   │   │   └── page.tsx       # Prediction markets (ISR 10s)
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
│       │   └── route.ts       # World ID proof validation
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
│       │   └── route.ts       # Hedera x402 via Blocky402
│       ├── initiate-payment/
│       │   └── route.ts       # MiniKit payment initiation
│       ├── hedera/
│       │   └── audit/
│       │       └── route.ts   # HCS audit trail via Mirror Node
│       ├── predictions/
│       │   ├── route.ts       # List/create markets
│       │   └── [id]/
│       │       └── bet/
│       │           └── route.ts # Place bet
│       ├── agents/
│       │   ├── register/
│       │   │   └── route.ts   # AgentKit registration
│       │   └── route.ts       # List agents
│       ├── reputation/
│       │   └── route.ts       # Query reputation scores
│       └── resources/
│           └── route.ts       # Unified resource listing
│
├── lib/                       # Shared server utilities
│   ├── hedera.ts              # @hashgraph/sdk wrapper (HTS, HCS, x402)
│   ├── blocky402.ts           # x402 facilitator client
│   ├── og-chain.ts            # 0G Chain interactions (ethers + ERC-8004)
│   ├── og-compute.ts          # 0G inference broker SDK
│   ├── og-storage.ts          # 0G Storage KV for agent state
│   ├── world-id.ts            # World ID verification
│   ├── contracts.ts           # Contract ABIs + addresses from deployments/
│   └── types.ts               # Shared TypeScript types
│
├── components/                # React components (see DESIGN_SYSTEM.md)
│   ├── ResourceCard.tsx
│   ├── ChainBadge.tsx
│   ├── ReputationBar.tsx
│   ├── VerificationStatus.tsx
│   ├── PredictionCard.tsx
│   ├── PaymentConfirmation.tsx
│   ├── AgentCard.tsx
│   └── GPUStepper.tsx
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
│   │   ├── GPUProviderRegistry.sol
│   │   ├── ResourcePrediction.sol
│   │   ├── MockTEEValidator.sol
│   │   └── interfaces/
│   │       ├── IIdentityRegistry.sol
│   │       ├── IReputationRegistry.sol
│   │       └── IValidationRegistry.sol
│   └── world/
│       └── CredentialGate.sol
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
│       └── og-storage.md
│
├── scripts/                   # Deployment + demo
│   ├── deploy-0g.ts           # Deploy contracts to 0G Galileo
│   ├── deploy-world.ts        # Deploy CredentialGate to World Sepolia
│   ├── seed-demo-data.ts      # Pre-populate demo state
│   └── setup-hedera.ts        # Create HTS tokens + HCS topic
│
├── deployments/               # Contract addresses (filled during Wave 1)
│   ├── 0g-galileo.json
│   └── world-sepolia.json
│
├── hardhat.config.ts          # Multi-chain Hardhat config
├── .env.example               # Environment variables template
├── next.config.ts             # Next.js config with MiniKit
├── tailwind.config.ts         # Design system colors
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

## Key Addresses

| Item | Value | Chain |
|------|-------|-------|
| Wallet | `0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE` | All EVM |
| World APP_ID | `app_74d7b06d88b9e220ad1cc06e387c55f3` | World |
| World RP_ID | `rp_21826eb5449cc811` | World |
| 0G Inference Serving | `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E` | 0G (16602) |
| 0G Ledger | `0xE70830508dAc0A97e6c087c75f402f9Be669E406` | 0G (16602) |
| Blocky402 Facilitator | `https://api.testnet.blocky402.com` | Hedera |
| Blocky402 Fee Payer | `0.0.7162784` | Hedera |
| USDC on Hedera | `0.0.429274` | Hedera |
| Vercel URL | `https://vocaid-hub.vercel.app` | — |