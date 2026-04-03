# fin.vocaid.ai — Strategic Assessment

**Date:** 2026-04-02
**Author:** Ale Fonseca + Claude Opus 4.6
**Purpose:** Core functionality, profitability model, and strategic value analysis
**Context:** Pre-hackathon assessment for ETHGlobal Cannes (April 3-5, 2026)

---

## Hybrid Resource Allocation Protocol

Based on conversations with 0G and World developers at pre-hackathon meetings:

- **0G developer confirmed** they have NO GPU provider verification/advertising tool — we are building their missing infrastructure
- **World developer said** skill-trading Mini Apps already exist; they have more interest in **Hybrid Resource Allocation for Agentic Companies**
- **Hedera dropped** — no formal World-Hedera partnership exists, building x402 facilitator = 10-17h (too expensive), Arc provides same prize ceiling with production SDK
- **Arc added** — USDC Nanopayments (gas-free, production SDK), Prediction Markets track ($3k), stablecoin pricing for resources

### One Sentence

A protocol where verified humans and AI agents discover, verify, price, and trade ANY resource (human skills, GPU compute, agent capabilities, DePIN hardware) through ERC-8004 registries on 0G Chain, with x402 USDC nanopayments on Arc and resource prediction markets — all inside World App.

### Partner Selection: World + 0G + Arc

| Partner | Pool | Tracks | Innovation |
|---------|------|--------|-----------|
| World | $20k | AgentKit ($8k), World ID ($8k), MiniKit ($4k) | Triple-verified agent identity |
| 0G | $15k | OpenClaw Agent ($6k), DeFi ($6k), Wildcard ($3k) | GPU provider verification (greenfield) |
| Arc | $15k | Agentic Nano ($6k), Prediction Markets ($3k), Smart Contracts ($3k), Chain Abstracted ($3k) | Resource prediction markets |

### Key Technologies

| Technology | Purpose | Chain |
|-----------|---------|-------|
| ERC-8004 | Agent/provider identity + reputation + validation | 0G Chain |
| Automata DCAP | ZK proof of TDX attestation (~500K gas) | 0G Chain |
| OpenClaw | 4-agent fleet (Seer, Edge, Shield, Lens) | 0G Compute |
| Circle Nanopayments | Gas-free USDC agent payments | Arc |
| World ID + AgentKit | Human verification + agent ownership | World Chain |
| MiniKit 2.0 | Mini App in World App | World Chain |

### Key Innovation: GPU Provider Verification on ERC-8004

0G's confirmed infrastructure gap. Nobody has built this (0 of 40+ projects in awesome-erc8004). We deploy ERC-8004's Validation Registry on 0G Chain and wire it to Automata DCAP for on-chain ZK proof of Intel TDX attestation. GPU providers become discoverable, verified, and reputable on-chain.

### Complete Documentation Index

| Doc | Content | Used By |
|-----|---------|---------|
| `ACTIVE_WORK.md` | WIP tracker, file ownership map, conflict prevention | ALL agents (read FIRST) |
| `WAVE_EXECUTION_PLAN.md` | 14-agent build plan, cross-references, skill ownership, demo script | All agents |
| `TECHNOLOGY_RESEARCH.md` | ERC-8004, OpenClaw, 0G, Arc, x402, Automata DCAP deep dive | Wave 1-3 |
| `DESIGN_SYSTEM.md` | Color palette, typography, components, mobile constraints | UI agents (W2, W4) |
| `PARTNER_BOUNTIES.md` | All 12 partner prize tracks with exact requirements | Wave 4 (submission) |
| `DEVELOPER_CONVERSATIONS.md` | Talking points for 0G, Arc, World sponsor booths | Hour 0 meetings |
| `OPENCLAW_RISK_ASSESSMENT.md` | 5 attack surfaces, 9 CVEs, security hardening | Wave 1 (Agent 4) |
| `MARKET_RISK_ASSESSMENT.md` | Market size, 15 companies, risks, SWOT, TEE.Fail | Wave 4 (README) |
| `MINIKIT_SCAFFOLD.md` | Day 1 scaffold commands using World official starter kit | Wave 1 (Agent 4) |
| `CURSOR_SETUP.md` | Coding machine config: rules, MCP servers, deps | Machine setup |
| `PITCH_STRATEGY.md` | 8-slide deck, demo script, Q&A prep, booth presentations | Wave 4 (submission) |
| `SCREEN_FLOW.md` | Wireframes, architecture communication, UX gaps, demo timing | UI agents (W2, W4) |
| `PRE_HACKATHON_CHECKLIST.md` | All pre-requisites (completed) | Before travel |
