# Prediction Markets — Full Lifecycle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the prediction markets DeFi product loop — create markets, resolve outcomes, claim winnings, and preview price impact before betting.

**Architecture:** All prediction logic runs on 0G Galileo via `ResourcePrediction.sol` at `0x82d5f12e55390016c49faab2ccb3c8d55d63fe7a`. API routes sign transactions server-side using `PRIVATE_KEY`. Market resolution events are cross-chain logged to Hedera HCS topic `0.0.8499635`. Price impact is computed client-side via pure functions.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS 4, ethers v6, @hashgraph/sdk, Lucide React

---

## Task 1: prediction-math.ts — Pure Pool Math Functions

**Files:**
- Create: `src/lib/prediction-math.ts`

**Step 1: Create the module**

```typescript
// src/lib/prediction-math.ts

/**
 * Pure functions for prediction market pool math.
 * All BigInt arithmetic — no external dependencies.
 */

const PRECISION = 10_000n; // basis points for integer math

export interface BetSimulation {
  newYesOdds: number;
  newNoOdds: number;
  priceImpact: number;
  estimatedPayout: bigint;
  estimatedMultiplier: number;
}

export function simulateBet(
  yesPool: bigint,
  noPool: bigint,
  side: 'yes' | 'no',
  amount: bigint,
): BetSimulation {
  const totalBefore = yesPool + noPool;
  if (totalBefore === 0n) {
    // First bet — no impact
    return {
      newYesOdds: side === 'yes' ? 1 : 0,
      newNoOdds: side === 'no' ? 1 : 0,
      priceImpact: 0,
      estimatedPayout: amount, // only bettor, gets everything back
      estimatedMultiplier: 1,
    };
  }

  const oldYesOdds = Number(yesPool * PRECISION / totalBefore) / Number(PRECISION);

  const newYesPool = side === 'yes' ? yesPool + amount : yesPool;
  const newNoPool = side === 'no' ? noPool + amount : noPool;
  const totalAfter = newYesPool + newNoPool;

  const newYesOdds = Number(newYesPool * PRECISION / totalAfter) / Number(PRECISION);
  const newNoOdds = 1 - newYesOdds;

  const priceImpact = Math.abs(newYesOdds - oldYesOdds);

  // Payout if user's side wins: (userBet / winningPool) * totalPool
  const winningPool = side === 'yes' ? newYesPool : newNoPool;
  const estimatedPayout = winningPool > 0n
    ? (amount * totalAfter) / winningPool
    : 0n;

  const estimatedMultiplier = amount > 0n
    ? Number(estimatedPayout * PRECISION / amount) / Number(PRECISION)
    : 0;

  return {
    newYesOdds,
    newNoOdds,
    priceImpact,
    estimatedPayout,
    estimatedMultiplier,
  };
}

export function formatOdds(odds: number): string {
  return `${(odds * 100).toFixed(1)}%`;
}

export function formatMultiplier(m: number): string {
  return `${m.toFixed(1)}x`;
}

export function isHighImpact(impact: number): boolean {
  return impact > 0.05;
}

export function isBlockedImpact(impact: number): boolean {
  return impact > 0.10;
}

export function formatPool(wei: string): string {
  const val = Number(BigInt(wei)) / 1e18;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  if (val >= 1) return val.toFixed(1);
  return val.toFixed(4);
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/lib/prediction-math.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/prediction-math.ts
git commit -m "feat(predictions): add pure pool math functions for bet simulation"
```

---

## Task 2: POST /api/predictions — Create Market Endpoint

**Files:**
- Modify: `src/app/api/predictions/route.ts` (add POST handler alongside existing GET)

**Step 1: Read the existing file**

The current file only exports `GET`. We need to add `POST` in the same file.

**Step 2: Add POST handler**

Add this after the existing `GET` export in `src/app/api/predictions/route.ts`:

```typescript
export async function POST(req: Request) {
  try {
    await requireWorldId();

    const body = await req.json();
    const { question, resolutionTime, initialSide, initialAmount } = body as {
      question: string;
      resolutionTime: number; // unix timestamp (seconds)
      initialSide?: 'yes' | 'no';
      initialAmount?: number; // in A0GI (decimal)
    };

    if (!question || !resolutionTime) {
      return NextResponse.json(
        { error: 'question and resolutionTime required' },
        { status: 400 },
      );
    }

    if (resolutionTime <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        { error: 'resolutionTime must be in the future' },
        { status: 400 },
      );
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai',
    );
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(
      process.env.RESOURCE_PREDICTION!,
      [
        ...RESOURCE_PREDICTION_ABI,
        'function createMarket(string,uint256) returns (uint256)',
        'function placeBet(uint256,uint8) payable',
        'function nextMarketId() view returns (uint256)',
      ],
      signer,
    );

    // Create the market
    const createTx = await contract.createMarket(question, resolutionTime);
    const createReceipt = await createTx.wait();

    // Get the new market ID (nextMarketId - 1 after creation)
    const nextId = await contract.nextMarketId();
    const marketId = Number(nextId) - 1;

    let betTxHash: string | null = null;

    // Optional initial bet
    if (initialSide && initialAmount && initialAmount > 0) {
      const outcomeEnum = initialSide === 'yes' ? 1 : 2;
      const betTx = await contract.placeBet(marketId, outcomeEnum, {
        value: ethers.parseEther(String(initialAmount)),
      });
      const betReceipt = await betTx.wait();
      betTxHash = betReceipt.hash;
    }

    return NextResponse.json({
      success: true,
      marketId,
      txHash: createReceipt.hash,
      betTxHash,
    });
  } catch (err) {
    console.error('[predictions/POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create market' },
      { status: 500 },
    );
  }
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 4: Commit**

```bash
git add src/app/api/predictions/route.ts
git commit -m "feat(predictions): add POST endpoint for market creation"
```

---

## Task 3: CreateMarketModal Component

**Files:**
- Create: `src/components/CreateMarketModal.tsx`

**Step 1: Create the component**

```typescript
// src/components/CreateMarketModal.tsx
'use client';

import { useState } from 'react';
import { TrendingUp, Loader2, X } from 'lucide-react';

interface CreateMarketModalProps {
  onClose: () => void;
  onCreated: (marketId: number) => void;
}

const DATE_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

const AMOUNT_PRESETS = [1, 5, 10];

export function CreateMarketModal({ onClose, onCreated }: CreateMarketModalProps) {
  const [question, setQuestion] = useState('');
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [initialSide, setInitialSide] = useState<'yes' | 'no' | null>(null);
  const [initialAmount, setInitialAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = question.trim().length > 0 && selectedDays !== null && !loading;

  async function handleSubmit() {
    if (!canSubmit || selectedDays === null) return;
    setLoading(true);
    setError(null);

    const resolutionTime = Math.floor(Date.now() / 1000) + selectedDays * 86400;

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          resolutionTime,
          initialSide: initialSide ?? undefined,
          initialAmount: initialAmount ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create market');
      }

      const data = await res.json();
      onCreated(data.marketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-[428px] rounded-t-2xl bg-white p-6 pb-10 flex flex-col gap-5 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-chain-hedera/10">
            <TrendingUp className="w-8 h-8 text-chain-hedera" />
          </div>
          <h2 className="text-xl font-bold text-primary">New Prediction Market</h2>
          <p className="text-sm text-secondary">Create a market for any resource</p>
        </div>

        {/* Question */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="market-question" className="text-sm font-medium text-primary">
            What will happen?
          </label>
          <textarea
            id="market-question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Will H100 spot price drop 20% by June?"
            className="rounded-xl border border-border-card bg-surface p-3 text-sm text-primary placeholder:text-secondary/50 resize-none focus:outline-none focus:ring-2 focus:ring-chain-hedera/30"
          />
        </div>

        {/* Resolution Date */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-primary">Resolution Date</span>
          <div className="flex gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.days}
                onClick={() => setSelectedDays(preset.days)}
                className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                  selectedDays === preset.days
                    ? 'bg-chain-hedera text-white'
                    : 'bg-surface border border-border-card text-secondary'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Initial Position (optional) */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-secondary uppercase tracking-wide">
            Initial Position (optional)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setInitialSide(initialSide === 'yes' ? null : 'yes')}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                initialSide === 'yes'
                  ? 'bg-status-verified/10 text-status-verified border border-status-verified/30'
                  : 'bg-surface border border-border-card text-secondary'
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setInitialSide(initialSide === 'no' ? null : 'no')}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                initialSide === 'no'
                  ? 'bg-status-failed/10 text-status-failed border border-status-failed/30'
                  : 'bg-surface border border-border-card text-secondary'
              }`}
            >
              NO
            </button>
          </div>

          {initialSide && (
            <div className="flex gap-2 animate-fade-in">
              {AMOUNT_PRESETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setInitialAmount(initialAmount === amt ? null : amt)}
                  className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                    initialAmount === amt
                      ? 'bg-chain-hedera text-white'
                      : 'bg-surface border border-border-card text-secondary'
                  }`}
                >
                  {amt} A0GI
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-status-failed/10 border border-status-failed/30 p-3 text-sm text-status-failed">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="min-h-[44px] rounded-lg bg-chain-hedera text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Market'
          )}
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="min-h-[44px] rounded-lg border border-border-card text-primary text-sm font-medium active:scale-95 transition-transform"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add src/components/CreateMarketModal.tsx
git commit -m "feat(predictions): add CreateMarketModal bottom sheet component"
```

---

## Task 4: Wire CreateMarketModal into PredictionsContent

**Files:**
- Modify: `src/app/(protected)/predictions/predictions-content.tsx`

**Step 1: Add modal state and import**

At the top of the file, add the import:
```typescript
import { CreateMarketModal } from '@/components/CreateMarketModal';
```

Add state inside the component:
```typescript
const [showCreateModal, setShowCreateModal] = useState(false);
```

**Step 2: Wire the existing "Create Market" button**

Replace the existing Create Market button's `onClick` (currently missing a handler) with:
```typescript
onClick={() => setShowCreateModal(true)}
```

**Step 3: Add modal render and refresh handler**

Before the closing `</div>` of the component, add:
```typescript
{showCreateModal && (
  <CreateMarketModal
    onClose={() => setShowCreateModal(false)}
    onCreated={async () => {
      setShowCreateModal(false);
      // Refresh markets from API
      try {
        const res = await fetch('/api/predictions');
        if (res.ok) {
          const data = await res.json();
          setMarkets(data);
        }
      } catch { /* swallow — ISR will catch up */ }
    }}
  />
)}
```

**Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 5: Commit**

```bash
git add src/app/\(protected\)/predictions/predictions-content.tsx
git commit -m "feat(predictions): wire CreateMarketModal into predictions page"
```

---

## Task 5: Resolve Market API Route

**Files:**
- Create: `src/app/api/predictions/[id]/resolve/route.ts`

**Step 1: Create the route**

```typescript
// src/app/api/predictions/[id]/resolve/route.ts
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { logAuditMessage } from '@/lib/hedera';

const RESOLVE_ABI = [
  'function resolveMarket(uint256,uint8)',
  'function getMarket(uint256) view returns (tuple(string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool, address creator))',
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const marketId = parseInt(id, 10);
    if (isNaN(marketId)) {
      return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });
    }

    const body = await req.json();
    const { outcome } = body as { outcome: 'yes' | 'no' };

    if (outcome !== 'yes' && outcome !== 'no') {
      return NextResponse.json(
        { error: 'outcome must be "yes" or "no"' },
        { status: 400 },
      );
    }

    const outcomeEnum = outcome === 'yes' ? 1 : 2;

    const provider = new ethers.JsonRpcProvider(
      process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai',
    );
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(
      process.env.RESOURCE_PREDICTION!,
      RESOLVE_ABI,
      signer,
    );

    const tx = await contract.resolveMarket(marketId, outcomeEnum);
    const receipt = await tx.wait();

    // Cross-chain audit: log resolution to Hedera HCS
    const auditTopicId = process.env.HEDERA_AUDIT_TOPIC || '0.0.8499635';
    try {
      const market = await contract.getMarket(marketId);
      await logAuditMessage(auditTopicId, JSON.stringify({
        event: 'market_resolved',
        marketId,
        outcome,
        question: market.question,
        totalPool: (market.yesPool + market.noPool).toString(),
        txHash: receipt.hash,
        chain: '0g-galileo',
        timestamp: new Date().toISOString(),
      }));
    } catch (hcsErr) {
      console.error('[resolve] HCS audit failed (non-blocking):', hcsErr);
    }

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      marketId,
      outcome,
    });
  } catch (err) {
    console.error('[predictions/resolve]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to resolve market' },
      { status: 500 },
    );
  }
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add src/app/api/predictions/\[id\]/resolve/route.ts
git commit -m "feat(predictions): add oracle resolve endpoint with Hedera HCS audit"
```

---

## Task 6: Claim Winnings / Refund API Route

**Files:**
- Create: `src/app/api/predictions/[id]/claim/route.ts`

**Step 1: Create the route**

```typescript
// src/app/api/predictions/[id]/claim/route.ts
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const CLAIM_ABI = [
  'function claimWinnings(uint256)',
  'function claimRefund(uint256)',
  'function getMarket(uint256) view returns (tuple(string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool, address creator))',
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const marketId = parseInt(id, 10);
    if (isNaN(marketId)) {
      return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai',
    );
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(
      process.env.RESOURCE_PREDICTION!,
      CLAIM_ABI,
      signer,
    );

    // Check market state to pick the right function
    const market = await contract.getMarket(marketId);
    const state = Number(market.state);

    let tx;
    let action: string;

    if (state === 1) {
      // Resolved — claim winnings
      tx = await contract.claimWinnings(marketId);
      action = 'claimWinnings';
    } else if (state === 2) {
      // Cancelled — claim refund
      tx = await contract.claimRefund(marketId);
      action = 'claimRefund';
    } else {
      return NextResponse.json(
        { error: 'Market is still active — cannot claim yet' },
        { status: 400 },
      );
    }

    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      marketId,
      action,
    });
  } catch (err) {
    console.error('[predictions/claim]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to claim' },
      { status: 500 },
    );
  }
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add src/app/api/predictions/\[id\]/claim/route.ts
git commit -m "feat(predictions): add claim winnings/refund endpoint"
```

---

## Task 7: Enhanced PredictionCard — Resolution, Claims, and Price Impact

**Files:**
- Modify: `src/components/PredictionCard.tsx` (full rewrite preserving existing behavior + adding 3 features)

**Step 1: Rewrite the component**

This is the largest task. The new PredictionCard must handle:
- **Active state**: existing bet UI + price impact preview + oracle resolve buttons
- **Resolved state**: winner claim / loser badge
- **Cancelled state**: refund claim

Replace the entire content of `src/components/PredictionCard.tsx` with:

```typescript
'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  Loader2,
  Check,
  X,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import {
  simulateBet,
  formatOdds,
  formatMultiplier,
  isHighImpact,
  isBlockedImpact,
  formatPool,
} from '@/lib/prediction-math';

export interface PredictionMarket {
  id: number;
  question: string;
  yesPool: string;
  noPool: string;
  resolutionTime: number;
  state: number; // 0=Active, 1=Resolved, 2=Cancelled
  winningOutcome?: number; // 1=Yes, 2=No
}

interface PredictionCardProps {
  market: PredictionMarket;
  onBet: (marketId: number, side: 'yes' | 'no', amount: number) => Promise<void>;
  onResolve?: (marketId: number, outcome: 'yes' | 'no') => Promise<void>;
  onClaim?: (marketId: number) => Promise<void>;
  isOracle?: boolean;
}

const BET_PRESETS = [1, 5, 10];

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function PredictionCard({
  market,
  onBet,
  onResolve,
  onClaim,
  isOracle = false,
}: PredictionCardProps) {
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState<'yes' | 'no' | null>(null);

  const yesPoolBig = BigInt(market.yesPool || '0');
  const noPoolBig = BigInt(market.noPool || '0');
  const total = yesPoolBig + noPoolBig;
  const yesPercent = total > 0n ? Number(yesPoolBig * 100n / total) : 50;
  const isActive = market.state === 0;
  const isResolved = market.state === 1;
  const isCancelled = market.state === 2;
  const wonYes = market.winningOutcome === 1;

  // Price impact simulation
  const simulation = useMemo(() => {
    if (!selectedSide || !selectedAmount || !isActive) return null;
    const amountWei = BigInt(Math.floor(selectedAmount * 1e18));
    return simulateBet(yesPoolBig, noPoolBig, selectedSide, amountWei);
  }, [selectedSide, selectedAmount, yesPoolBig, noPoolBig, isActive]);

  const blocked = simulation ? isBlockedImpact(simulation.priceImpact) : false;
  const highImpact = simulation ? isHighImpact(simulation.priceImpact) : false;

  async function handleConfirmBet() {
    if (!selectedSide || !selectedAmount || blocked) return;
    setLoading(true);
    try {
      await onBet(market.id, selectedSide, selectedAmount);
      setSelectedSide(null);
      setSelectedAmount(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(outcome: 'yes' | 'no') {
    if (!onResolve) return;
    setResolveLoading(outcome);
    try {
      await onResolve(market.id, outcome);
    } finally {
      setResolveLoading(null);
    }
  }

  async function handleClaim() {
    if (!onClaim) return;
    setClaimLoading(true);
    try {
      await onClaim(market.id);
    } finally {
      setClaimLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-chain-hedera/10 shrink-0">
          <TrendingUp className="w-5 h-5 text-chain-hedera" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary leading-snug">
            {market.question}
          </p>
        </div>
        {isCancelled && (
          <span className="text-xs font-medium text-status-inactive">Cancelled</span>
        )}
        {isResolved && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-chain-hedera">
            <Check className="w-3.5 h-3.5" />
            {wonYes ? 'YES' : 'NO'} Won
          </span>
        )}
      </div>

      {/* Pool bars */}
      {!isCancelled && (
        <div className="flex gap-1 h-3 rounded-full bg-border-card overflow-hidden">
          <div
            className={`rounded-full transition-all duration-500 ${
              isResolved
                ? 'bg-chain-hedera'
                : 'bg-status-verified'
            }`}
            style={{ width: `${yesPercent}%` }}
          />
          {!isResolved && (
            <div
              className="bg-status-failed rounded-full transition-all duration-500"
              style={{ width: `${100 - yesPercent}%` }}
            />
          )}
        </div>
      )}

      {/* Meta row */}
      {!isCancelled && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span>
              <span className="font-medium text-status-verified">YES {yesPercent}%</span>
              <span className="text-secondary mx-1">/</span>
              <span className="font-medium text-status-failed">NO {100 - yesPercent}%</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-secondary">
            <span className="tabular-nums">{formatPool(String(total))} A0GI</span>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(market.resolutionTime)}</span>
          </div>
        </div>
      )}

      {/* === ACTIVE STATE: Bet UI === */}
      {isActive && (
        <>
          {/* Side selection */}
          <div className="flex gap-2">
            <button
              onClick={() => { setSelectedSide('yes'); setSelectedAmount(null); }}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                selectedSide === 'yes'
                  ? 'bg-status-verified/10 text-status-verified border border-status-verified/30'
                  : 'bg-white border border-border-card text-secondary'
              }`}
            >
              YES
            </button>
            <button
              onClick={() => { setSelectedSide('no'); setSelectedAmount(null); }}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                selectedSide === 'no'
                  ? 'bg-status-failed/10 text-status-failed border border-status-failed/30'
                  : 'bg-white border border-border-card text-secondary'
              }`}
            >
              NO
            </button>
          </div>

          {/* Amount presets */}
          {selectedSide && (
            <div className="flex gap-2 animate-fade-in">
              {BET_PRESETS.map((amt) => (
                <button
                  key={amt}
                  disabled={loading}
                  onClick={() => setSelectedAmount(selectedAmount === amt ? null : amt)}
                  className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                    selectedAmount === amt
                      ? 'bg-chain-hedera text-white'
                      : 'bg-white border border-border-card text-secondary'
                  }`}
                >
                  {amt} A0GI
                </button>
              ))}
            </div>
          )}

          {/* Price Impact Preview */}
          {simulation && selectedAmount && (
            <div className="border-t border-border-card pt-3 mt-1 animate-fade-in flex flex-col gap-2">
              {/* Payout row */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">Est. Payout</span>
                <span className="text-sm font-semibold text-primary tabular-nums">
                  {formatPool(simulation.estimatedPayout.toString())} A0GI
                  <span className="text-chain-hedera font-bold ml-2">
                    {formatMultiplier(simulation.estimatedMultiplier)}
                  </span>
                </span>
              </div>
              {/* New odds row */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">New Odds</span>
                <span className="text-sm font-semibold text-primary tabular-nums">
                  YES {formatOdds(simulation.newYesOdds)} / NO {formatOdds(simulation.newNoOdds)}
                </span>
              </div>
              {/* Impact row */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">Price Impact</span>
                <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                  {(simulation.priceImpact * 100).toFixed(1)}%
                  <span
                    className={`w-2 h-2 rounded-full ${
                      blocked
                        ? 'bg-status-failed'
                        : highImpact
                        ? 'bg-status-pending'
                        : 'bg-status-verified'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      blocked
                        ? 'text-status-failed'
                        : highImpact
                        ? 'text-status-pending'
                        : 'text-status-verified'
                    }`}
                  >
                    {blocked ? 'Too High' : highImpact ? 'Medium' : 'Low'}
                  </span>
                </span>
              </div>

              {/* Warning banner */}
              {highImpact && !blocked && (
                <div className="rounded-lg bg-status-pending/10 border border-status-pending/30 p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-pending shrink-0" />
                  <span className="text-sm text-status-pending">
                    High impact on pool odds
                  </span>
                </div>
              )}

              {/* Block banner */}
              {blocked && (
                <div className="rounded-lg bg-status-failed/10 border border-status-failed/30 p-3 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-status-failed shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-status-failed">
                      Bet too large for this pool
                    </p>
                    <p className="text-xs text-status-failed/70">
                      Try a smaller amount
                    </p>
                  </div>
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirmBet}
                disabled={loading || blocked}
                className={`min-h-[44px] rounded-lg text-sm font-semibold w-full flex items-center justify-center gap-2 active:scale-95 transition-transform ${
                  blocked
                    ? 'bg-chain-hedera/50 text-white/50 cursor-not-allowed'
                    : 'bg-chain-hedera text-white'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing bet...
                  </>
                ) : blocked ? (
                  'Bet Blocked'
                ) : (
                  `Confirm Bet — ${selectedAmount} A0GI`
                )}
              </button>
            </div>
          )}

          {/* Oracle controls */}
          {isOracle && onResolve && (
            <div className="border-t border-border-card pt-3 mt-1 animate-scale-in">
              <span className="text-xs text-secondary uppercase tracking-wide">
                Oracle Controls
              </span>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleResolve('yes')}
                  disabled={resolveLoading !== null}
                  className="flex-1 min-h-[44px] rounded-lg bg-status-verified/10 text-status-verified border border-status-verified/30 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {resolveLoading === 'yes' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Resolve YES
                </button>
                <button
                  onClick={() => handleResolve('no')}
                  disabled={resolveLoading !== null}
                  className="flex-1 min-h-[44px] rounded-lg bg-status-failed/10 text-status-failed border border-status-failed/30 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {resolveLoading === 'no' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Resolve NO
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* === RESOLVED STATE === */}
      {isResolved && onClaim && (
        <button
          onClick={handleClaim}
          disabled={claimLoading}
          className="min-h-[44px] rounded-lg bg-status-verified text-white font-semibold text-sm w-full flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {claimLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Claim Winnings
            </>
          )}
        </button>
      )}

      {/* Resolved — no claim available (lost) */}
      {isResolved && !onClaim && (
        <div className="rounded-lg bg-status-failed/10 p-3 text-center">
          <span className="text-sm text-status-failed">
            You bet {wonYes ? 'NO' : 'YES'} — Lost
          </span>
        </div>
      )}

      {/* === CANCELLED STATE === */}
      {isCancelled && onClaim && (
        <button
          onClick={handleClaim}
          disabled={claimLoading}
          className="min-h-[44px] rounded-lg border border-border-card text-primary font-medium text-sm w-full flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {claimLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Claiming...
            </>
          ) : (
            'Claim Refund'
          )}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add src/components/PredictionCard.tsx
git commit -m "feat(predictions): enhance PredictionCard with resolve, claim, and price impact"
```

---

## Task 8: Wire Resolution and Claims into PredictionsContent

**Files:**
- Modify: `src/app/(protected)/predictions/predictions-content.tsx`

**Step 1: Add resolve and claim handlers**

Add these functions inside the component, after `handleBet`:

```typescript
async function handleResolve(marketId: number, outcome: 'yes' | 'no') {
  const res = await fetch(`/api/predictions/${marketId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome }),
  });
  if (!res.ok) throw new Error('Failed to resolve');
  // Refresh markets
  const updated = await fetch('/api/predictions');
  if (updated.ok) setMarkets(await updated.json());
}

async function handleClaim(marketId: number) {
  const res = await fetch(`/api/predictions/${marketId}/claim`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to claim');
  // Refresh markets
  const updated = await fetch('/api/predictions');
  if (updated.ok) setMarkets(await updated.json());
}
```

**Step 2: Update PredictionCard props**

Update each `<PredictionCard>` render to pass the new callbacks:

```typescript
<PredictionCard
  key={m.id}
  market={m}
  onBet={handleBet}
  onResolve={handleResolve}
  onClaim={handleClaim}
  isOracle={true} // For demo, treat current user as oracle
/>
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 4: Commit**

```bash
git add src/app/\(protected\)/predictions/predictions-content.tsx
git commit -m "feat(predictions): wire resolve and claim handlers into predictions page"
```

---

## Task 9: Update GET /api/predictions to Return winningOutcome

**Files:**
- Modify: `src/app/api/predictions/route.ts`

**Step 1: Add winningOutcome to the response**

In the GET handler, where markets are mapped from contract data, add `winningOutcome`:

Find the line where each market object is constructed and ensure it includes:
```typescript
winningOutcome: Number(market.winningOutcome),
```

This field already exists in the contract's `getMarket()` return — it just needs to be included in the API response.

**Step 2: Update mock fallback**

Add `winningOutcome: 0` to the mock data objects so the types are consistent.

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 4: Commit**

```bash
git add src/app/api/predictions/route.ts
git commit -m "fix(predictions): include winningOutcome in GET response"
```

---

## Task 10: Final Build Verification and Deploy

**Step 1: Clean build**

```bash
rm -rf .next && npx next build
```
Expected: `Compiled successfully`, all prediction routes listed

**Step 2: Verify new routes appear**

Expected routes in build output:
```
/api/predictions            (GET + POST)
/api/predictions/[id]/bet   (POST)
/api/predictions/[id]/resolve (POST)   ← NEW
/api/predictions/[id]/claim   (POST)   ← NEW
```

**Step 3: Commit all remaining changes**

```bash
git add -A
git status
git commit -m "feat(predictions): complete prediction market lifecycle

- CreateMarketModal bottom sheet for market creation
- Oracle resolution with Hedera HCS audit logging
- Claim winnings/refund endpoints
- Price impact preview with slippage protection
- Enhanced PredictionCard with state-dependent UI"
```

**Step 4: Push and deploy**

```bash
git push origin main
```

Vercel auto-deploys from main. Verify at https://vocaid-hub.vercel.app/predictions

---

## Verification Checklist

After all tasks are complete:

1. [ ] Navigate to /predictions — see existing markets
2. [ ] Tap "Create Market" — modal opens with slide-up animation
3. [ ] Fill question + select 30 days + optional YES 5 A0GI → "Create Market"
4. [ ] New market appears in list after creation
5. [ ] Select YES + 1 A0GI on a market → price impact preview shows
6. [ ] Select 10 A0GI → impact increases, warning appears at >5%
7. [ ] "Confirm Bet" → pool bars update optimistically
8. [ ] Oracle resolve buttons visible → tap "Resolve YES" → market shows resolved
9. [ ] "Claim Winnings" button appears → tap → success
10. [ ] `npm run build` passes
11. [ ] Vercel deployment succeeds
