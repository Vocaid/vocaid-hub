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
| 1 | 0:00-0:30 | `/` | Wallet login → auto-verify (orb-verified users pass all gates) | "Login with World App. Orb-verified users access everything. Graceful degradation for unverified." |
| 2 | 0:30-1:00 | `/profile` | Connect Your Agent — generate API key, configure chain + wallet | "Generate an API key. Pick your chain. Your OpenClaw agent calls our A2A/MCP services." |
| 3 | 1:00-2:00 | `/gpu-verify` | GPU provider connects -> TEE verified -> ERC-8004 registration -> visible in marketplace | "This is the innovation. GPU provider verified on-chain via ZK proof. This tool does not exist in 0G's ecosystem yet." |
| 4 | 2:00-2:30 | `/home` | Browse marketplace: humans + GPUs + agents in one view, filter by type | "Humans, GPUs, and agents -- one marketplace, one protocol." |
| 5 | 2:30-3:00 | `/predictions` | Place $0.10 USDC bet via MiniKit.pay() → server settles on 0G Chain | "Pay USDC via World App. Server bets on 0G. Users see dollars, never native tokens." |
| 6 | 3:00-3:30 | `/home` | Lease resource → MiniKit.pay($0.10 USDC) → server settles on Hedera via x402 | "Lease a GPU. MiniKit pays USDC on World Chain. Server settles on Hedera. $0.0001 gas." |
| 7 | 3:30-4:00 | `/home` | Show reputation scores updated on resource card | "Reputation updates automatically. Our Lens agent wrote quality feedback to ERC-8004." |

---

## 3. Fallback Actions

| Failure | Fallback |
|---------|----------|
| 0G testnet down | Show pre-recorded video + point to deployed contracts on chainscan-galileo.0g.ai |
| Hedera testnet down | Show HTS tokens on testnet.hashscan.io + explain x402 flow with diagram |
| World ID not detected | Orb verification checked via address book contract on mainnet — show amber banner as graceful degradation |
| OpenClaw Gateway crash | Restart: `openclaw gateway` (~5s, agents auto-reconnect) |
| Payment fails | Show mock payment confirmation + HCS audit trail on hashscan |

---

## 4. Contract Addresses (Quick Reference)

### 0G Galileo (Chain ID 16602)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0xc16cf40a33e85f41bed6c90c710ff8c70b8c79ec` |
| ReputationRegistry | `0xa7ba63bce59d366a1c1b647e4ca75a5c11ca47f4` |
| ValidationRegistry | `0x629c61e5a8c78725c8e2cfc6d5b441a4bba0517c` |
| GPUProviderRegistry | `0x94f7d419dd3ff171cb5cd9291a510528ee1ada59` |
| MockTEEValidator | `0x8c4a192ed17dbbe2a7424c0008fafde89c730ccd` |
| ResourcePrediction | `0x82d5f12e55390016c49faab2ccb3c8d55d63fe7a` |

Explorer: `https://chainscan-galileo.0g.ai`

### World Sepolia

| Contract | Address |
|----------|---------|
| CredentialGate | `0x6B927bA02FE8E5e15D5d5f742380A49876ad3E02` |

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

**Why Hedera for leases, 0G for bets:**
"Leasing is payment-gated access — Hedera has x402 ($0.0001 gas), HTS credentials, HCS audit, zero Solidity. Bets are a DeFi primitive needing EVM smart contracts — 0G provides that. This also maximizes bounty coverage: No Solidity on Hedera ($3k) + Best DeFi on 0G ($6k)."

**How do users pay:**
"Always USDC via World App's MiniKit.pay(). Server handles chain-specific settlement — Hedera for leases, 0G for bets. Users never see A0GI or HBAR. Agents pay directly on Hedera via x402 micropayments."

**Why ERC-8004:**
"Only open standard with Validation Registry -- pluggable validators on any EVM chain"
