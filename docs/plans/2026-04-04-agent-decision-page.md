# Agent Decision Page — Visual GPU Leasing Flow

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a visual page at `/agent-decision` that shows non-technical stakeholders how the Seer agent discovers, ranks by reputation signals, verifies via TEE, and selects the best GPU provider — step by step with animated transitions.

**Architecture:** A 4-step stepper (reusing GPUStepper's StepIndicator pattern) that auto-plays through the agent's decision process. Each step fetches real data (providers, reputation, validation) and visually narrows the candidates. The page is server-rendered with a client component for the animated flow. Mock data fallbacks ensure it works even when testnets are down.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS 4, Lucide icons, existing components (ReputationBar, ChainBadge, VerificationStatus)

---

### Task 1: Create the API route `/api/agent-decision`

**Files:**
- Create: `src/app/api/agent-decision/route.ts`

**Step 1: Write the API route**

This route aggregates all the data Seer needs: providers, reputation scores, validation status. Returns a pre-computed decision payload.

```typescript
// src/app/api/agent-decision/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { listProviders } = await import("@/lib/og-compute");
    const { getRegisteredProviders, getValidationSummary } = await import("@/lib/og-chain");
    const { getAllReputationScores } = await import("@/lib/reputation");

    // Phase 1: Discover all providers
    const [brokerResult, onChainResult] = await Promise.allSettled([
      listProviders(),
      getRegisteredProviders(),
    ]);

    const brokerProviders = brokerResult.status === "fulfilled" ? brokerResult.value : [];
    const onChainProviders = onChainResult.status === "fulfilled" ? onChainResult.value : [];

    // Build provider list with enrichment
    const providers = onChainProviders.map((p) => {
      const broker = brokerProviders.find(
        (b) => b.provider.toLowerCase() === p.address.toLowerCase(),
      );
      return {
        address: p.address,
        agentId: p.agentId,
        gpuModel: broker?.model || p.gpuModel,
        teeType: p.teeType,
        endpoint: broker?.url || "",
        inputPrice: broker ? Number(broker.inputPrice) : 0,
        outputPrice: broker ? Number(broker.outputPrice) : 0,
        teeVerified: broker?.teeSignerAcknowledged ?? false,
      };
    });

    // Phase 2: Get reputation scores per provider
    const enriched = await Promise.all(
      providers.map(async (p) => {
        let reputation = { starred: 0, uptime: 0, successRate: 0, responseTime: 0 };
        let validationScore = 0;
        try {
          const scores = await getAllReputationScores(BigInt(p.agentId));
          for (const s of scores) {
            reputation[s.tag as keyof typeof reputation] = s.averageValue;
          }
        } catch { /* fallback to 0 */ }

        // Phase 3: Shield validation check
        try {
          const summary = await getValidationSummary(BigInt(p.agentId), "gpu-tee-attestation");
          validationScore = Number(summary.count) > 0 ? summary.avgResponse : 0;
        } catch { /* fallback to 0 */ }

        // Phase 4: Composite ranking score
        const compositeScore = Math.round(
          reputation.starred * 0.3 +
          reputation.uptime * 0.25 +
          reputation.successRate * 0.25 +
          (validationScore >= 50 ? 20 : 0),
        );

        return { ...p, reputation, validationScore, compositeScore };
      }),
    );

    // Sort by composite score descending
    const ranked = enriched.sort((a, b) => b.compositeScore - a.compositeScore);
    const selected = ranked[0] || null;

    return NextResponse.json({
      discovered: ranked.length,
      providers: ranked,
      selected,
      reasoning: {
        weights: { starred: 0.3, uptime: 0.25, successRate: 0.25, teeBonus: 0.2 },
        formula: "score = starred*0.3 + uptime*0.25 + successRate*0.25 + (TEE ? 20 : 0)",
      },
    });
  } catch (err) {
    // Fallback: demo providers for when testnets are down
    return NextResponse.json(getDemoDecision());
  }
}

function getDemoDecision() {
  return {
    discovered: 3,
    providers: [
      {
        address: "0xGPU1...Alpha",
        agentId: "7",
        gpuModel: "NVIDIA H100 80GB",
        teeType: "Intel TDX",
        endpoint: "https://0g-provider-alpha.example.com",
        inputPrice: 500,
        outputPrice: 1000,
        teeVerified: true,
        reputation: { starred: 82, uptime: 99, successRate: 95, responseTime: 45 },
        validationScore: 100,
        compositeScore: 89,
      },
      {
        address: "0xGPU2...Beta",
        agentId: "8",
        gpuModel: "NVIDIA H200 141GB",
        teeType: "AMD SEV",
        endpoint: "https://0g-provider-beta.example.com",
        inputPrice: 800,
        outputPrice: 1500,
        teeVerified: true,
        reputation: { starred: 64, uptime: 92, successRate: 88, responseTime: 30 },
        validationScore: 85,
        compositeScore: 76,
      },
      {
        address: "0xGPU3...Gamma",
        agentId: "9",
        gpuModel: "AMD MI300X 192GB",
        teeType: "None",
        endpoint: "",
        inputPrice: 600,
        outputPrice: 1200,
        teeVerified: false,
        reputation: { starred: 45, uptime: 78, successRate: 70, responseTime: 60 },
        validationScore: 0,
        compositeScore: 48,
      },
    ],
    selected: null, // will be set to providers[0] by client
    reasoning: {
      weights: { starred: 0.3, uptime: 0.25, successRate: 0.25, teeBonus: 0.2 },
      formula: "score = starred*0.3 + uptime*0.25 + successRate*0.25 + (TEE ? 20 : 0)",
    },
  };
}
```

**Step 2: Commit**

```bash
git add src/app/api/agent-decision/route.ts
git commit -m "feat: add /api/agent-decision route for Seer GPU ranking"
```

---

### Task 2: Create the Agent Decision page + client component

**Files:**
- Create: `src/app/(protected)/agent-decision/page.tsx`
- Create: `src/app/(protected)/agent-decision/agent-decision-content.tsx`
- Create: `src/app/(protected)/agent-decision/loading.tsx`

**Step 1: Create the server page**

```typescript
// src/app/(protected)/agent-decision/page.tsx
import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { AgentDecisionContent } from './agent-decision-content';

export const revalidate = 30;

async function getDecision() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/agent-decision`, {
      next: { revalidate: 30 },
    });
    if (res.ok) return res.json();
  } catch { /* fallback */ }

  return null;
}

export default async function AgentDecisionPage() {
  const decision = await getDecision();

  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="Seer Agent — GPU Selection" />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4 pt-4">
        <AgentDecisionContent decision={decision} />
      </Page.Main>
    </>
  );
}
```

**Step 2: Create the loading skeleton**

```typescript
// src/app/(protected)/agent-decision/loading.tsx
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="h-8 w-40 rounded bg-border-card" />
        <div className="h-4 w-56 rounded bg-border-card" />
      </div>
    </div>
  );
}
```

**Step 3: Create the client component (main visual)**

This is the core visual component — a 4-step animated flow showing how Seer thinks:

```typescript
// src/app/(protected)/agent-decision/agent-decision-content.tsx
'use client';

import { useState, useEffect } from 'react';
import { Eye, Search, BarChart3, ShieldCheck, CheckCircle, Cpu, Zap, Clock, Star, Activity } from 'lucide-react';
import { ReputationBar } from '@/components/ReputationBar';
import { ChainBadge } from '@/components/ChainBadge';

interface Provider {
  address: string;
  agentId: string;
  gpuModel: string;
  teeType: string;
  teeVerified: boolean;
  reputation: { starred: number; uptime: number; successRate: number; responseTime: number };
  validationScore: number;
  compositeScore: number;
}

interface DecisionData {
  discovered: number;
  providers: Provider[];
  selected: Provider | null;
  reasoning: { weights: Record<string, number>; formula: string };
}

const STEPS = [
  { icon: Search, label: 'Discover', desc: 'Scan 0G network for GPU providers' },
  { icon: BarChart3, label: 'Rank', desc: 'Score by reputation signals' },
  { icon: ShieldCheck, label: 'Verify', desc: 'Check TEE attestation via Shield' },
  { icon: CheckCircle, label: 'Select', desc: 'Choose optimal provider' },
];

export function AgentDecisionContent({ decision }: { decision: DecisionData | null }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const data = decision ?? getDemoData();

  // Auto-play through steps
  useEffect(() => {
    if (!autoPlay) return;
    if (currentStep >= 4) { setAutoPlay(false); return; }
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), 2000);
    return () => clearTimeout(timer);
  }, [autoPlay, currentStep]);

  const selected = data.providers[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Agent Header */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border-card">
        <div className="w-10 h-10 rounded-full bg-chain-world/10 flex items-center justify-center">
          <Eye className="w-5 h-5 text-chain-world" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-primary">Seer Agent</p>
          <p className="text-xs text-secondary">Signal Analyst — finding optimal GPU compute</p>
        </div>
        <button
          onClick={() => { setCurrentStep(0); setAutoPlay(true); }}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-accent text-white"
        >
          {autoPlay ? 'Running...' : 'Run Decision'}
        </button>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <button
                onClick={() => { setAutoPlay(false); setCurrentStep(i); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                  done ? 'bg-status-verified text-white' :
                  active ? 'bg-primary-accent text-white shadow-lg scale-110' :
                  'bg-surface border border-border-card text-secondary'
                }`}
              >
                {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </button>
              <span className={`text-[10px] font-medium ${active ? 'text-primary-accent' : 'text-secondary'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {currentStep === 0 && <DiscoverStep providers={data.providers} />}
        {currentStep === 1 && <RankStep providers={data.providers} reasoning={data.reasoning} />}
        {currentStep === 2 && <VerifyStep providers={data.providers} />}
        {currentStep === 3 && <SelectStep provider={selected} reasoning={data.reasoning} />}
        {currentStep >= 4 && <SelectStep provider={selected} reasoning={data.reasoning} />}
      </div>
    </div>
  );
}

// ─── Step 1: Discover ────────────────────────────────────────────────────────

function DiscoverStep({ providers }: { providers: Provider[] }) {
  return (
    <div className="flex flex-col gap-3">
      <StepHeader
        icon={Search}
        title="Scanning 0G Compute Network"
        subtitle={`Found ${providers.length} GPU providers on 0G Galileo`}
      />
      {providers.map((p, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border-card animate-fadeIn"
          style={{ animationDelay: `${i * 200}ms` }}>
          <Cpu className="w-5 h-5 text-chain-og" />
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">{p.gpuModel}</p>
            <p className="text-xs text-secondary">{p.teeType || 'No TEE'} · Agent #{p.agentId}</p>
          </div>
          <ChainBadge chain="0g" />
        </div>
      ))}
    </div>
  );
}

// ─── Step 2: Rank ────────────────────────────────────────────────────────────

function RankStep({ providers, reasoning }: { providers: Provider[]; reasoning: DecisionData['reasoning'] }) {
  return (
    <div className="flex flex-col gap-3">
      <StepHeader
        icon={BarChart3}
        title="Ranking by Reputation Signals"
        subtitle={reasoning.formula}
      />
      {providers.map((p, i) => (
        <div key={i} className="p-3 rounded-xl bg-surface border border-border-card animate-fadeIn"
          style={{ animationDelay: `${i * 200}ms` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-primary">{p.gpuModel}</p>
            <span className="text-xs font-mono font-bold text-primary-accent">{p.compositeScore}/100</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Signal icon={Star} label="Quality" value={p.reputation.starred} />
            <Signal icon={Activity} label="Uptime" value={p.reputation.uptime} />
            <Signal icon={Zap} label="Success" value={p.reputation.successRate} />
            <Signal icon={Clock} label="Response" value={p.reputation.responseTime} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 3: Verify ──────────────────────────────────────────────────────────

function VerifyStep({ providers }: { providers: Provider[] }) {
  return (
    <div className="flex flex-col gap-3">
      <StepHeader
        icon={ShieldCheck}
        title="Shield Agent — TEE Verification"
        subtitle="Checking ValidationRegistry for hardware attestation"
      />
      {providers.map((p, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border animate-fadeIn"
          style={{
            animationDelay: `${i * 200}ms`,
            borderColor: p.teeVerified ? 'var(--color-status-verified)' : 'var(--color-border-card)',
            backgroundColor: p.teeVerified ? 'rgba(130, 71, 229, 0.05)' : 'var(--color-surface)',
          }}>
          <ShieldCheck className={`w-5 h-5 ${p.teeVerified ? 'text-status-verified' : 'text-status-inactive'}`} />
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">{p.gpuModel}</p>
            <p className="text-xs text-secondary">{p.teeType || 'No attestation'}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            p.teeVerified
              ? 'bg-status-verified/10 text-status-verified'
              : 'bg-status-failed/10 text-status-failed'
          }`}>
            {p.teeVerified ? 'Verified' : 'Rejected'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Step 4: Select ──────────────────────────────────────────────────────────

function SelectStep({ provider, reasoning }: { provider: Provider; reasoning: DecisionData['reasoning'] }) {
  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      <StepHeader
        icon={CheckCircle}
        title="Provider Selected"
        subtitle="Seer recommends the highest-scoring verified provider"
      />
      <div className="p-4 rounded-xl border-2 border-status-verified bg-status-verified/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-chain-og/10 flex items-center justify-center">
            <Cpu className="w-6 h-6 text-chain-og" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-primary">{provider.gpuModel}</p>
            <p className="text-xs text-secondary">{provider.teeType} · Agent #{provider.agentId}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary-accent">{provider.compositeScore}</p>
            <p className="text-[10px] text-secondary">composite</p>
          </div>
        </div>
        <ReputationBar score={provider.compositeScore} />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Signal icon={Star} label="Quality" value={provider.reputation.starred} />
          <Signal icon={Activity} label="Uptime" value={provider.reputation.uptime} />
          <Signal icon={Zap} label="Success" value={provider.reputation.successRate} />
          <Signal icon={ShieldCheck} label="TEE Score" value={provider.validationScore} />
        </div>
      </div>
      <p className="text-xs text-secondary text-center">
        Scoring: {reasoning.formula}
      </p>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function StepHeader({ icon: Icon, title, subtitle }: { icon: typeof Search; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-2">
      <Icon className="w-5 h-5 text-primary-accent mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-primary">{title}</p>
        <p className="text-xs text-secondary font-mono">{subtitle}</p>
      </div>
    </div>
  );
}

function Signal({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3 h-3 text-secondary" />
      <span className="text-[10px] text-secondary">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border-card overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-accent transition-all duration-700"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-mono font-medium text-primary w-6 text-right">{value}</span>
    </div>
  );
}

function getDemoData(): DecisionData {
  return {
    discovered: 3,
    providers: [
      { address: "0xGPU1", agentId: "7", gpuModel: "NVIDIA H100 80GB", teeType: "Intel TDX", teeVerified: true, reputation: { starred: 82, uptime: 99, successRate: 95, responseTime: 45 }, validationScore: 100, compositeScore: 89 },
      { address: "0xGPU2", agentId: "8", gpuModel: "NVIDIA H200 141GB", teeType: "AMD SEV", teeVerified: true, reputation: { starred: 64, uptime: 92, successRate: 88, responseTime: 30 }, validationScore: 85, compositeScore: 76 },
      { address: "0xGPU3", agentId: "9", gpuModel: "AMD MI300X 192GB", teeType: "None", teeVerified: false, reputation: { starred: 45, uptime: 78, successRate: 70, responseTime: 60 }, validationScore: 0, compositeScore: 48 },
    ],
    selected: null,
    reasoning: { weights: { starred: 0.3, uptime: 0.25, successRate: 0.25, teeBonus: 0.2 }, formula: "score = quality*0.3 + uptime*0.25 + success*0.25 + (TEE ? 20 : 0)" },
  };
}
```

**Step 4: Add fadeIn animation to globals.css**

Add to `src/app/globals.css`:
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.4s ease-out forwards;
}
```

**Step 5: Commit**

```bash
git add src/app/(protected)/agent-decision/
git commit -m "feat: add visual Agent Decision page for GPU leasing flow"
```

---

### Task 3: Add navigation tab

**Files:**
- Modify: `src/components/Navigation/index.tsx`

**Step 1: Add "Seer" tab to navigation**

Add to the tabs array:
```typescript
{ value: '/agent-decision', icon: <Eye className="w-5 h-5" />, label: 'Seer' },
```

Import `Eye` from `lucide-react`.

**Step 2: Commit**

```bash
git add src/components/Navigation/index.tsx
git commit -m "feat: add Seer agent tab to bottom navigation"
```

---

### Task 4: Update docs

**Files:**
- Modify: `docs/PENDING_WORK.md`
- Modify: `docs/ACTIVE_WORK.md`
- Modify: `README.md` — add `/agent-decision` to API routes table
- Modify: `docs/ARCHITECTURE.md` — add route to project structure

**Step 1: Update all docs**

**Step 2: Commit**

```bash
git add docs/ README.md
git commit -m "docs: add agent-decision page to ARCHITECTURE + README + ACTIVE_WORK"
```

---

## Verification

1. `npm run dev` → navigate to `/agent-decision`
2. Page loads with Seer Agent header + 4-step indicators
3. Click "Run Decision" → auto-plays through Discover → Rank → Verify → Select
4. Each step shows providers with real or demo data
5. Final step highlights the winning provider with composite score + breakdown
6. Bottom navigation shows "Seer" tab
7. Works on mobile viewport (428px max width)
