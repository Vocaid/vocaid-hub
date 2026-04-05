# Pitch Strategy & Slide Content — ETHGlobal Cannes 2026

**Format:** 4-minute live demo + 3-minute Q&A (7 minutes total per finalist)
**Video:** 2-4 minutes (mandatory for submission, separate from live demo)
**Partner booth:** 5-7 minutes per partner (World, 0G, Hedera)

---

## Judging Criteria (Score Each)

| Criterion | What Judges Want | Our Strength |
|-----------|-----------------|-------------|
| **Technicality** | Problem complexity + solution sophistication | 3 chains (World+0G+Hedera), ERC-8004, ZK attestation, 4-agent fleet |
| **Originality** | Novel ideas or creative problem-solving | First GPU verification on ERC-8004 (0G confirmed gap) |
| **Practicality** | Complete, functional, real-world ready | Working contracts on 3 testnets (World+0G+Hedera), real payments |
| **Usability (UI/UX)** | Intuitive, easy to interact with | One-tap payments, stepper UI, mobile-first |
| **WOW Factor** | Unique or impressive elements | "This tool doesn't exist yet" — building 0G's missing infra |

---

## Winning ETHGlobal Pitch Patterns (Researched)

### Structure: Problem → Solution → Proof → Potential

From multiple winners:
1. **Problem** (20s): Clear pain point — not abstract, specific
2. **Solution** (20s): What you built — one sentence
3. **Proof** (3 min): Live demo showing it works
4. **Potential** (20s): Why it matters beyond the hackathon

### Winning Tactics

| Tactic | Source | Our Application |
|--------|--------|----------------|
| **Target specific tracks, not general prize** | James Bachini ($4.3K winner) | Targeting 7 specific tracks across 3 partners |
| **Use sponsor tech visibly** | Multiple winners | ERC-8004, OpenClaw, MiniKit, @hashgraph/sdk — all sponsor SDKs |
| **Stack multiple smaller prizes** | James Bachini | 3 partners x 2-3 tracks each = 7 prize opportunities |
| **Show unprecedented functionality** | 0xTree winner | First GPU verification on ERC-8004 — "never been done" |
| **Keep intro < 20 seconds** | ETHGlobal guidelines | Jump to demo immediately |
| **Skip unnecessary waiting** | ETHGlobal guidelines | Pre-seeded data, pre-verified accounts |

---

## Slide Deck Structure (8 Slides)

### Slide 1: Hook (5 seconds — displayed during intro)

**Title:** Vocaid Hub
**Subtitle:** Reliable Resources for the Agentic Economy
**Visual:** Three chain logos (World + 0G + Hedera) connected by lines
**No talking** — this is on screen while you say the opening line

### Slide 2: Problem (15 seconds)

**Title:** The Infrastructure Gap
**Three bullet points:**
- AI agents need compute, skills, and hardware — but can't discover or verify providers
- 0G has GPU compute but no way to verify and advertise providers (they told us)
- No prediction markets exist for resource pricing ($7.4B GPU market, zero price discovery)

**Talking point:** *"In the agentic economy, agents need to hire resources autonomously. But there's no protocol for discovery, verification, or pricing. 0G's own developers confirmed they don't have GPU provider verification."*

### Slide 3: Solution (15 seconds)

**Title:** One Protocol. Any Resource.
**Visual:** Architecture diagram (Trust/World + Verify/0G + Settle/Hedera)
**Single sentence:** Verified humans, GPUs, and AI agents — discovered via ERC-8004, verified by ZK-proven TEE attestation, paid via x402 USDC payments on Hedera ($0.0001 gas), credentialed with HTS tokens.

**Talking point:** *"We built a unified protocol across three chains. World verifies identity. 0G verifies compute. Hedera settles payments and credentials. Let me show you."*

### Slide 4-7: LIVE DEMO (3 minutes — no slides, full screen app)

Switch to live app. Demo flow from SCREEN_FLOW.md:

| Time | Action | Say |
|------|--------|-----|
| 0:00 | Tap "Login with Wallet" → auto-verified | *"Login with World App. Orb-verified users pass all gates instantly. Unverified users can browse but can't trade."* |
| 0:25 | Profile → show deployed fleet (fleet-only page) | *"Four private agents on ERC-8004 via AgentKit — not on the marketplace. Each linked to my World ID."* |
| 0:55 | Resources → register GPU (data-driven stepper) | *"GPU provider connects, TEE attestation verified, registered on ERC-8004. This tool doesn't exist in 0G's ecosystem. Same stepper for agents, skills, DePIN."* |
| 1:55 | Market → browse all types, hire a resource | *"Hire a GPU. Watch — payment happens on World Chain via MiniKit, then settles on Hedera via x402. Two chains, one tap. Both transaction hashes shown."* |
| 2:25 | Predictions → signal ticker + place bet | *"Resource pricing prediction markets. Will H100 cost drop? The market decides."* |
| 2:45 | Block explorer → show 0G contracts + Hedera HCS | *"Real contracts on 0G Chain. Immutable audit trail on Hedera. Three chains, each doing what it does best."* |

### Slide 8: Close (10 seconds)

**Title:** What's Next
**Three points:**
- 0G can adopt GPU verification as SDK plugin
- Resource prediction markets = new asset class
- Open standard (ERC-8004) — any agent framework can use it

**Talking point:** *"We built 0G's missing infrastructure. The prediction markets are a new asset class. And it's all on an open standard. Thank you."*

---

## Q&A Preparation (3 minutes — most likely questions)

| Question | Answer |
|----------|--------|
| **"How is this different from Akash/Render?"** | They're GPU marketplaces. We're a verification and discovery layer ON TOP of compute networks. Akash doesn't have on-chain reputation or TEE attestation via ERC-8004. We complement, not compete. |
| **"Why three chains?"** | Each chain does what it's best at. World has the identity infrastructure (17.9M users). 0G has TEE compute. Hedera has low-cost USDC payments, HTS tokens, and HCS audit. No single chain has all three. |
| **"How does payment work across chains?"** | Users always pay in USDC through World App's native MiniKit payment popup. The server settles on the destination chain: Hedera for resource leases (x402/Blocky402), 0G for prediction bets (ResourcePrediction contract). Users never see native tokens (A0GI, HBAR). No bridges — the application layer coordinates all three chains. |
| **"How do agents connect?"** | Users generate an API key on the Profile page — select a settlement chain (0G, Hedera, or World), provide their agent's wallet address, and get a `voc_...` key. Their OpenClaw agent includes the key as `X-API-Key` header on all POST requests. Discovery endpoints (GET) are public. Agent's private key stays local — never sent to our server. Keys expire after 90 days, rate limited to 5 per hour per IP. |
| **"Why Hedera for leases, 0G for bets?"** | Each chain does what it's built for. Leasing is a payment-gated access pattern — Hedera has x402 ($0.0001 gas), HTS credential tokens, and HCS audit trail, all via `@hashgraph/sdk` with zero Solidity. Bets are a DeFi primitive — binary outcome pools, proportional payouts, oracle resolution — that needs EVM smart contract state, which 0G provides. Keeping bets on 0G and leases on Hedera also maximizes bounty coverage: "No Solidity" on Hedera ($3k) + "Best DeFi on 0G" ($6k). |
| **"TEE attestation can be broken (TEE.Fail)?"** | Yes, and we know. That's why we use TWO trust signals: TEE attestation AND on-chain reputation from actual usage. Reputation can't be faked — it's real inference quality tracked over time. |
| **"Why prediction markets for resource pricing?"** | $7.4B in GPU rentals trade at dynamic spot prices today with zero formal price discovery mechanism. This is the first prediction market for compute pricing. |
| **"How do you bootstrap liquidity?"** | Seeded with 0G providers (already on their network). Agents are the first consumers. Human providers come via World App distribution (17.9M users). |
| **"What about regulatory risk?"** | Prediction markets for resource pricing (not elections or securities). CFTC rulemaking is focused on event contracts. Resource pricing is closer to commodity futures — established legal framework. |
| **"Is the backend production-ready?"** | Yes. Fastify backend has 125 tests, fetch timeouts on all external calls (15-30s budgets), exponential backoff retry on payments, per-service circuit breakers, rate limiting on every POST endpoint, response caching with mutation invalidation, security headers, and graceful shutdown. |

---

## Partner Booth Presentations (5-7 minutes each)

### World Booth — Focus: AgentKit + World ID + MiniKit

**Pitch angle:** *"Four AI agents, each accountable to a verified human. Product breaks without World ID."*

| Time | Show | Say |
|------|------|-----|
| 0:00 | World ID verify flow | "Wallet login checks orb verification automatically. No manual verify step — graceful degradation." |
| 0:30 | Agent fleet with AgentKit badges | "Four agents registered via AgentKit. Each linked to operator's World ID." |
| 1:30 | Mini App marketplace | "Full MiniKit 2.0 integration — wallet auth, native verification check, pay, signTypedData." |
| 2:30 | Try removing World ID gate | "Watch — disable World ID, entire system locks. Product breaks without it." |
| 3:30 | A2A Agent Card | "Agents are discoverable via standard A2A protocol." |
| 4:30 | Q&A | — |

**Key line for World judges:** *"We don't just use World ID — we depend on it. Without it, nothing works."*

### 0G Booth — Focus: OpenClaw + GPU Verification + ERC-8004

**Pitch angle:** *"We built the GPU provider verification tool you said you don't have."*

| Time | Show | Say |
|------|------|-----|
| 0:00 | Reference conversation with 0G dev | "Yesterday you told me 0G has no way to verify and advertise GPU providers. We built it." |
| 0:30 | GPU verification 3-step flow | "Provider connects. We call listService(). Verify TEE attestation on-chain. Register on ERC-8004." |
| 2:00 | Show ERC-8004 on block explorer | "This is a real identity NFT on 0G Galileo. Reputation registry. Validation registry." |
| 3:00 | OpenClaw 4-agent fleet | "Four OpenClaw agents using 0g-agent-skills. Seer does inference on 0G Compute." |
| 4:00 | Reputation scores | "Lens agent writes quality feedback to ERC-8004 Reputation Registry. On-chain. Composable." |
| 5:00 | Q&A | — |

**Key line for 0G judges:** *"This is infrastructure your ecosystem needs. We can make it an SDK plugin."*

### Hedera Booth — Focus: x402 USDC + HTS Tokens + HCS Audit + "No Solidity"

**Pitch angle:** *"x402 USDC payments, soulbound credential tokens, immutable audit trail — all on Hedera, zero Solidity."*

| Time | Show | Say |
|------|------|-----|
| 0:00 | x402 payment flow | "Agent pays for GPU inference. x402 USDC via Blocky402. $0.0001 gas on Hedera." |
| 1:00 | Show HTS credential tokens | "Non-transferable HTS tokens for verified humans, GPUs, agents. Soulbound credentials." |
| 2:00 | Show HCS audit trail | "Every verification and payment logged to HCS topic. Immutable audit trail." |
| 3:00 | Show Hedera block explorer | "Real transaction on Hedera testnet. USDC token 0.0.429274 on testnet.hashscan.io." |
| 4:00 | Explain "No Solidity" architecture | "Pure @hashgraph/sdk. HTS + HCS. At least 2 native Hedera services. Zero Solidity." |
| 5:00 | Q&A | — |

**Key line for Hedera judges:** *"x402 payments, soulbound credentials, immutable audit — all native Hedera, no Solidity."*

---

## Demo Video Script (2-4 minutes, for submission)

Separate from live demo. Pre-recorded, clean, no mistakes.

| Time | Visual | Voiceover |
|------|--------|-----------|
| 0:00-0:10 | App logo + tagline | "Vocaid Hub — Reliable Resources for the Agentic Economy." |
| 0:10-0:25 | Problem slide | "AI agents need compute, skills, and hardware. But there's no protocol for discovery, verification, or pricing." |
| 0:25-0:40 | Architecture diagram | "We built a three-chain protocol: World for identity, 0G for verification, Hedera for payments and credentials." |
| 0:40-1:10 | Wallet login + marketplace browsing (screen recording) | "Login with World App wallet. Orb-verified users access everything instantly. Unverified users see the marketplace but get a friendly gate on actions." |
| 1:10-2:00 | GPU verification flow (screen recording) | "This is the innovation. GPU providers verified on-chain via ERC-8004 with TEE attestation. This tool doesn't exist yet." |
| 2:00-2:30 | Marketplace browse (screen recording) | "Humans, GPUs, agents — one marketplace." |
| 2:30-3:00 | Payment + credentials (screen recording) | "x402 USDC payments on Hedera. HTS soulbound credential tokens." |
| 3:00-3:20 | Reputation update (screen recording) | "Trust builds over time. On-chain, composable, verifiable." |
| 3:20-3:40 | Block explorer showing real contracts | "All deployed. Three testnets. Real contracts." |
| 3:40-3:55 | Close slide | "Vocaid Hub. World plus 0G plus Hedera. Thank you." |

**Recording rules:**
- 1080p minimum, 720p minimum requirement
- Human voiceover (no AI voice, no TTS)
- No background music with text overlay
- No mobile phone recordings
- Clean, quiet environment (use headphones for narration)

---

## Presentation Timing Guardrails

| Risk | Prevention |
|------|-----------|
| Demo takes too long | Pre-seed ALL data. Zero live waiting. Practice 3x before presenting |
| Testnet is slow | Have block explorer tabs pre-opened showing deployed contracts (testnet.hashscan.io) |
| World ID dialog slow | Pre-verify before booth. Show the verified state, explain the flow verbally |
| Prediction market empty | Pre-seed 3 markets with liquidity during demo setup |
| USDC balance zero | Pre-fund Hedera account with USDC via portal.hedera.com during setup |
| Judges interrupt during demo | Pause gracefully, answer briefly, resume. Don't lose the flow |
| Run out of time | Cut reputation step (step 7) — least impactful for judges |

---

## Sources

- [ETHGlobal Cannes 2026 Details](https://ethglobal.com/events/cannes2026/info/details)
- [ETHGlobal Winning Strategy — James Bachini](https://jamesbachini.com/ethglobal-hackathon/)
- [ETHGlobal Bangkok Presentation Guidelines](https://ethglobal.com/events/bangkok/info/details)
- [ETHGlobal Cannes 2025 Finalists](https://ethglobal.com/events/cannes/prizes)
