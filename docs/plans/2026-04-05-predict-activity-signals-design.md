# Design: Market Signal Ticker + Activity Feed on Predict Page

**Date:** 2026-04-05
**Status:** Approved
**Context:** The ActivityFeed component currently sits at the bottom of the Home/Market page showing 5 event types. Users need market signals visible where they place bets — the Predict page. The feed should include all relevant on-chain signals: agent trades, reputation changes, GPU/resource events, DePIN metrics, skill utilization, and payments.

---

## Decision

- **Move** ActivityFeed entirely from Home page to Predict page
- **Add** a 2-row signal ticker at the top of the Predict page
- **Enrich** the `/api/activity` route with 3 new event types: `depin`, `skill`, `trade`
- **Add** filter chips above the full feed

---

## Architecture

### Predict Page Layout

```
┌─────────────────────────────┐
│ Signal Ticker (2 rows)      │  88px, auto-scrolling chips
├─────────────────────────────┤
│ PredictionCard 0            │
│ PredictionCard 1            │
│ [+ Create Market]           │
├─────────────────────────────┤
│ [All] [Agents] [GPU] [...]  │  filter chips
│ ActivityFeed (10-20 items)  │  full feed
└─────────────────────────────┘
```

### Signal Ticker Component

**File:** `src/components/SignalTicker.tsx`

Two horizontal rows scrolling in opposite directions (CSS `@keyframes` marquee):

- Row 1 scrolls right-to-left
- Row 2 scrolls left-to-right
- Each row ~40px tall, total ~88px with gap
- Chips: `rounded-full`, colored border by type
  - Purple border: agent events (trade, signal)
  - Green border: reputation
  - Blue border: GPU/resource
  - Orange border: DePIN
  - Gray border: payments
  - Cyan border: skill utilization
- Touch/hover pauses both rows
- Each chip: `[icon] agent · action · value`
- Tapping a chip shows detail tooltip with txHash link

**Data:** Consumes top 8 items from `/api/activity` response.

### Enhanced Activity Types

Current types: `reputation`, `prediction`, `payment`, `verification`, `signal`

New types:

| Type | Source | Example |
|------|--------|---------|
| `trade` | Edge agent bet executions | "Edge bet YES on Market 0 — 0.01 A0GI (Shield cleared)" |
| `depin` | DePIN provider registrations/metrics | "Solar-Node-7 registered — 12kW capacity" |
| `skill` | Human/agent hire completions | "Maria hired as Rust L4 — 5 USDC via x402" |

### ActivityItem Interface (extended)

```typescript
type ActivityType = 
  | 'reputation' | 'prediction' | 'payment' 
  | 'verification' | 'signal'
  | 'trade' | 'depin' | 'skill';  // new
```

### Filter Chips

Above the full feed: `All | Agents | Reputation | GPU | DePIN | Skills | Payments`

Each chip toggles its category. Multiple can be active. "All" resets to show everything.

### Data Flow

```
/api/activity (enhanced)
  ├─ On-chain: ReputationRegistry events (0G) → reputation
  ├─ On-chain: ResourcePrediction events (0G) → prediction  
  ├─ On-chain: GPUProviderRegistry events (0G) → verification
  ├─ Hedera: HCS audit trail messages → payment, trade
  ├─ Demo: DePIN provider events → depin
  ├─ Demo: Skill utilization events → skill
  └─ Returns: ActivityItem[] (max 20, sorted by timestamp desc)

Client (Predict page):
  ├─ Fetch /api/activity every 15s
  ├─ Split: top 8 → SignalTicker, all 20 → ActivityFeed
  └─ Filter chips apply client-side filtering
```

### Home Page Change

Remove `<ActivityFeed>` from `marketplace-content.tsx`. No replacement — the Home page keeps the Seer panel, filters, and resource cards.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/SignalTicker.tsx` | **New** — 2-row scrolling ticker |
| `src/components/ActivityFeed.tsx` | Add filter chips, new event type icons/colors |
| `src/app/(protected)/predictions/predictions-content.tsx` | Add SignalTicker + ActivityFeed |
| `src/app/(protected)/home/marketplace-content.tsx` | Remove ActivityFeed import and render |
| `src/app/api/activity/route.ts` | Add trade, depin, skill event types |

---

## Verification

- Predict page shows 2-row ticker scrolling with live signals
- Ticker pauses on touch/hover
- Prediction cards render between ticker and feed
- Filter chips toggle event categories in full feed
- Home page no longer shows ActivityFeed
- `npm run build` passes
