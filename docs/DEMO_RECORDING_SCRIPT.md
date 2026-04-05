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

### 0:25-0:45 — Wallet Login + Auto-Verify

**Action sequence:**
1. Tap "Login with Wallet" on landing page
2. World App wallet picker opens → sign in
3. Redirected to marketplace — orb-verified users pass all gates automatically

**Say:** *"Login with World App. Orb-verified users access everything instantly. Unverified users can browse but get a friendly verification gate on actions like hiring or betting."*

### 0:45-1:45 — GPU Verification (KEY MOMENT — 60 seconds)

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

### 1:45-2:10 — Marketplace + Hire (25s)

**Action sequence:**
1. Click "Market" tab
2. Show filter tabs: All / GPU / Agent / Human / DePIN
3. Show the GPU you just registered alongside agents, humans, DePIN
4. Tap "Lease" on a resource → MiniKit.pay() opens World App USDC payment
5. User confirms $0.10 USDC → server settles on Hedera via x402
6. Show PaymentConfirmation: amount + Hedera tx hash + HashScan link

**Say:** *"Lease a GPU. Pay $0.10 USDC through World App — native payment, one tap. Server settles on Hedera via x402. $0.0001 gas. Users pay in USDC, agents settle on the destination chain."*

### 2:10-2:35 — Seer Agent Decision (25s)

**Action sequence:**
1. Navigate to `/agent-decision` (via link or direct URL)
2. Select resource type and signal filters
3. Click "Run Seer Decision"
4. Watch 4-step auto-play: Discover → Rank → Verify → Select
5. Show the GPU you registered being ranked and selected

**Say:** *"Seer agent scans the network, ranks by reputation signals, verifies TEE attestation via Shield, selects the optimal provider. All on-chain via 0G."*

### 2:35-2:50 — Prediction Market (15s)

**Action sequence:**
1. Click "Predict" tab
2. Show existing market: "Will H100 cost drop below $0.03?"
3. Place a bet (YES, $0.10) → MiniKit.pay() USDC payment
4. Server settles bet on 0G Chain with deployer's A0GI
5. Show price impact preview and confirmation

**Say:** *"Prediction markets. Pay $0.10 USDC via World App. Server places the bet on 0G Chain. Users see USDC, never native tokens."*

### 2:50-3:00 — Profile + Connect Your Agent + Close (10s)

**Action sequence:**
1. Click "Profile" tab
2. Show "Connect Your Agent" section — generate API key
3. Show chain selector (0G/Hedera/World) and agent wallet config
4. Copy key snippet for OpenClaw config

**Say:** *"Connect your own agent. Pick a chain, enter your wallet, generate an API key. Your OpenClaw agent adds it as X-API-Key header — instant access to all four services. Private key stays on your machine, never touches our server. Keys expire in 90 days, rate limited, wallet-verified."*

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
| World ID verification not detected | Say "Orb verification is checked automatically via World ID address book on mainnet" and skip |
| GPU registration tx is slow | Say "Transaction submitted" and switch to block explorer tab |
| Prediction market empty | Already seeded — should have data |
| Payment fails | Show the Blocky402 `/supported` tab (Tab 4) as proof it works |
| Marketplace is empty | Refresh — ISR cache may be stale |
