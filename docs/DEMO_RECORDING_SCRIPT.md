# Demo Recording Script — Step-by-Step

**Duration target:** 3 minutes (strict max 4 min — ETHGlobal rejects >4 min)
**Resolution:** 1080p minimum (720p minimum requirement)
**Audio:** Human voiceover, no AI voice, no TTS, no background music with text overlay
**Equipment:** Screen recording (QuickTime/OBS) + headphone mic for narration

---

## Pre-Recording Setup (Do Before Hitting Record)

### Browser Tabs to Pre-Open

Open these tabs in order (you'll switch between them during recording):

1. **Tab 1:** `http://localhost:3000` (or ngrok URL) — Mini App landing page
2. **Tab 2:** `https://chainscan-galileo.0g.ai/address/[IDENTITY_REGISTRY]` — ERC-8004 on 0G
3. **Tab 3:** `https://testnet.hashscan.io/topic/0.0.8499635` — HCS audit trail
4. **Tab 4:** `https://api.testnet.blocky402.com/supported` — Blocky402 live proof

### Contract Addresses (from deployments/0g-galileo.json)

```bash
# Get your addresses:
cat deployments/0g-galileo.json | grep -E "IdentityRegistry|GPUProviderRegistry|ResourcePrediction" | head -3
```

### Start Local Dev Server

```bash
cd /Users/ale.fonseca/Documents/Vocaid/vocaid-hub
./scripts/dev.sh
# Wait for "All Services Running" message
# Note the ngrok URL if using tunnel
```

### Verify Seed Data Exists

Open `http://localhost:3000/home` — should show GPU-Alpha, Seer Agent, Maria in the marketplace.

---

## Recording Script (3 minutes)

### 0:00-0:08 — Title Card

**Show:** App logo screen or just the landing page
**Say:** *"Vocaid Hub. Reliable resources for the agentic economy."*

### 0:08-0:20 — Problem (Stay on Landing Page)

**Show:** Landing page
**Say:** *"AI agents need compute, skills, and hardware. But there's no protocol for discovering or verifying providers. 0G's own developers confirmed they don't have GPU provider verification. We built it."*

### 0:20-0:25 — Architecture Flash

**Show:** Quick switch to a slide or diagram (can be a pre-made image)
**Say:** *"Three chains. World for identity. 0G for verification. Hedera for settlement."*

### 0:25-0:45 — World ID Verify

**Action sequence:**
1. Click "Verify with World ID" button on landing page
2. MiniKit dialog appears (or dev mode auto-verifies)
3. Success — redirected to marketplace

**Say:** *"World ID gates everything. Verified. Now I can access resources."*

### 0:45-1:05 — Agent Fleet (Profile Page)

**Action sequence:**
1. Click "Profile" or "My" tab in navigation
2. Show 4 agent cards: Seer, Edge, Shield, Lens
3. Point out "AgentKit ✓" and "ERC-8004 ID" on each card

**Say:** *"Four AI agents. Each registered via AgentKit with on-chain ERC-8004 identity. All linked to my World ID."*

### 1:05-2:05 — GPU Verification (KEY MOMENT — 60 seconds)

**Action sequence:**
1. Click "Resources" or "GPU" tab
2. Show "Dashboard" tab — GPU-Alpha visible with reputation signals
3. Point out: Cost $0.04, Latency 120ms, Uptime 99.2%, Quality 87
4. Switch to "Register" tab
5. Click "Connect Wallet" — wallet connects
6. Step 2 auto-populates: "Found on 0G. H100. TEE confirmed."
7. Click "Register on ERC-8004"
8. Show success: Identity NFT minted, tx hash
9. Switch to Tab 2 (block explorer) — show the contract on 0G Chain

**Say:** *"This is the innovation. Browse existing providers with reputation signals — cost, latency, uptime, quality. A GPU provider connects, we verify their TEE attestation, and register them on ERC-8004. This identity NFT is on 0G Chain. This tool doesn't exist in 0G's ecosystem yet."*

### 2:05-2:25 — Marketplace

**Action sequence:**
1. Switch back to Tab 1
2. Click "Marketplace" tab (or Home)
3. Show filter tabs: All / GPU / Agent / Human
4. Click through filters
5. Show ResourceCards with chain badges and reputation bars

**Say:** *"Humans, GPUs, and agents — one marketplace. All verified. All rated. Filter by type, sort by quality or cost."*

### 2:25-2:45 — Prediction Market

**Action sequence:**
1. Click "Predictions" tab
2. Show existing market: "Will H100 cost drop below $0.03?"
3. Show YES/NO pools with percentages
4. Place a bet (click YES, confirm)

**Say:** *"Will H100 inference cost drop next week? The market decides. Place bets on resource pricing — a new asset class."*

### 2:45-3:00 — Payment + Close

**Action sequence:**
1. Go back to marketplace
2. Click "Hire" on GPU-Alpha
3. Show payment confirmation: USDC amount, x402 on Hedera, tx hash
4. Show reputation score updated (if time)

**Say:** *"Hire a GPU provider. x402 USDC on Hedera via Blocky402. GPU verification on ERC-8004. First time it's been built."*

**End.** Stop recording at 3:00.

---

## Recording Tips

| Tip | Why |
|-----|-----|
| **Practice 2x before recording** | First take is always too long |
| **Use 2x playback in head for pacing** | 3 min goes fast |
| **Pre-click everything once** | Ensures no loading spinners during recording |
| **Close notifications** | macOS notification banners ruin recordings |
| **Use a quiet room** | ETHGlobal rejects poor audio |
| **Record at 1080p** | 720p is minimum, 1080p looks professional |
| **Keep mouse movements smooth** | Jerky cursor looks amateur |
| **Don't read a script verbatim** | Sound natural, hit the key points |

---

## Fallback: If Something Breaks During Recording

| Problem | Fallback |
|---------|----------|
| World ID dialog doesn't appear | Say "In production, World ID verifies via ZK proof" and skip |
| GPU registration tx is slow | Say "Transaction submitted" and switch to block explorer tab |
| Prediction market empty | Already seeded — should have data |
| Payment fails | Show the Blocky402 `/supported` tab (Tab 4) as proof it works |
| Marketplace is empty | Refresh — ISR cache may be stale |
