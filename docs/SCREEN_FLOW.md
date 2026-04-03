# Screen Flow & Architecture Communication Map

**Purpose:** Granular screen-by-screen flow mapped to demo storytelling, architecture layers, and agent wave assignments
**Used by:** All UI agents (W2 Agent 7, W4 Agent 13), demo presenter (W4 Agent 14)

---

## Architecture Communication Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        MINI APP (Next.js)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │    /     │ │/gpu-verify│ │/predictions│ │ /profile │           │
│  │Marketplace│ │GPU Portal│ │Pred Market│ │  My Hub  │           │
│  └────┬─────┘ └────┬─────┘ └────┬──────┘ └────┬─────┘           │
│       │             │            │              │                 │
│  ┌────┴─────────────┴────────────┴──────────────┴─────┐          │
│  │              API ROUTES (Next.js /api/)              │          │
│  │  /api/verify    /api/gpu     /api/predict  /api/agents│         │
│  └──────┬────────────┬────────────┬─────────────┬──────┘          │
└─────────┼────────────┼────────────┼─────────────┼────────────────┘
          │            │            │             │
    ┌─────┴─────┐ ┌────┴────┐ ┌────┴────┐ ┌─────┴─────┐
    │  WORLD    │ │   0G    │ │   ARC   │ │ OPENCLAW  │
    │  CHAIN    │ │  CHAIN  │ │  CHAIN  │ │  GATEWAY  │
    │           │ │         │ │         │ │           │
    │CredGate  │ │ERC-8004 │ │Resource │ │ Seer Edge │
    │.sol      │ │Identity │ │Predict  │ │Shield Lens│
    │          │ │Reputation│ │.sol     │ │           │
    │World ID  │ │Validation│ │         │ │0G Compute │
    │AgentKit  │ │GPUProvReg│ │Circle   │ │0G Storage │
    │          │ │          │ │Nanopay  │ │           │
    └──────────┘ └──────────┘ └─────────┘ └───────────┘
```

### Communication Flows

| From | To | Protocol | Data | Latency |
|------|----|----------|------|---------|
| Mini App → World Chain | ethers.js RPC | World ID proof, CredentialGate.verifyAndRegister() | ~2s |
| Mini App → 0G Chain | ethers.js RPC | ERC-8004 register(), giveFeedback(), validationRequest() | ~1s |
| Mini App → Arc | viem RPC | ResourcePrediction.createMarket(), placeBet(), USDC approve | ~1s |
| Mini App → 0G Compute | @0glabs/0g-serving-broker | listService(), getServiceMetadata(), inference calls | ~2-5s |
| Mini App → Circle Gateway | @circle-fin/x402-batching | deposit(), pay(), withdraw() | ~1s |
| Mini App → OpenClaw | WebSocket :18789 | Agent status, trigger agent actions | ~100ms |
| OpenClaw → 0G Compute | 0g-agent-skills | Seer/Edge inference, Shield reads Validation | ~2-5s |
| OpenClaw → 0G Chain | ethers.js | Lens writes Reputation, Edge reads Identity | ~1s |
| OpenClaw → Arc | x402/fetch | Agent-to-agent USDC payment for compute | ~1s |

---

## Screen-by-Screen Flow (Demo Order)

### Screen 0: Landing / Onboarding (Unauthenticated)

```
┌─────────────────────────┐
│     Vocaid Hub          │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │   [Vocaid Logo]   │  │
│  │                   │  │
│  │  Hybrid Resource  │  │
│  │   Allocation for  │  │
│  │  the Agentic      │  │
│  │   Economy         │  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │  Verify with      │  │
│  │  World ID    🌐   │  │
│  └───────────────────┘  │
│                         │
│  "Discover, verify, and │
│   trade any resource"   │
│                         │
└─────────────────────────┘
```

**Demo step 1 (30s):** Tap "Verify with World ID" → MiniKit verify dialog → proof validated on-chain via CredentialGate.sol

**Architecture calls:**
1. `MiniKit.commands.verify()` → World App handles ZK proof generation
2. `POST /api/verify` → backend validates proof
3. `CredentialGate.verifyAndRegister(signal, root, nullifierHash, proof)` → World Chain tx
4. UI updates: "Verified Human" badge appears

**UX critical path:**
- CTA must be immediately visible (no scroll)
- Loading state during World ID verification (~3-5s)
- Success animation after verification
- Error state if World App not installed

---

### Screen 1: Marketplace (Authenticated — Home Tab)

```
┌─────────────────────────┐
│  Vocaid Hub    [🌐 ✓]  │
├─────────────────────────┤
│ [Marketplace] GPU  Pred  My│
├─────────────────────────┤
│  ┌─ Filter ────────────┐│
│  │ All │ GPU │ Agent │ Human││
│  └─────────────────────┘│
│                         │
│  ┌───────────────────┐  │
│  │ 🖥️ GPU-Alpha      │  │
│  │ H100 · 0G Verified │  │
│  │ ████████░░ 82/100  │  │
│  │ [Hire $0.05/call]  │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ 🤖 Seer Agent      │  │
│  │ Signal Analysis    │  │
│  │ ████████████ 95/100│  │
│  │ World ID ✓ AgentKit✓│  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ 👤 Maria (Rust)    │  │
│  │ Skill: L4 Verified │  │
│  │ ███████░░░ 78/100  │  │
│  │ [Hire $25/hr]      │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**Demo step 4 (30s):** Show unified marketplace with all resource types. Tap filter tabs. Point out chain badges and reputation bars.

**Architecture calls:**
1. `GET /api/gpu` → reads `GPUProviderRegistry.getProviderByIndex()` on 0G Chain
2. `GET /api/agents` → reads `IdentityRegistry` for registered agents
3. `ReputationRegistry.getSummary(agentId, [], "quality", "")` → reputation scores

**UX critical path:**
- Filter tabs must respond instantly (client-side filtering, data pre-fetched)
- ResourceCard component reused across all types (same layout, different badge color)
- Skeleton loading cards during data fetch
- "Hire" CTA on each card — triggers payment flow

---

### Screen 2: GPU Provider Verification Portal (GPU Tab)

```
┌─────────────────────────┐
│  GPU Verification  🔙   │
├─────────────────────────┤
│                         │
│  Register Your GPU      │
│  Provider on ERC-8004   │
│                         │
│  Step 1: Connect Wallet │
│  ┌───────────────────┐  │
│  │ 0x58c4...7eeE  ✓  │  │
│  └───────────────────┘  │
│                         │
│  Step 2: Verify Node    │
│  ┌───────────────────┐  │
│  │ ⚡ Found on 0G     │  │
│  │ Model: H100        │  │
│  │ Endpoint: https://..│  │
│  │ TEE: Intel TDX  ✓  │  │
│  └───────────────────┘  │
│                         │
│  Step 3: Register       │
│  ┌───────────────────┐  │
│  │ [Register on       │  │
│  │  ERC-8004]    ⚡   │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ ✓ Identity NFT #42 │  │
│  │ ✓ A2A Agent Card   │  │
│  │ ✓ TEE Validated    │  │
│  │ View on Explorer → │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**Demo step 3 (60s — longest, key innovation):** Walk through the 3-step registration. Show the ERC-8004 identity NFT minted on 0G Chain. Open block explorer to prove it's real.

**Architecture calls:**
1. `broker.inference.listService()` → discovers provider on 0G network
2. `broker.inference.getServiceMetadata(addr)` → endpoint, model, pricing
3. TEE attestation: submit to `AutomataDcapAttestationFee.verifyAndAttestWithZKProof()` (or MockTEEValidator)
4. `GPUProviderRegistry.registerProvider(agentURI, gpuModel, attestationHash)` → mints ERC-8004 NFT
5. `ValidationRegistry.validationRequest(validator, agentId, attestationURI, hash)` → links attestation

**UX critical path:**
- **Stepper UI** with clear 1→2→3 progression (judges follow easily)
- Each step shows loading → success with checkmark animation
- Step 2 auto-populates from `listService()` (user doesn't type anything)
- Step 3 shows tx hash and block explorer link immediately
- "This tool doesn't exist yet" callout visible on screen during demo

---

### Screen 3: Agent Fleet (Profile Tab — AgentKit Demo)

```
┌─────────────────────────┐
│  My Resources      🌐✓  │
├─────────────────────────┤
│ Market  GPU  Pred [My]  │
├─────────────────────────┤
│                         │
│  World ID: Verified ✓   │
│  ERC-8004 ID: #1        │
│                         │
│  ── My Agent Fleet ──   │
│                         │
│  ┌───────────────────┐  │
│  │ 🔮 Seer     ⚡ 0G  │  │
│  │ Signal Analysis    │  │
│  │ ERC-8004 #3  ✓    │  │
│  │ AgentKit ✓ WorldID✓│  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ ⚡ Edge      ⚡ 0G  │  │
│  │ Market Pricing     │  │
│  │ ERC-8004 #4  ✓    │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ 🛡️ Shield   ⚡ 0G  │  │
│  │ Risk Management    │  │
│  │ ERC-8004 #5  ✓    │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ 🔍 Lens     ⚡ 0G  │  │
│  │ Monitoring         │  │
│  │ ERC-8004 #6  ✓    │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**Demo step 2 (30s):** Show 4 agents registered via AgentKit, each with ERC-8004 identity on 0G Chain and World ID linkage.

**Architecture calls:**
1. AgentKit registration: `POST /api/agents/register` → links agent to operator's World ID
2. `IdentityRegistry.register(agentURI, metadata)` → per agent on 0G Chain
3. A2A Agent Card served at `/.well-known/agent-card.json`

**UX critical path:**
- 4 agent cards should be pre-populated (registered during demo setup, not live registration)
- Each card shows dual verification: AgentKit + ERC-8004
- Tapping a card could show the A2A agent card JSON (optional depth)

---

### Screen 4: Prediction Market (Predictions Tab)

```
┌─────────────────────────┐
│  Prediction Markets 💜  │
├─────────────────────────┤
│ Market  GPU [Pred]  My  │
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │ Will H100 cost    │  │
│  │ drop below $0.005 │  │
│  │ per token by May? │  │
│  │                   │  │
│  │ YES ████░░ 62%    │  │
│  │ NO  ██░░░░ 38%    │  │
│  │                   │  │
│  │ Pool: $45.20 USDC │  │
│  │ Ends: Apr 30      │  │
│  │                   │  │
│  │ ┌──────┐ ┌──────┐│  │
│  │ │ YES  │ │  NO  ││  │
│  │ │$5    │ │ $5   ││  │
│  │ └──────┘ └──────┘│  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Rust developer    │  │
│  │ demand +15% Q2?   │  │
│  │ YES ███░░░ 45%    │  │
│  │ Pool: $12.80 USDC │  │
│  └───────────────────┘  │
│                         │
│  [+ Create Market]  💜  │
└─────────────────────────┘
```

**Demo step 5 (30s):** Show existing prediction markets with USDC pools. Place a $5 YES bet on GPU pricing. Show odds shift.

**Architecture calls:**
1. Read: `ResourcePrediction.markets(id)` → question, pools, resolution time
2. Approve: `USDC.approve(predictionContract, amount)` on Arc
3. Bet: `ResourcePrediction.placeBet(marketId, Outcome.Yes, amount)` on Arc
4. UI reads updated pools from contract

**UX critical path:**
- **Bet amounts pre-set** ($1, $5, $10 buttons — no typing needed during demo)
- Pool bar updates instantly after bet (optimistic UI, confirm on-chain)
- USDC balance shown at top of tab
- "Gas-free" badge visible next to USDC amount
- Markets pre-seeded during demo setup (Agent 12, Wave 4)

---

### Screen 5: Payment Flow (Hire a Resource)

```
┌─────────────────────────┐
│  Hire GPU-Alpha    🔙   │
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │ 🖥️ GPU-Alpha      │  │
│  │ H100 · 0G Verified │  │
│  │ ████████░░ 82/100  │  │
│  └───────────────────┘  │
│                         │
│  Service: AI Inference  │
│  Rate: $0.05 per call   │
│  Settlement: USDC on Arc│
│                         │
│  ┌───────────────────┐  │
│  │  Pay $0.05 USDC   │  │
│  │  ⚡ Gas-free       │  │
│  │  via Nanopayments  │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ ✓ Payment sent     │  │
│  │ $0.05 USDC         │  │
│  │ Gas: $0.00          │  │
│  │ Tx: 0xab3f...      │  │
│  │ ⚡ Sub-second       │  │
│  │ View on ArcScan →  │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**Demo step 6 (30s):** Tap "Hire" on a GPU resource → single-tap payment → show $0.00 gas + sub-second settlement.

**Architecture calls:**
1. `GatewayClient.pay(resourceURL)` → x402 flow: 402 response → EIP-3009 sign → Gateway batches → resource delivered
2. UI shows payment confirmation with tx hash

**UX critical path:**
- **One tap to pay** — no approval dialogs, no gas estimation
- "Gas-free" badge prominent
- Payment confirmation shows within 1 second (sub-second finality on Arc)
- Block explorer link for judges to verify

---

### Screen 6: Reputation Update (After Payment — Automatic)

```
┌─────────────────────────┐
│  Vocaid Hub    [🌐 ✓]  │
├─────────────────────────┤
│ [Marketplace] GPU  Pred  My│
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │ 🖥️ GPU-Alpha      │  │
│  │ H100 · 0G Verified │  │
│  │ ████████░░ 82→84   │  │  ← reputation updated
│  │ Last feedback: now │  │
│  │ Quality: 95/100    │  │
│  │ Latency: 120ms     │  │
│  │ By: Lens Agent 🔍  │  │
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
```

**Demo step 7 (30s):** Return to marketplace. Show GPU-Alpha's reputation score increased. Point out Lens agent wrote feedback automatically.

**Architecture calls:**
1. Lens agent (OpenClaw) calls `ReputationRegistry.giveFeedback(agentId, 95, 0, "quality", "", ...)` on 0G Chain
2. UI re-fetches `ReputationRegistry.getSummary()` → score updated

**UX critical path:**
- Reputation bar animation (old score → new score)
- "By: Lens Agent" attribution visible
- Timestamp "just now" shows recency

---

## UX Gap Analysis: Risks That Slow the Demo

### Critical Gaps (Will Break Demo If Not Addressed)

| # | Gap | Screen | Impact | Resolution | Agent |
|---|-----|--------|--------|-----------|-------|
| 1 | **No loading states defined** | All | User sees blank screen during chain calls (1-5s) | Add skeleton cards + spinner overlay for tx confirmation | Agent 7 (W2) |
| 2 | **No error states defined** | All | If testnet is slow/down, demo freezes | Add error banner: "Network slow, retrying..." with auto-retry | Agent 7 (W2) |
| 3 | **World ID flow has no fallback UI** | Screen 0 | If World App not installed, nothing happens | Show "Open World App to verify" deep link + dev mode toggle for testing | Agent 6 (W2) |
| 4 | **Payment requires prior USDC deposit** | Screen 5 | Demo fails if Gateway Wallet has zero balance | Pre-deposit during demo setup script (Agent 12). Show balance on Screen 4 | Agent 12 (W4) |
| 5 | **Prediction market needs pre-seeded data** | Screen 4 | Empty markets = nothing to demo | Seed 2-3 markets with initial liquidity in demo setup script | Agent 12 (W4) |
| 6 | **Reputation update is async (agent heartbeat)** | Screen 6 | Lens agent may not have written feedback yet during live demo | Trigger Lens feedback manually via API call in demo flow, not heartbeat | Agent 11 (W3) |

### Medium Gaps (Slow Down Demo If Not Addressed)

| # | Gap | Screen | Impact | Resolution | Agent |
|---|-----|--------|--------|-----------|-------|
| 7 | **Tab navigation has no active indicator** | All | Judges don't know which tab is current | Active tab: `border-b-2 border-primary-accent text-primary` | Agent 7 (W2) |
| 8 | **No transition animations between screens** | All | Demo feels choppy | Add `transition-all duration-200` on route changes (Next.js layout) | Agent 13 (W4) |
| 9 | **Emoji icons in DESIGN_SYSTEM.md** | All | UI-Pro-Max says "no emojis as icons" — looks unprofessional to judges | Use Lucide React icons instead (small bundle, consistent sizing) | Agent 7 (W2) |
| 10 | **No "empty state" for marketplace** | Screen 1 | First load before seed data = blank page | Add "No resources registered yet" placeholder with CTA | Agent 7 (W2) |
| 11 | **Block explorer links open in-app** | Screen 2, 5 | World App WebView may not handle external links well | Use `window.open()` with `_blank` target, test in World App | Agent 13 (W4) |
| 12 | **Stepper UI not specified for GPU portal** | Screen 2 | Key demo screen (60s) needs clear visual progression | Define 3-step stepper: circles connected by lines, filled on completion | Agent 5 (W2) |

### Low Gaps (Polish Items for Wave 4)

| # | Gap | Impact | Resolution |
|---|-----|--------|-----------|
| 13 | No success sound/haptic on payment | Missed sensory feedback | MiniKit may support haptic feedback — check docs |
| 14 | No "powered by" footer showing chain logos | Judges don't see multi-chain story | Small footer: "World + 0G + Arc" with chain color dots |
| 15 | No confetti or celebration on first verification | Missed delight moment | Simple CSS confetti animation on World ID verify success |
| 16 | Address truncation not consistent | Looks messy | Use `${addr.slice(0,6)}...${addr.slice(-4)}` everywhere |

---

## Demo Timing Budget (4-Minute Booth Flow)

| Time | Screen | Taps | Talking Point | Risk |
|------|--------|------|--------------|------|
| 0:00-0:30 | Screen 0 → 1 | 2 taps (verify + confirm) | "World ID gates everything. No verification, no access." | World App dialog may be slow (~3-5s) |
| 0:30-1:00 | Screen 3 (Profile) | 0 taps (pre-populated) | "4 agents, each registered via AgentKit with ERC-8004 identity" | None (pre-seeded) |
| 1:00-2:00 | Screen 2 (GPU Verify) | 3 taps (connect + verify + register) | "This GPU was verified on-chain. This tool doesn't exist yet." | Testnet latency (~1-3s per step) |
| 2:00-2:30 | Screen 1 (Marketplace) | 2 taps (filter tabs) | "Humans, GPUs, agents — one marketplace, one protocol" | None (pre-seeded) |
| 2:30-3:00 | Screen 4 (Predictions) | 2 taps (select market + place bet) | "Will H100 cost drop? The market decides." | USDC approval may need extra tap |
| 3:00-3:30 | Screen 5 (Payment) | 1 tap (hire) | "Agent pays $0.05 — zero gas — sub-second settlement" | Circle Gateway latency |
| 3:30-4:00 | Screen 1 (Marketplace) | 0 taps (observe) | "Reputation updated automatically by Lens agent" | Lens heartbeat timing |

**Total taps: ~10** across 4 minutes. Each tap has a clear result.

---

## Component-to-Architecture Mapping

| Component | Reads From | Writes To | Chain | API Route |
|-----------|-----------|-----------|-------|-----------|
| `ResourceCard` | IdentityRegistry, ReputationRegistry | — | 0G | `GET /api/resources` |
| `ChainBadge` | Static (from resource type) | — | — | — |
| `ReputationBar` | ReputationRegistry.getSummary() | — | 0G | `GET /api/reputation/:agentId` |
| `VerificationStatus` | ValidationRegistry.getValidationStatus() | — | 0G | `GET /api/validation/:agentId` |
| `PredictionCard` | ResourcePrediction.markets() | ResourcePrediction.placeBet() | Arc | `GET /api/predictions`, `POST /api/predictions/:id/bet` |
| `PaymentConfirmation` | Circle Gateway settlement receipt | — | Arc | — (client-side SDK) |
| `AgentCard` | IdentityRegistry, AgentKit status | — | 0G + World | `GET /api/agents` |
| `GPUStepper` | listService(), MockTEEValidator | GPUProviderRegistry.registerProvider() | 0G | `POST /api/gpu/register` |
| `WorldIDVerify` | — | CredentialGate.verifyAndRegister() | World | `POST /api/verify` |

---

## Pre-Demo Setup Checklist (Agent 12, Wave 4)

The demo setup script (`scripts/seed-demo-data.ts`) must create:

| Item | Count | Chain | Data |
|------|-------|-------|------|
| GPU providers | 2 | 0G | "GPU-Alpha" (H100, verified), "GPU-Beta" (H200, pending) |
| Agent identities | 4 | 0G | Seer, Edge, Shield, Lens with ERC-8004 IDs |
| Prediction markets | 3 | Arc | GPU pricing, Rust demand, EU capacity |
| USDC deposit | $50 | Arc | Pre-deposit to Gateway Wallet for demo payments |
| Reputation scores | 6 | 0G | 3 per GPU provider (quality, uptime, latency) |
| World ID verification | 1 | World | Operator verified (or dev mode token) |
