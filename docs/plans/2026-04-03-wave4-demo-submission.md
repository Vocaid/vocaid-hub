# Wave 4: Demo Seed Data + Submission Docs — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create demo seed script, demo flow doc, and all submission docs (README, SUBMISSION.md, AI_ATTRIBUTION.md) so judges can evaluate the project.

**Architecture:** Seed script uses viem (0G Chain) and @hashgraph/sdk (Hedera) to populate on-chain demo state. Docs pull contract addresses from `deployments/*.json` and track info from `docs/PARTNER_BOUNTIES.md`.

**Tech Stack:** viem, @hashgraph/sdk, ethers v6, TypeScript, Markdown

**No test framework exists.** Verification is via script output and `npm run build`.

---

### Task 1: Seed Demo Data Script

**Files:**
- Create: `scripts/seed-demo-data.ts`

**Reference files (read-only):**
- `scripts/deploy-0g.ts` — viem client pattern
- `scripts/register-agents.ts` — IdentityRegistry.register() pattern
- `src/lib/contracts.ts` — ABIs for ReputationRegistry, GPUProviderRegistry
- `deployments/0g-galileo.json` — contract addresses
- `deployments/hedera-testnet.json` — Hedera token/topic IDs

**Step 1: Create seed script with viem client setup**

```typescript
// scripts/seed-demo-data.ts
import 'dotenv/config';
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync, writeFileSync } from 'fs';

// --- Config ---
const OG_RPC = process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai';
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not set in .env');
  process.exit(1);
}

const ogGalileo = {
  id: 16602,
  name: '0G Galileo',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: { default: { http: [OG_RPC] } },
} as const;

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: ogGalileo,
  transport: http(OG_RPC),
});
const publicClient = createPublicClient({
  chain: ogGalileo,
  transport: http(OG_RPC),
});

// Load deployment addresses
const deployments = JSON.parse(
  readFileSync('deployments/0g-galileo.json', 'utf-8')
);
const contracts = deployments.contracts;

// --- ABIs (minimal) ---
const IDENTITY_ABI = parseAbi([
  'function register(string agentURI, (string metadataKey, bytes metadataValue)[] metadata) returns (uint256)',
]);

const GPU_PROVIDER_ABI = parseAbi([
  'function registerProvider(address provider, string gpuModel, uint256 vram, string attestationURI)',
]);

const REPUTATION_ABI = parseAbi([
  'function giveFeedback(uint256 agentId, int128 value, uint8 decimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)',
]);

const PREDICTION_ABI = parseAbi([
  'function createMarket(string question, uint256 resolutionTime) returns (uint256)',
]);

// --- Helpers ---
function encodeString(s: string): Hex {
  return `0x${Buffer.from(s).toString('hex')}`;
}

async function sendTx(to: Hex, data: Hex, label: string): Promise<Hex> {
  console.log(`⏳ ${label}...`);
  const hash = await walletClient.sendTransaction({ to, data });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    retryCount: 30,
    pollingInterval: 5_000,
  });
  if (receipt.status !== 'success') throw new Error(`${label} reverted`);
  console.log(`✅ ${label} — tx: ${hash}`);
  return hash;
}

// --- Phase 1: Register GPU providers on IdentityRegistry ---
async function seedGPUProviders() {
  console.log('\n📦 Phase 1: Register GPU providers...');
  const providers = [
    {
      name: 'GPU-Alpha',
      uri: '/agent-cards/gpu-alpha.json',
      model: 'H100',
      vram: '80',
      role: 'gpu-provider',
    },
    {
      name: 'GPU-Beta',
      uri: '/agent-cards/gpu-beta.json',
      model: 'H200',
      vram: '141',
      role: 'gpu-provider',
    },
  ];

  const agentIds: string[] = [];
  for (const p of providers) {
    const metadata = [
      { metadataKey: 'role', metadataValue: encodeString(p.role) },
      { metadataKey: 'type', metadataValue: encodeString('gpu-provider') },
      { metadataKey: 'gpu_model', metadataValue: encodeString(p.model) },
      { metadataKey: 'vram_gb', metadataValue: encodeString(p.vram) },
    ];
    const data = encodeFunctionData({
      abi: IDENTITY_ABI,
      functionName: 'register',
      args: [p.uri, metadata],
    });
    const hash = await sendTx(
      contracts.IdentityRegistry as Hex,
      data,
      `Register ${p.name}`
    );

    // Extract agentId from Transfer event (topic[3])
    const receipt = await publicClient.getTransactionReceipt({ hash });
    const transferLog = receipt.logs.find(
      (l) => l.topics.length >= 4
    );
    const agentId = transferLog
      ? String(BigInt(transferLog.topics[3]!))
      : 'unknown';
    agentIds.push(agentId);
    console.log(`   AgentId: ${agentId}`);
  }
  return agentIds;
}

// --- Phase 2: Seed reputation scores ---
async function seedReputation(agentIds: string[]) {
  console.log('\n⭐ Phase 2: Seed reputation scores...');
  const feedbacks = [
    { tag1: 'quality', tag2: 'inference', value: 82 },
    { tag1: 'uptime', tag2: 'monthly', value: 97 },
    { tag1: 'latency', tag2: 'p99', value: 45 },
  ];

  for (const id of agentIds) {
    for (const fb of feedbacks) {
      const data = encodeFunctionData({
        abi: REPUTATION_ABI,
        functionName: 'giveFeedback',
        args: [
          BigInt(id),
          BigInt(fb.value),
          2, // decimals
          fb.tag1,
          fb.tag2,
          '',
          '',
          '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
        ],
      });
      await sendTx(
        contracts.ReputationRegistry as Hex,
        data,
        `Reputation ${fb.tag1} for agent ${id}`
      );
    }
  }
}

// --- Phase 3: Create prediction markets ---
async function seedPredictions() {
  console.log('\n📈 Phase 3: Create prediction markets...');
  const markets = [
    {
      question: 'Will H100 inference cost drop below $0.03/call by next week?',
      daysUntilResolution: 7,
    },
    {
      question: 'Will Rust developer demand exceed 500 requests this month?',
      daysUntilResolution: 30,
    },
    {
      question: 'Will EU GPU capacity utilization exceed 80% this quarter?',
      daysUntilResolution: 14,
    },
  ];

  for (const m of markets) {
    const resolutionTime = BigInt(
      Math.floor(Date.now() / 1000) + m.daysUntilResolution * 86400
    );
    const data = encodeFunctionData({
      abi: PREDICTION_ABI,
      functionName: 'createMarket',
      args: [m.question, resolutionTime],
    });
    await sendTx(
      contracts.ResourcePrediction as Hex,
      data,
      `Market: "${m.question.slice(0, 40)}..."`
    );
  }
}

// --- Main ---
async function main() {
  console.log('🚀 Vocaid Hub — Demo Seed Data');
  console.log(`   Chain: 0G Galileo (${OG_RPC})`);
  console.log(`   Account: ${account.address}\n`);

  const agentIds = await seedGPUProviders();
  await seedReputation(agentIds);
  await seedPredictions();

  // Save seed results
  const results = {
    seededAt: new Date().toISOString(),
    gpuProviderAgentIds: agentIds,
    predictionMarkets: 3,
    reputationScores: agentIds.length * 3,
  };
  writeFileSync(
    'deployments/seed-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('\n🎉 Seed complete! Results saved to deployments/seed-results.json');
}

main().catch((e) => {
  console.error('❌ Seed failed:', e.message);
  process.exit(1);
});
```

**Step 2: Verify script compiles**

Run: `npx tsc --noEmit scripts/seed-demo-data.ts 2>&1 | head -20`
Expected: No errors (or only viem import-related — acceptable for script)

**Step 3: Commit**

```bash
git add scripts/seed-demo-data.ts
git commit -m "feat(demo): add seed data script for GPU providers, reputation, and prediction markets"
```

---

### Task 2: Demo Flow Documentation

**Files:**
- Create: `scripts/demo-flow.md`

**Reference files (read-only):**
- `docs/PITCH_STRATEGY.md` — timing, key lines
- `docs/SCREEN_FLOW.md` — screen-by-screen specs
- `docs/WAVE_EXECUTION_PLAN.md` — demo script section

**Step 1: Write demo-flow.md**

Content should include:
1. **Pre-flight checklist** — env vars set, `npm run dev` running, seed data populated
2. **7-step demo** (4 minutes total) with exact route, action, and key line per step
3. **Fallback actions** for each testnet failure scenario
4. **CLI commands** to run seed, start dev, verify contracts

**Step 2: Commit**

```bash
git add scripts/demo-flow.md
git commit -m "docs(demo): add 7-step demo flow with pre-flight checklist and fallbacks"
```

---

### Task 3: README.md Rewrite

**Files:**
- Modify: `README.md` (currently 1 line)

**Reference files (read-only):**
- `docs/ARCHITECTURE.md` — 3-layer design
- `docs/PARTNER_BOUNTIES.md` — track details
- `docs/PITCH_STRATEGY.md` — one-sentence pitch
- `.env.example` — all env vars
- `deployments/*.json` — contract addresses

**Step 1: Rewrite README.md with these sections**

1. **Hero** — Project name, one-sentence description, 3 partner badges
2. **Architecture** — Text diagram: World (Trust) → 0G (Verify) → Hedera (Settle)
3. **Features** — 7 bullet points matching 7 bounty tracks
4. **Tech Stack** — Table of SDKs, chains, purpose
5. **Getting Started** — `npm install`, env setup, `npm run dev`
6. **Deployed Contracts** — Tables for 0G, World, Hedera with addresses + explorer links
7. **Demo** — How to run seed script + demo flow
8. **Bounty Tracks** — Which 8 tracks targeted, what satisfies each
9. **Project Structure** — Key directories
10. **Team** — Placeholder for team info
11. **License** — MIT

**Step 2: Verify markdown renders**

Run: `head -5 README.md` to confirm header
Expected: `# Vocaid Hub — Reliable Resources for the Agentic Economy`

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with architecture, setup, and bounty tracks"
```

---

### Task 4: SUBMISSION.md

**Files:**
- Create: `SUBMISSION.md`

**Reference files (read-only):**
- `docs/PARTNER_BOUNTIES.md` — exact track requirements
- `deployments/0g-galileo.json` — 0G contract addresses
- `deployments/world-sepolia.json` — World contract address
- `deployments/hedera-testnet.json` — Hedera token/topic IDs

**Step 1: Write SUBMISSION.md with these sections**

1. **Event** — ETHGlobal Cannes 2026, April 3-5
2. **Project** — Vocaid Hub, one-sentence description
3. **Partners** — World + 0G + Hedera
4. **Tracks Targeted** (8 tracks):
   - World AgentKit ($8k) — 4 agents via AgentKit, ERC-8004 identity
   - World ID 4.0 ($8k) — CredentialGate hard gate
   - World MiniKit 2.0 ($4k) — Full Mini App
   - 0G OpenClaw Agent ($6k) — GPU verification + OpenClaw fleet
   - 0G Wildcard ($3k) — Multi-resource marketplace
   - Hedera AI/Agentic ($6k) — x402 USDC via Blocky402
   - Hedera No Solidity ($3k) — Pure @hashgraph/sdk
   - Hedera Tokenization ($2.5k) — HTS soulbound credentials
5. **Deployed Contracts** — All addresses with block explorer URLs
6. **Innovation** — GPU provider verification gap (first on ERC-8004)
7. **Team** — Names, roles
8. **Links** — GitHub, demo video, live app

**Step 2: Commit**

```bash
git add SUBMISSION.md
git commit -m "docs: add SUBMISSION.md with 8 bounty tracks and deployed contract addresses"
```

---

### Task 5: AI_ATTRIBUTION.md

**Files:**
- Create: `AI_ATTRIBUTION.md`

**Step 1: Write AI_ATTRIBUTION.md**

Sections:
1. **AI Tools Used** — Claude Code (Anthropic) for architecture, implementation, documentation
2. **Human Decisions** — Architecture (World+0G+Hedera), partner selection, bounty strategy, UX design
3. **AI-Generated Code** — All implementation code written during 48h hackathon window with AI assistance
4. **Pre-existing Code** — ERC-8004 contracts (open source), Automata DCAP (open source), MiniKit starter kit
5. **AI in Product** — 4 OpenClaw agents (Seer, Edge, Shield, Lens) use LLM inference via 0G Compute

**Step 2: Commit**

```bash
git add AI_ATTRIBUTION.md
git commit -m "docs: add AI_ATTRIBUTION.md for hackathon transparency"
```

---

### Task 6: Final Verification

**Step 1: Build check**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 2: Update ACTIVE_WORK.md — mark Wave 4 complete**

Move Agent 6 row to Recently Completed section.

**Step 3: Commit**

```bash
git add docs/ACTIVE_WORK.md
git commit -m "docs: mark Wave 4 (Demo + Polish + Submission) complete"
```
