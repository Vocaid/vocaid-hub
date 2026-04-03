# Prediction Markets — Complete Feature Design

**Date:** 2026-04-04
**Decision:** Keep predictions on 0G Galileo. Build full lifecycle + slippage protection.
**Bounty target:** Best DeFi App on 0G ($6k, 3 winners)
**Estimated effort:** ~7 hours
**Palette:** Black (#0F172A), White (#FFFFFF), Purple (#8247E5) — chain-hedera token for all prediction accents

---

## Context

`ResourcePrediction.sol` is deployed on 0G Galileo at `0x6ce572729a5cbc8aa9df7ac25d8076e80665194e`. The contract supports `createMarket`, `placeBet`, `resolveMarket`, `claimWinnings`, `cancelMarket`, and `claimRefund`. The frontend currently only supports viewing markets and placing bets. Three features complete the DeFi product loop.

## Current Architecture

```
User -> PredictionsContent -> POST /api/predictions/[id]/bet -> ResourcePrediction.placeBet() on 0G
User -> PredictionsContent -> GET /api/predictions -> ResourcePrediction.getMarket() on 0G
```

---

## Feature 1: Create Market UI (~2 hours)

### What it does
A bottom-sheet form that lets verified users create new prediction markets with a question, resolution date, and optional initial liquidity.

### Components
- **New:** `src/components/CreateMarketModal.tsx`
- **Modify:** `src/app/api/predictions/route.ts` (add POST handler)
- **Modify:** `src/app/(protected)/predictions/predictions-content.tsx` (wire Create Market button)

### Data flow
```
CreateMarketModal -> POST /api/predictions { question, resolutionTime, initialSide?, initialAmount? }
  -> server signs createMarket(question, resolutionTime)
  -> optionally signs placeBet(marketId, side) with value
  -> returns { marketId, txHash }
  -> client refreshes market list
```

### Contract interaction
```solidity
createMarket(string question, uint256 resolutionTime) -> uint256 marketId
// resolutionTime must be in the future
// Anyone can create (no access control)
```

### UI Specification (CreateMarketModal)

**Layout:** Bottom sheet modal matching PaymentConfirmation pattern.

```
Backdrop:  fixed inset-0 z-50 flex items-end justify-center bg-black/40
Sheet:     w-full max-w-[428px] rounded-t-2xl bg-white p-6 pb-10
           flex flex-col gap-5 animate-slide-up
```

**Sections (top to bottom):**

1. **Header** — centered icon + title + subtitle
   - Icon: `TrendingUp` (32px) in `w-14 h-14 rounded-full bg-chain-hedera/10` ring
   - Title: "New Prediction Market" — `text-xl font-bold text-primary`
   - Subtitle: "Create a market for any resource" — `text-sm text-secondary`

2. **Question field**
   - Label: "What will happen?" — `text-sm font-medium text-primary`
   - Textarea: 3 rows, `rounded-xl border border-border-card bg-surface p-3 text-sm`
   - Placeholder: "e.g. Will H100 spot price drop 20% by June?"

3. **Resolution date chips**
   - Label: "Resolution Date" — `text-sm font-medium text-primary`
   - Three chips in `flex gap-2`:
     - Selected: `bg-chain-hedera text-white rounded-lg min-h-[44px] px-4 font-semibold`
     - Unselected: `bg-surface border border-border-card text-secondary rounded-lg min-h-[44px] px-4`
   - Options: "7 days", "30 days", "90 days"

4. **Initial position (optional section)**
   - Divider with label: `text-xs text-secondary uppercase tracking-wide`
   - Side toggle: two buttons `flex-1 min-h-[44px] rounded-lg`
     - YES selected: `bg-status-verified/10 text-status-verified border border-status-verified/30 font-semibold`
     - NO selected: `bg-status-failed/10 text-status-failed border border-status-failed/30 font-semibold`
     - Unselected: `bg-surface border border-border-card text-secondary`
   - Amount presets: `[1, 5, 10]` A0GI — same chip pattern as date

5. **Submit button**
   - `min-h-[44px] rounded-lg bg-chain-hedera text-white text-sm font-semibold`
   - Loading: show `Loader2 animate-spin` icon + "Creating..."
   - Disabled when: no question or no date selected

6. **Cancel button**
   - `min-h-[44px] rounded-lg border border-border-card text-primary text-sm font-medium`
   - Calls `onClose()`

---

## Feature 2: Oracle Resolution + Claim Winnings (~1.5 hours)

### What it does
Oracle can resolve active markets. Winners can claim payouts. Cancelled markets get refunds.

### Components
- **New:** `src/app/api/predictions/[id]/resolve/route.ts`
- **New:** `src/app/api/predictions/[id]/claim/route.ts`
- **Modify:** `src/components/PredictionCard.tsx` (add state-dependent UI sections)
- **Modify:** `src/app/(protected)/predictions/predictions-content.tsx` (pass oracle address)

### Data flow
```
Resolution:
  PredictionCard (oracle) -> POST /api/predictions/[id]/resolve { outcome: 'yes'|'no' }
    -> server verifies PRIVATE_KEY is oracle
    -> calls resolveMarket(marketId, outcomeEnum)
    -> logs to Hedera HCS topic (cross-chain audit)
    -> returns { txHash }

Claim:
  PredictionCard (winner) -> POST /api/predictions/[id]/claim
    -> calls claimWinnings(marketId) or claimRefund(marketId)
    -> returns { txHash, payout }
```

### Contract interaction
```solidity
resolveMarket(uint256 marketId, Outcome outcome) // oracle only
claimWinnings(uint256 marketId) // payout = (userBet * totalPool) / winningPool
cancelMarket(uint256 marketId) // oracle only
claimRefund(uint256 marketId) // for cancelled markets
```

### UI States (PredictionCard)

**Active (state=0) — Oracle view:**
Additional section below bet UI, separated by `border-t border-border-card pt-3 mt-1`:
- Label: "Oracle Controls" — `text-xs text-secondary uppercase tracking-wide`
- Two buttons `flex gap-2`:
  - Resolve YES: `flex-1 min-h-[44px] rounded-lg bg-status-verified/10 text-status-verified border border-status-verified/30 font-semibold`
  - Resolve NO: `flex-1 min-h-[44px] rounded-lg bg-status-failed/10 text-status-failed border border-status-failed/30 font-semibold`
- Animation: `animate-scale-in` on mount

**Resolved (state=1) — Winner view:**
- Pool bar: full width in `bg-chain-hedera` with checkmark icon
- Outcome badge: "YES Won" or "NO Won" with `Check` icon — `text-sm font-semibold text-chain-hedera`
- Claim button: `min-h-[44px] rounded-lg bg-status-verified text-white font-semibold w-full`
  - Text: "Claim {payout} A0GI"
  - Loading: `Loader2 animate-spin` + "Claiming..."

**Resolved (state=1) — Loser view:**
- Pool bar: muted `bg-border-card`
- Lost badge: `rounded-lg bg-status-failed/10 p-3 text-center`
  - `X` icon + "You bet {side} — Lost" — `text-sm text-status-failed`

**Cancelled (state=2):**
- Status badge: "Cancelled" — `text-status-inactive`
- Refund button: `min-h-[44px] rounded-lg border border-border-card text-primary font-medium w-full`
  - Text: "Claim Refund — {amount} A0GI"

### HCS audit hook
On resolution, log to Hedera HCS topic `0.0.8499635`:
```json
{
  "event": "market_resolved",
  "marketId": 0,
  "outcome": "yes",
  "totalPool": "15000000000000000000",
  "txHash": "0x...",
  "chain": "0g-galileo",
  "timestamp": "2026-04-04T..."
}
```

---

## Feature 3: Slippage Protection + Price Impact Preview (~3.5 hours)

### What it does
Before confirming a bet, show estimated payout, multiplier, new odds, and price impact. Warn or block based on thresholds.

### Components
- **New:** `src/lib/prediction-math.ts` — pure functions, no dependencies
- **Modify:** `src/components/PredictionCard.tsx` — inline preview section

### Pool math
```typescript
// Current odds
currentYesOdds = yesPool / (yesPool + noPool)

// After bet of `amount` on YES:
newYesPool = yesPool + amount
newYesOdds = newYesPool / (newYesPool + noPool)

// Price impact (absolute shift in odds):
priceImpact = abs(newYesOdds - currentYesOdds)

// Estimated payout if user's side wins:
estimatedPayout = (amount / winningPool) * totalPool
estimatedMultiplier = estimatedPayout / amount
```

### prediction-math.ts exports
```typescript
export function simulateBet(
  yesPool: bigint,
  noPool: bigint,
  side: 'yes' | 'no',
  amount: bigint
): {
  newYesOdds: number;
  newNoOdds: number;
  priceImpact: number;       // 0-1 decimal
  estimatedPayout: bigint;
  estimatedMultiplier: number;
}

export function formatOdds(odds: number): string;        // "62.3%"
export function formatMultiplier(m: number): string;     // "2.3x"
export function isHighImpact(impact: number): boolean;   // > 0.05
export function isBlockedImpact(impact: number): boolean; // > 0.10
```

### UI Specification (Price Impact Preview)

Appears inline in PredictionCard after side + amount are selected. Container:
```
border-t border-border-card pt-3 mt-1 animate-fade-in
```

**Layout: 3 rows + warning (conditional) + confirm button**

Row structure — each row is `flex items-center justify-between`:
- Left: `text-xs text-secondary`
- Right: `text-sm font-semibold text-primary tabular-nums`

| Row | Left label | Right value | Special styling |
|-----|-----------|-------------|-----------------|
| Payout | "Est. Payout" | "2.3 A0GI" | Multiplier badge: `text-chain-hedera font-bold ml-2` showing "2.3x" |
| New Odds | "New Odds" | "YES 68% / NO 32%" | Arrows between old and new: `text-secondary` |
| Impact | "Price Impact" | "3.2%" | Dot indicator (see below) |

**Impact dot indicator** (inline after percentage):
- Low (<5%): `w-2 h-2 rounded-full bg-status-verified` + "Low" in `text-status-verified`
- Medium (5-10%): `w-2 h-2 rounded-full bg-status-pending` + "Medium" in `text-status-pending`
- High (>10%): `w-2 h-2 rounded-full bg-status-failed` + "Too High" in `text-status-failed`

**Warning banner (5-10% impact):**
```
rounded-lg bg-status-pending/10 border border-status-pending/30 p-3
```
- Icon: `AlertTriangle` (16px) `text-status-pending`
- Text: "High impact on pool odds" — `text-sm text-status-pending`

**Block banner (>10% impact):**
```
rounded-lg bg-status-failed/10 border border-status-failed/30 p-3
```
- Icon: `XCircle` (16px) `text-status-failed`
- Title: "Bet too large for this pool" — `text-sm font-medium text-status-failed`
- Subtitle: "Try a smaller amount" — `text-xs text-status-failed/70`

**Confirm button:**
- Normal: `min-h-[44px] rounded-lg bg-chain-hedera text-white text-sm font-semibold w-full active:scale-95 transition-transform`
- Text: "Confirm Bet — {amount} A0GI"
- Loading: `Loader2 animate-spin` + "Placing bet..."
- Blocked (>10%): `opacity-50 cursor-not-allowed` + disabled

---

## Animation Choreography

| Trigger | Animation | Duration | Class |
|---------|-----------|----------|-------|
| Modal opens | Slide up from bottom | 300ms ease-out | `animate-slide-up` |
| Price preview appears | Fade in + translate Y | 300ms ease-out | `animate-fade-in` |
| Bet confirmed | Pool bar width transition | 500ms | `transition-all duration-500` |
| Oracle buttons appear | Scale in | 200ms ease-out | `animate-scale-in` |
| Card list loads | Staggered fade-in | 60ms cascade | `stagger-children` |
| Claim success | Scale in checkmark | 200ms ease-out | `animate-scale-in` |

---

## Files Summary

| Action | File | Feature |
|--------|------|---------|
| Create | `src/components/CreateMarketModal.tsx` | 1 |
| Create | `src/app/api/predictions/[id]/resolve/route.ts` | 2 |
| Create | `src/app/api/predictions/[id]/claim/route.ts` | 2 |
| Create | `src/lib/prediction-math.ts` | 3 |
| Modify | `src/app/api/predictions/route.ts` (add POST) | 1 |
| Modify | `src/components/PredictionCard.tsx` | 2, 3 |
| Modify | `src/app/(protected)/predictions/predictions-content.tsx` | 1, 2 |

## Verification

1. Create a new market via UI -> verify it appears in market list -> verify on-chain via 0G explorer
2. Place bet on both sides -> verify pool ratios update -> verify price impact preview accuracy
3. Resolve market as oracle -> verify outcome badge appears -> claim winnings -> verify payout
4. Test slippage: place bet larger than pool -> verify warning/block behavior
5. Check HCS audit topic `0.0.8499635` for resolution log entry
6. `npm run build` passes
7. Vercel deployment succeeds

## Demo Script Addition

1. Navigate to Predictions tab
2. Tap "Create Market" -> "Will H100 spot price drop 20% by June?" -> 30 days -> 5 A0GI on YES
3. Show price impact preview (low impact on fresh market)
4. Place opposing bet -> show odds shift in real-time
5. (Pre-resolved market) Show "Claim Winnings" -> tap -> show payout confirmation
