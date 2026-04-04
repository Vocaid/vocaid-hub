# VocAid Hub -- Demo Flow (ETHGlobal Cannes 2026)

**Reliable Resources for the Agentic Economy: World (Trust) + 0G (Verify) + Hedera (Settle)**

---

## 1. Pre-Flight Checklist

- [ ] `.env.local` populated (all World + 0G + Hedera keys)
- [ ] `npm run dev` running on :3000
- [ ] Seed data populated: `npx tsx scripts/seed-demo-data.ts`
- [ ] World App installed on phone (or dev mode enabled)
- [ ] Hedera account funded with 20+ USDC (token `0.0.429274`)
- [ ] 0G wallet funded with A0GI tokens
- [ ] Browser open to `localhost:3000`

---

## 2. Demo Steps (4 minutes)

| Step | Time | Route | Action | Key Line |
|------|------|-------|--------|----------|
| 1 | 0:00-0:30 | `/` | World ID verify -> create resource passport | "Everything starts with World ID. No verification, no access." |
| 2 | 0:30-1:00 | `/profile` | Show 4 registered OpenClaw agents with ERC-8004 IDs | "Four AI agents, each registered via AgentKit with on-chain ERC-8004 identity." |
| 3 | 1:00-2:00 | `/gpu-verify` | GPU provider connects -> TEE verified -> ERC-8004 registration -> visible in marketplace | "This is the innovation. GPU provider verified on-chain via ZK proof. This tool does not exist in 0G's ecosystem yet." |
| 4 | 2:00-2:30 | `/home` | Browse marketplace: humans + GPUs + agents in one view, filter by type | "Humans, GPUs, and agents -- one marketplace, one protocol." |
| 5 | 2:30-3:00 | `/predictions` | Create prediction market, place USDC bet | "Will H100 inference cost drop next week? The market decides." |
| 6 | 3:00-3:30 | `/home` | Hire a resource -> x402 USDC payment via Blocky402 on Hedera | "Agent pays five cents, $0.0001 gas. x402 USDC via Blocky402 on Hedera." |
| 7 | 3:30-4:00 | `/home` | Show reputation scores updated on resource card | "Reputation updates automatically. Our Lens agent wrote quality feedback to ERC-8004." |

---

## 3. Fallback Actions

| Failure | Fallback |
|---------|----------|
| 0G testnet down | Show pre-recorded video + point to deployed contracts on chainscan-galileo.0g.ai |
| Hedera testnet down | Show HTS tokens on testnet.hashscan.io + explain x402 flow with diagram |
| World ID fails | Use MiniKit dev mode simulator |
| OpenClaw Gateway crash | Restart: `openclaw gateway` (~5s, agents auto-reconnect) |
| Payment fails | Show mock payment confirmation + HCS audit trail on hashscan |

---

## 4. Contract Addresses (Quick Reference)

### 0G Galileo (Chain ID 16602)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0x0bd938c2021ba9de937b03f2a4ac793de453e993` |
| ReputationRegistry | `0x3a7d70e5037811aaf0ccc89d4180917a112f3eed` |
| ValidationRegistry | `0x345f915375d935298605888926429b9378bddebe` |
| GPUProviderRegistry | `0x9f522055c682237cf685b8214e1e6c233199abe4` |
| MockTEEValidator | `0x80597d12e953d7519a248c9eb750339b1c54fb34` |
| ResourcePrediction | `0x6ce572729a5cbc8aa9df7ac25d8076e80665194e` |

Explorer: `https://chainscan-galileo.0g.ai`

### World Sepolia

| Contract | Address |
|----------|---------|
| CredentialGate | `0x0AD24045c38Df31CE7fdBeba81F8774644ADEEd0` |

### Hedera Testnet

| Resource | ID |
|----------|----|
| Operator | `0.0.8368570` |
| USDC Token | `0.0.429274` |
| Credential Token | `0.0.8499633` |
| Audit Topic | `0.0.8499635` |

Explorer: `https://testnet.hashscan.io`

---

## 5. Key Talking Points

- "This GPU provider was verified on-chain via ZK proof of Intel TDX attestation -- this tool doesn't exist in 0G's ecosystem yet"
- "Remove World ID -> the entire system stops"
- "Agent pays $0.000001 USDC -- $0.0001 gas -- x402 via Blocky402 on Hedera"
- "Will H100 inference cost drop next week? The market decides."

---

## 6. Post-Demo Q&A Prep

**TEE.Fail risk:**
"We use DCAP + ERC-8004 Reputation as complementary trust signals"

**Why 3 chains:**
"World for trust, 0G for verification, Hedera for settlement -- each does what it does best"

**Why ERC-8004:**
"Only open standard with Validation Registry -- pluggable validators on any EVM chain"
