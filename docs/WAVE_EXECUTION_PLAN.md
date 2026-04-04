# fin.vocaid.ai — Wave Execution Plan (v4 — Reliable Resources for the Agentic Economy)

**Purpose:** Parallel agent execution plan for Claude Code agents building simultaneously
**Architecture:** World (Trust) + 0G (Verify) + Hedera (Settle)
**Method:** Git worktrees — each agent works on an isolated branch, merged sequentially per wave
**Total estimated:** 48 hours of work, compressed to ~24 hours wall-clock with parallel agents
**Evolution:** v3 Hybrid Resource Exchange → v4 Hybrid Resource Allocation (World+0G+Hedera)

---

## Pre-Hackathon Progress (2026-04-02)

### Completed

| Item | Status | Details |
|------|--------|---------|
| Foundry | ✅ Installed | forge 1.5.1-stable at `~/.foundry/bin/forge` |
| OpenClaw | ✅ Installed | v2026.4.1 at `~/.npm-global/bin/openclaw` |
| Node.js | ✅ Available | v24.1.0 at `/usr/local/bin/node`, npm 11.3.0 |
| 0G RPC | ✅ Verified | chainId `0x40da` (16602) responding |
| Hedera Testnet | ✅ Verified | Account 0.0.8368570, 1098 HBAR |
| 0G Wallet | ✅ Created | `0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE` |
| ERC-8004 contracts | ✅ Cloned + compiled | 8 contracts compiled at `/tmp/erc-8004-contracts` |
| 0g-agent-skills | ✅ Cloned | 4 skill categories at `/tmp/0g-agent-skills` |
| OpenClaw risk assessment | ✅ Complete | See `OPENCLAW_RISK_ASSESSMENT.md` — GO with mitigations |
| World ID registration | ✅ Started | Use "Recommended" (portal-managed on-chain RP) |

### Remaining (Browser Required)

| Item | URL | Action |
|------|-----|--------|
| World Developer Portal | developer.worldcoin.org | Finish app setup, get `APP_ID` |
| ~~Fund 0G wallet~~ | ~~faucet.0g.ai~~ | ✅ Funded `0x58c456...` |
| ~~Hedera testnet HBAR~~ | ~~portal.hedera.com~~ | ✅ Funded 0.0.8368570 |
| RiscZero Bonsai API key | [Google Form (gated)](https://docs.google.com/forms/d/e/1FAIpQLSf9mu18V65862GS4PLYd7tFTEKrl90J5GTyzw_d14ASxrruFQ/viewform) | ⚠️ Apply now, may not arrive in time. Fallback: full on-chain DCAP (~5M gas, free on testnet) |
| World App on phone | App Store | Install + verify World ID |
| Kaspersky compatibility test | Local | Test OpenClaw Gateway vs Kaspersky |

### PATH Setup Required

Add to `~/.zshrc` before hackathon:
```bash
export PATH="/usr/local/bin:$HOME/.npm-global/bin:$HOME/.foundry/bin:$PATH"
```

### Research Docs Produced Today

| Doc | Content |
|-----|---------|
| `PARTNER_BOUNTIES.md` | All 12 ETHGlobal Cannes 2026 partner tracks |
| `TECHNOLOGY_RESEARCH.md` | ERC-8004, OpenClaw, 0G, Hedera, x402, Automata DCAP |
| `DEVELOPER_CONVERSATIONS.md` | 0G gap storytelling, Hedera pitch, DCAP talking points |
| `OPENCLAW_RISK_ASSESSMENT.md` | Security risks, gaps, mitigations, Go/No-Go |
| `PRE_HACKATHON_CHECKLIST.md` | Updated for World+0G+Hedera stack |
| `STRATEGIC_ASSESSMENT.md` | v4 pivot, old content removed |
| `WAVE_EXECUTION_PLAN.md` | v4 waves (14 agents, 4 waves) |

---

## Key Architecture Change (v3 → v4)

| Component | v3 (Old) | v4 (New) |
|-----------|----------|----------|
| Payment chain | Hedera (HBAR, no facilitator) | Hedera (x402 USDC via Blocky402) |
| Token standard | HTS non-transferable | HTS non-transferable + ERC-8004 Identity NFTs |
| Audit trail | HCS (Hedera Consensus) | HCS + ERC-8004 Reputation Registry |
| Agent identity | HCS-10 | ERC-8004 + World AgentKit |
| Settlement | x402 HBAR (no facilitator) | x402 USDC via Blocky402 (https://api.testnet.blocky402.com) |
| Prediction markets | None | Resource prediction on Hedera |
| GPU verification | None | GPUProviderRegistry + Automata DCAP ZK |
| Credential tokens | 5 HTS tokens | HTS soulbound + ERC-8004 metadata |
| Partner 3 | Hedera ($15k, no facilitator) | Hedera ($15k, Blocky402 facilitator available) |

---

## Branch Strategy

```text
staging (default — ALL agents commit here)
  +-- vocaid-hub/main (integration branch, created at hackathon)
       +-- fin/wave1-* (feature branches, merged back to main)
       +-- fin/wave2-* (depends on wave 1 merged)
       +-- fin/wave3-* (depends on wave 2 merged)
       +-- fin/wave4-* (depends on wave 3 merged)
```

**Rules:**
- **ALL agents use `staging` branch** as the base. No exceptions.
- Each agent creates a feature branch FROM staging for their wave work
- Agents within the same wave touch DIFFERENT files — zero conflicts (see `ACTIVE_WORK.md` file ownership map)
- Waves merge sequentially: all Wave N branches merge before Wave N+1 starts
- Fresh public GitHub repo created at the venue (ETHGlobal fresh-start rule)

## Agent Coordination Protocol

**MANDATORY:** Every agent MUST follow this before starting ANY work:

```bash
# 1. Pull latest
git pull origin staging

# 2. Read active work tracker
cat docs/ACTIVE_WORK.md

# 3. Check for conflicts with your target files
# If another agent claims overlapping files → STOP and pick different task

# 4. Claim your task
# Add row to ACTIVE_WORK.md Active Work table

# 5. Commit claim BEFORE coding
git add docs/ACTIVE_WORK.md
git commit -m "wip: claim [your task description]"
git push origin staging

# 6. NOW start coding on your feature branch
git checkout -b fin/wave[N]-[your-branch]
```

**After completing work:**
```bash
# 1. Update ACTIVE_WORK.md → status: done, move to Recently Completed
# 2. Commit + push your feature branch
# 3. Merge to staging (or wait for wave merge)
```

See `ACTIVE_WORK.md` for complete file ownership map per wave and conflict prevention checklist.

---

## Document Cross-References

Every agent should read these docs before starting their wave:

| Doc | Read Before | Why |
|-----|-------------|-----|
| `ACTIVE_WORK.md` | **Before EVERY task** | Claim files, check conflicts, prevent duplicate work |
| `WAVE_EXECUTION_PLAN.md` | All waves | This file — agent assignments, merge order, verification |
| `TECHNOLOGY_RESEARCH.md` | Wave 1-3 | SDK methods, chain configs, contract interfaces, ERC-8004 spec |
| `MINIKIT_SCAFFOLD.md` | Wave 1 (Agent 4) | Exact scaffold commands |
| `DESIGN_SYSTEM.md` | Wave 2-4 (UI agents) | Color palette, typography, components, mobile constraints |
| `OPENCLAW_RISK_ASSESSMENT.md` | Wave 1 (Agent 4) | Security hardening: exec allowlist, gateway config, no ClawHub skills |
| `PARTNER_BOUNTIES.md` | Wave 4 (Agent 14) | Track requirements for submission evidence |
| `DEVELOPER_CONVERSATIONS.md` | Hour 0 (sponsor meetings) | Talking points for 0G, Hedera, World booths |
| `MARKET_RISK_ASSESSMENT.md` | Wave 4 (Agent 14) | Known risks to acknowledge in README (TEE.Fail, oracle manipulation) |
| `CURSOR_SETUP.md` | Machine setup | Cursor rules, MCP servers, deps for coding machine |
| `PRE_HACKATHON_CHECKLIST.md` | Before travel | All pre-reqs (completed) |

## Agent Skill Ownership

| Custom Skill | Owner Agent | Wave | Lines | Description |
|-------------|-------------|------|-------|-------------|
| `skills/nanopayments.md` | Agent 9 | W3 | ~30 | Wraps `@hashgraph/sdk` for x402 USDC payments via Blocky402 |
| `skills/reputation.md` | Agent 11 | W3 | ~40 | Calls `ReputationRegistry.giveFeedback()` with quality/uptime/latency |
| `skills/prediction.md` | Agent 10 | W3 | ~40 | Creates HTS-based prediction tokens + HCS market resolution |
| `skills/0g-storage.md` | Agent 8 | W2 | ~30 | Wraps `0g-ts-sdk` for agent state persistence |

All 4 custom skills written from scratch. Zero ClawHub dependencies. See `OPENCLAW_RISK_ASSESSMENT.md` for security rationale.

## Library Decisions

| Library | Version | Used For | Chain | Why This One |
|---------|---------|----------|-------|-------------|
| `ethers` | ^6.13.0 | Contract interaction | 0G, World | Native EVM, best 0G docs compatibility |
| `@hashgraph/sdk` | ^2.81.0 | HTS, HCS, transfers, x402 | Hedera | Official Hedera SDK — all Hedera ops, zero Solidity |
| `@0glabs/0g-serving-broker` | ^0.6.5 | GPU inference | 0G | Foundation-audited, 0g-agent-skills compatible |
| `@0glabs/0g-ts-sdk` | ^0.3.3 | Storage, chain ops | 0G | Official SDK |
| `@worldcoin/minikit-js` | ^1.0.0 | World ID + Mini App | World | Official starter kit |
| `@openzeppelin/contracts` | ^5.0.0 | Solidity base | All | Industry standard |
| Tailwind CSS | ^4.0.0 | Styling | Frontend | MiniKit template default. No component library — keeps bundle small |

---

## Bounty Targets (7 strong-fit tracks, $50k ceiling)

| Track | Prize | Primary Wave | Key Evidence |
|-------|-------|-------------|-------------|
| **World AgentKit** | $8k | W2 | 4 OpenClaw agents registered via AgentKit |
| **World ID 4.0** | $8k | W1+W2 | Hard gate on all resource access. Product breaks without it |
| **World MiniKit 2.0** | $4k | W1+W4 | Full Mini App with verify + pay commands |
| **0G OpenClaw Agent** | $6k | W1+W2 | GPU provider verification (their confirmed gap) + ERC-8004 |
| **0G Wildcard** | $3k | W2 | Multi-resource marketplace on 0G full stack |
| **Hedera AI/Agentic Payments** | $6k | W3 | Agent-to-agent USDC via x402 Blocky402 on Hedera |
| **Hedera No Solidity** | $3k | W3 | Pure @hashgraph/sdk — HTS + HCS, zero Solidity |
| **Hedera Tokenization** | $2.5k | W3 | HTS non-transferable credential tokens |

---

## Wave 1: Foundation + Contract Deployments (4 agents, ~3h each)

All agents deploy contracts and set up infrastructure. Zero file overlap.

| Agent | Branch | Deliverable | Chain |
|-------|--------|-------------|-------|
| **1: ERC-8004 + DCAP on 0G** | `fin/wave1-0g-contracts` | Deploy 3 ERC-8004 registries (Identity, Reputation, Validation) on 0G Galileo. Attempt Automata DCAP deployment (15-20 contracts). If DCAP >4h, deploy MockTEEValidator instead. Record all addresses in `deployments/0g-galileo.json`. | 0G Chain |
| **2: World ID + CredentialGate** | `fin/wave1-world` | Deploy CredentialGate.sol on World Chain Sepolia. Set up World ID verification API route. Configure MiniKit provider. | World Chain |
| **3: Hedera Setup** | `fin/wave1-hedera` | Set up @hashgraph/sdk client. Create HTS credential tokens. Create HCS audit topic. Configure Blocky402 x402 facilitator. Record IDs in `deployments/hedera-testnet.json`. | Hedera |
| **4: Scaffold + OpenClaw** | `fin/wave1-scaffold` | Use **official public starter kit**: `npx @worldcoin/create-mini-app vocaid-hub` (allowed per ETHGlobal rules: "public starter kits are explicitly permitted"). Add Hardhat multi-chain config. OpenClaw 4-agent setup (Seer, Edge, Shield, Lens) with 0g-agent-skills. `.env.example`. Add all project dependencies. See `MINIKIT_SCAFFOLD.md` for exact commands. | Local |

**Security:** Agent 4 MUST apply security hardening from `OPENCLAW_RISK_ASSESSMENT.md` during OpenClaw setup: exec allowlist mode, gateway bind 127.0.0.1, autoApproveLocalhost false, no ClawHub skills, empty extensions directory.

**UI:** Agent 7 (Wave 2) and Agent 13 (Wave 4) MUST follow `DESIGN_SYSTEM.md` for color palette, typography, components, and mobile constraints.

**Merge order:** Agent 4 (Scaffold) → Agent 1 (0G) → Agent 2 (World) → Agent 3 (Hedera)

**Verification before Wave 2:**
- [ ] `npm install` succeeds
- [ ] `npm run dev` starts Mini App on :3000
- [ ] ERC-8004 contracts deployed and verified on `chainscan-galileo.0g.ai`
- [ ] DCAP or MockTEEValidator deployed on 0G
- [ ] CredentialGate deployed on World Chain Sepolia
- [ ] Hedera HTS tokens created and HCS topic created (`testnet.hashscan.io`)
- [ ] OpenClaw gateway starts with 4 agents

---

## Wave 2: GPU Verification + Core Flows (4 agents, ~3h each, depends on Wave 1)

| Agent | Branch | Deliverable |
|-------|--------|-------------|
| **5: GPU Provider Portal** | `fin/wave2-gpu-portal` | GPUProviderRegistry.sol deployment. Portal frontend: connect wallet → read `listService()` → verify TEE → register on ERC-8004 → display identity NFT + A2A agent card. Provider listing with reputation badges. |
| **6: World ID + AgentKit Integration** | `fin/wave2-agentkit` | World ID as hard gate for all resource access. 4 OpenClaw agents registered via AgentKit (each linked to operator's World ID). A2A Agent Card at `/.well-known/agent-card.json`. ERC-8004 identity for each agent on 0G Chain. |
| **7: Resource Marketplace UI** | `fin/wave2-marketplace` | Browse/filter resources by type (Human Skills, GPU Compute, Agent Capabilities, DePIN). Resource cards showing ERC-8004 identity, reputation scores, attestation status. Category tabs. Mobile-optimized for World App. |
| **8: 0G Compute Integration** | `fin/wave2-0g-compute` | Wire 0G broker SDK: `listService()`, `getServiceMetadata()`, inference calls. Agent state persistence via 0G Storage. Connect Seer agent to 0G Compute for AI inference. |

**Merge order:** Agent 8 (0G Compute) → Agent 5 (GPU Portal) → Agent 6 (AgentKit) → Agent 7 (Marketplace UI)

**Verification before Wave 3:**
- [ ] GPU provider registration creates ERC-8004 identity NFT on 0G
- [ ] TEE attestation submitted (DCAP ZK proof or mock signature)
- [ ] World ID blocks unverified users from all resource access
- [ ] 4 agents registered via AgentKit with ERC-8004 identities
- [ ] Marketplace shows GPU providers + agents in unified view
- [ ] 0G inference call succeeds via broker SDK

---

## Wave 3: Payments + Prediction Markets (3 agents, ~3h each, depends on Wave 2)

| Agent | Branch | Deliverable |
|-------|--------|-------------|
| **9: Hedera x402 Payments** | `fin/wave3-hedera-payments` | Hedera x402 via Blocky402 integration: x402 middleware on resource API endpoints (402 response without payment). Agent-to-agent USDC payments (token 0.0.429274, $0.0001 gas). Payment confirmation UI. |
| **10: Prediction Markets** | `fin/wave3-predictions` | Prediction market frontend: create markets ("Will H100 cost < $X?"), place USDC bets, view odds/pools. Connect Seer agent to populate market signals. Resolution via on-chain oracle data. Seeded markets for demo. |
| **11: Reputation + Agent Trading** | `fin/wave3-reputation` | Lens agent writes `ReputationRegistry.giveFeedback()` with quality/uptime/latency scores. Shield agent reads `ValidationRegistry` to block unverified providers. Edge agent executes resource allocation trades. ERC-8004 reputation displayed on provider cards. |

**Merge order:** Agent 11 (Reputation) → Agent 9 (Nanopayments) → Agent 10 (Predictions)

**Verification before Wave 4:**
- [ ] Agent pays $0.01 USDC for GPU inference via x402 Blocky402 ($0.0001 gas)
- [ ] Prediction market created with USDC bets placed
- [ ] Reputation scores visible on GPU provider cards
- [ ] Shield blocks allocation to unverified providers
- [ ] x402 402 response returned for unpaid resource queries

---

## Wave 4: Demo Hardening + Submission (3 agents, ~3h each, depends on Wave 3)

| Agent | Branch | Deliverable |
|-------|--------|-------------|
| **12: Demo Flow + Seed Data** | `fin/wave4-demo` | `scripts/seed-demo-data.ts`: 2 GPU providers, 3 prediction markets, reputation scores, pre-computed ZK proofs (if DCAP deployed). Demo flow script (4 minutes). Fallback mock data for testnet failures. |
| **13: Mini App Polish** | `fin/wave4-polish` | Full end-to-end flow: World ID verify → GPU verification → marketplace browse → prediction market → agent payment → reputation update. MiniKit commands: `verify`, `pay`. Mobile-optimized. |
| **14: Submission Assets** | `fin/wave4-submission` | README.md with architecture diagram + setup instructions. Demo video (<3 min for 0G, <5 min for World/Hedera). SUBMISSION.md with contract addresses + team info. AI_ATTRIBUTION.md. |

**Merge:** Agent 12 → Agent 13 → Agent 14 → merge `vocaid-hub/main`

**Final verification:**
- [ ] Demo flow runs end-to-end in <4 minutes
- [ ] All contracts verified on respective block explorers
- [ ] Video recorded: <3 min (0G), <5 min (World/Hedera)
- [ ] README has working setup instructions
- [ ] SUBMISSION.md covers all 7 bounty tracks with evidence

---

## Wave Verification Status (Audited 2026-04-04T10:00Z)

### Wave 1 — All Complete

- [x] `npm install` succeeds
- [x] `npm run dev` starts Mini App on :3000
- [x] ERC-8004 contracts deployed on 0G Galileo (6 contracts in `deployments/0g-galileo.json`)
- [x] MockTEEValidator deployed (DCAP infeasible on Apple Silicon — expected fallback)
- [x] CredentialGate deployed on World Chain Sepolia (`0x0AD24...`)
- [x] Hedera HTS token (VCRED `0.0.8499633`) + HCS topic (`0.0.8499635`) created
- [x] OpenClaw gateway config with 4 agents + security hardening applied

### Wave 2 — 5/6 Complete

- [x] GPU provider registration creates ERC-8004 identity NFT on 0G
- [x] TEE attestation submitted (MockTEEValidator signature-based)
- [x] World ID blocks unverified users from all resource access
- [x] 4 agents registered via AgentKit with ERC-8004 identities
- [x] Marketplace shows GPU providers + agents in unified view
- [~] 0G inference call — broker SDK wired (`og-compute.ts`) but Seer agent doesn't execute autonomously (P-060)

### Wave 3 — 4/5 Complete

- [x] Agent pays USDC via x402 Blocky402 (x402-middleware.ts + /api/payments)
- [x] Prediction market created with bets placed (seed-demo-data.ts creates 3 markets)
- [x] Reputation scores visible on GPU provider cards (ReputationBar component)
- [x] Shield blocks allocation to unverified providers (P-057 — ValidationRegistry check in /api/resources)
- [x] x402 402 response returned for unpaid resource queries

### Wave 4 — 3/5 Complete

- [x] Demo flow seed data script complete (`scripts/seed-demo-data.ts`)
- [x] README + SUBMISSION.md + AI_ATTRIBUTION.md all written
- [x] Loading skeletons + error boundaries + stagger animations on all routes
- [ ] MiniKit `pay` command not wired — uses x402 headers instead (P-059)
- [ ] Demo video not recorded (P-063)

### Unplanned Gaps (Agent Autonomy Layer)

Agents exist as OpenClaw configs (soul.md + skills). Most gaps now addressed:
- P-058: Lens writes `giveFeedback()` — DONE (Agent 3, auto-writes after payment)
- P-062: Agent-to-agent messaging — DONE (Agent 6, `scripts/demo-agent-fleet.ts` exercises Seer→Edge→Shield→Lens relay)
- P-060: Seer 0G Compute inference — needs live 0G provider (testnet SSL issues)
- P-061: Edge trade execution — needs OpenClaw Gateway running

See `docs/PENDING_WORK.md` for full gap list with bounty impact.

---

## Timeline (Wall-Clock)

```text
Hour 0-1:    Sponsor conversations (0G, Hedera, World) — HIGHEST ROI
Hour 1-4:    Wave 1 (4 agents) — Contract deployments + scaffold
Hour 4-5:    Wave 1 merge + verification
Hour 5-9:    Wave 2 (4 agents) — GPU verification + core flows
Hour 9-10:   Wave 2 merge + verification
Hour 10-14:  Wave 3 (3 agents) — Payments + prediction markets
Hour 14-15:  Wave 3 merge + verification
Hour 15-19:  Wave 4 (3 agents) — Demo + polish + submission
Hour 19-21:  Final merge + submission

Total: ~21 hours wall-clock
Buffer: 27 hours for debugging, polish, sponsor meetings, demo practice
```

---

## Agent Assignment Matrix

| # | Wave | Branch | Key Deliverable | Track Served |
|---|------|--------|----------------|-------------|
| 1 | W1 | `fin/wave1-0g-contracts` | ERC-8004 + DCAP deployment on 0G | 0G OpenClaw |
| 2 | W1 | `fin/wave1-world` | CredentialGate + World ID setup | World ID, MiniKit |
| 3 | W1 | `fin/wave1-hedera` | HTS tokens + HCS audit + Blocky402 x402 on Hedera | Hedera AI/Agentic, No Solidity |
| 4 | W1 | `fin/wave1-scaffold` | Next.js + Hardhat + OpenClaw agents | All |
| 5 | W2 | `fin/wave2-gpu-portal` | GPU provider verification portal | 0G OpenClaw (key innovation) |
| 6 | W2 | `fin/wave2-agentkit` | AgentKit + ERC-8004 agent identity | World AgentKit |
| 7 | W2 | `fin/wave2-marketplace` | Resource marketplace UI | 0G Wildcard |
| 8 | W2 | `fin/wave2-0g-compute` | 0G broker integration + agent compute | 0G OpenClaw |
| 9 | W3 | `fin/wave3-hedera-payments` | x402 USDC via Blocky402 on Hedera | Hedera AI/Agentic |
| 10 | W3 | `fin/wave3-predictions` | Prediction market UI + seeded markets | Hedera Tokenization |
| 11 | W3 | `fin/wave3-reputation` | ERC-8004 reputation + agent trading | 0G OpenClaw |
| 12 | W4 | `fin/wave4-demo` | Demo seed data + flow script | All |
| 13 | W4 | `fin/wave4-polish` | Mini App end-to-end polish | World MiniKit |
| 14 | W4 | `fin/wave4-submission` | README + video + submission | All |

---

## Commit Strategy (ETHGlobal Compliance)

**Fresh public GitHub repo created at venue (not before).**
**Rule:** Each commit must be small, focused, independently meaningful. No commit should touch more than 5-10 files. Each agent makes 3-5 commits per wave (not one large dump).

### Linear Commit Timeline (40 commits across 21 hours)

```
Hour 0: Phase 0 — Repository Init
  #1  init: scaffold with @worldcoin/create-mini-app starter kit
  #2  init: add .env.example with World + 0G + Hedera variables
  #3  init: add multi-chain Hardhat config (0G Galileo + Hedera + World Sepolia)
  #4  docs: add README with project overview and architecture

Hour 1-2: Wave 1 Agent 4 — OpenClaw + Dependencies
  #5  feat(agents): create OpenClaw 4-agent configs (Seer, Edge, Shield, Lens)
  #6  feat(agents): add 0g-agent-skills to all agents
  #7  feat(agents): add security hardening (exec allowlist, gateway config)
  #8  chore: install project dependencies (ethers, @hashgraph/sdk, 0G SDK)

Hour 1-2: Wave 1 Agent 1 — 0G Contracts
  #9  feat(0g): add ERC-8004 interface contracts (Identity, Reputation, Validation)
  #10 feat(0g): deploy ERC-8004 registries on Galileo testnet
  #11 feat(0g): add MockTEEValidator contract
  #12 feat(0g): deploy MockTEEValidator on Galileo testnet

Hour 1-2: Wave 1 Agent 2 — World Contracts
  #13 feat(world): add CredentialGate.sol with World ID verification
  #14 feat(world): deploy CredentialGate on World Chain Sepolia
  #15 feat(world): add World ID verification API route (/api/verify)

Hour 2-4: Wave 1 Agent 3 — Hedera Setup
  #16 feat(hedera): create HTS credential tokens (non-transferable)
  #17 feat(hedera): create HCS audit topic
  #18 feat(hedera): configure Blocky402 x402 facilitator
  #19 feat(hedera): record all token/topic IDs

Hour 4-5: Wave 1 Merge + Verification
  (merge branches sequentially, verify all contracts deployed)

Hour 5-6: Wave 2 Agent 5 — GPU Provider Portal
  #20 feat(0g): add GPUProviderRegistry.sol contract
  #21 feat(0g): deploy GPUProviderRegistry on Galileo
  #22 feat(app): add GPU verification stepper UI (3-step flow)
  #23 feat(app): add provider listing with reputation badges

Hour 5-6: Wave 2 Agent 6 — AgentKit
  #24 feat(world): add AgentKit agent registration endpoint
  #25 feat(world): register 4 agents via AgentKit with ERC-8004 identity
  #26 feat(world): add A2A Agent Card at /.well-known/agent-card.json

Hour 6-8: Wave 2 Agent 7 — Marketplace UI
  #27 feat(app): add ResourceCard component with chain badges
  #28 feat(app): add marketplace page with category filter tabs
  #29 feat(app): add ReputationBar and VerificationStatus components

Hour 6-8: Wave 2 Agent 8 — 0G Compute
  #30 feat(0g): add 0G broker SDK integration (listService, inference)
  #31 feat(0g): connect Seer agent to 0G Compute for inference

Hour 9-10: Wave 2 Merge + Verification

Hour 10-12: Wave 3 Agent 9 — Hedera x402 Payments
  #32 feat(hedera): add x402 USDC payment flow via Blocky402
  #33 feat(hedera): add x402 middleware for paid resource queries
  #34 feat(app): add PaymentConfirmation component

Hour 10-12: Wave 3 Agent 10 — Prediction Markets
  #35 feat(app): add PredictionCard component with USDC betting
  #36 feat(app): add prediction market page with create + bet flows

Hour 10-12: Wave 3 Agent 11 — Reputation + Agents
  #37 feat(0g): add Lens agent reputation feedback skill
  #38 feat(0g): add Shield agent verification check skill

Hour 14-15: Wave 3 Merge + Verification

Hour 15-17: Wave 4 Agent 12 — Demo Setup
  #39 feat(demo): add seed data script (providers, markets, reputation)
  #40 feat(demo): add demo flow documentation

Hour 17-19: Wave 4 Agent 13 — Polish
  #41 feat(app): add loading states and error handling across all screens
  #42 feat(app): add screen transition animations
  #43 feat(app): mobile polish for World App viewport

Hour 19-21: Wave 4 Agent 14 — Submission
  #44 docs: finalize README with architecture diagram and setup
  #45 docs: add SUBMISSION.md with contract addresses and bounty evidence
  #46 docs: add AI_ATTRIBUTION.md
```

### Commit Size Guidelines

| Commit Type | Max Files | Max Lines | Example |
|------------|-----------|-----------|---------|
| Contract + deploy script | 3-4 files | ~150 lines | Contract .sol + deploy .ts + addresses .json |
| UI component | 2-3 files | ~100 lines | Component .tsx + route page .tsx |
| Agent skill | 1-2 files | ~50 lines | SKILL.md + integration script |
| Configuration | 2-3 files | ~50 lines | Config file + .env update |
| Documentation | 1-2 files | ~100 lines | README + SUBMISSION.md |

**Hard rule:** If a commit exceeds 200 lines, break it into two commits. Judges scan git history for authenticity.

---

## Demo Script

### Duration by Submission Track

| Submission | Max Length | Focus |
|-----------|-----------|-------|
| **0G track** | <3 min | GPU verification + OpenClaw agents + ERC-8004 (steps 3, 2, 7) |
| **World track** | <5 min | World ID + AgentKit + full Mini App flow (steps 1, 2, 4) |
| **Hedera track** | <5 min | x402 USDC + HTS credentials + HCS audit (steps 5, 6) |
| **Live demo (booth)** | ~4 min | Full 7-step flow below |

### Full 7-Step Demo Flow (4 minutes, booth presentation)

| Step | Duration | Action | Track | UI Route |
|------|----------|--------|-------|----------|
| 1 | 30s | World ID verify → create resource passport | World ID | `/` → MiniKit verify dialog |
| 2 | 30s | Register 4 OpenClaw agents via AgentKit → show ERC-8004 identities | World AgentKit | `/profile` → agent cards |
| 3 | 60s | GPU provider connects → TEE verified → ERC-8004 registration → visible in marketplace | **0G OpenClaw** | `/gpu-verify` → registration flow |
| 4 | 30s | Browse marketplace: humans + GPUs + agents in one view | 0G Wildcard | `/` → category tabs |
| 5 | 30s | Create prediction market: "Will H100 cost drop?" → place USDC bet | Hedera | `/predictions` → create + bet |
| 6 | 30s | Agent pays $0.01 USDC for GPU inference → $0.0001 gas | Hedera AI/Agentic | `/` → hire resource → payment confirmation |
| 7 | 30s | Reputation scores update in ERC-8004 → provider quality visible | 0G OpenClaw | `/` → resource card → reputation bar |

### Key Lines (Memorize These)

- "This GPU provider was verified on-chain via ZK proof of Intel TDX attestation — this tool doesn't exist in 0G's ecosystem yet"
- "Remove World ID → the entire system stops"
- "Agent pays $0.000001 USDC — $0.0001 gas — x402 via Blocky402 on Hedera"
- "Will H100 inference cost drop next week? The market decides."

### Fallback Actions (If Demo Breaks)

| Failure | Fallback |
|---------|----------|
| 0G testnet down | Show pre-recorded video of GPU verification + point to deployed contract on block explorer |
| Hedera testnet down | Show HTS tokens and HCS audit on `testnet.hashscan.io` + explain x402 flow with diagram |
| World ID fails | Use dev mode (MiniKit built-in simulator) |
| OpenClaw Gateway crash | Restart Gateway (~5s). Agents auto-reconnect |

### Known Limitation to Acknowledge

TEE.Fail (2025) demonstrated Intel TDX attestation keys can be extracted. Our architecture uses DCAP verification AND ERC-8004 Reputation Registry as complementary trust signals — reputation scores (actual inference quality tracked over time) don't depend on TEE alone. See `MARKET_RISK_ASSESSMENT.md` for full risk analysis.

---

## Code Provenance Disclosure

> **Prepared before hackathon (planning only, no code):**
> - Architecture design, research documents, developer conversation scripts
> - Account setup (World Developer Portal, 0G wallet, Hedera testnet, Bonsai API)
> - SDK research and dependency evaluation
>
> **Built during 48h (all code, from scratch):**
> - Project scaffold, TypeScript types, configuration
> - ERC-8004 registry deployment on 0G Chain
> - Automata DCAP ZK verifier deployment (or mock TEE validator)
> - GPUProviderRegistry.sol + GPU provider verification portal
> - CredentialGate.sol on World Chain + World ID integration
> - Resource prediction on Hedera + prediction market UI
> - Hedera x402 USDC via Blocky402 for agent-to-agent payments
> - OpenClaw 4-agent fleet (Seer, Edge, Shield, Lens) with 0G skills
> - World AgentKit agent registration + A2A Agent Cards
> - Resource marketplace Mini App UI
> - Demo seed data and setup scripts
>
> **Pre-existing technology (public, not hackathon code):**
> - ERC-8004 contracts (erc-8004/erc-8004-contracts — open source)
> - Automata DCAP contracts (automata-network — open source)
> - OpenClaw agent framework (open source)
> - @worldcoin/minikit-js, @0glabs/0g-serving-broker, @hashgraph/sdk
