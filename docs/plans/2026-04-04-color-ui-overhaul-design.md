# Color System + UI Overhaul — Design Document

**Date:** 2026-04-04
**Problem:** App renders green and blue instead of purple/black/white/gray. Interface feels unintuitive. Agent registration form is broken.
**Solution:** 3-line CSS fix + component polish + agent registration modal rewrite.

---

## 1. Color Token Changes (globals.css)

**3 lines to change in `src/app/globals.css` `@theme inline` block:**

| Token | Before | After | Contrast on white |
|-------|--------|-------|-------------------|
| `--color-primary-accent` | `#3b82f6` (blue) | `#8247e5` (purple) | 5.27:1 PASS AA |
| `--color-chain-og` | `#10b981` (green) | `#7c3aed` (violet-600) | 5.70:1 PASS AA |
| `--color-status-verified` | `#10b981` (green) | `#8247e5` (purple) | 5.27:1 PASS AA |

**Impact:** Fixes 38 color instances across 12 files instantly — no component code changes needed for these.

**Keep unchanged:**
- `--color-chain-world: #3b82f6` (blue) — World's actual brand color, used only in 4 places for chain badges
- `--color-chain-hedera: #8247e5` (purple) — already correct
- `--color-status-failed: #ef4444` (red) — semantic, keep for errors
- `--color-status-pending: #f59e0b` (amber) — semantic, keep for loading
- `--color-primary: #0f172a` (black) — text color, correct
- `--color-secondary: #64748b` (gray) — 4.76:1, passes AA

---

## 2. ReputationBar Gradient Fix

**File:** `src/components/ReputationBar.tsx`

Current: `bg-gradient-to-r from-chain-og to-chain-world` (green → blue)
Fix: `bg-gradient-to-r from-chain-hedera to-primary-accent` (purple → purple)

This is the only component that needs a manual class change beyond the CSS token swap.

---

## 3. Button & Interactive Element Polish

**Standard button classes (replace inconsistencies):**

| Button type | Tailwind classes |
|-------------|-----------------|
| Primary CTA | `min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 cursor-pointer` |
| Secondary | `min-h-[44px] rounded-lg border border-border-card text-primary text-sm font-medium active:scale-95 transition-transform cursor-pointer` |
| Destructive | `min-h-[44px] rounded-lg bg-status-failed text-white text-sm font-semibold active:scale-95 transition-transform cursor-pointer` |
| Ghost/Chip (selected) | `min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold transition-colors cursor-pointer` |
| Ghost/Chip (unselected) | `min-h-[44px] rounded-lg bg-surface border border-border-card text-secondary text-sm transition-colors cursor-pointer` |

**Focus ring (add to globals.css):**
```css
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-primary-accent/40 focus:ring-offset-2;
}
```

**Add `cursor-pointer` to ALL interactive elements** — currently missing on many buttons and cards.

---

## 4. Card Elevation & Spacing

**Card shadow (add subtle elevation):**

Current: `rounded-xl border border-border-card bg-surface p-4`
Enhanced: `rounded-xl border border-border-card bg-surface p-4 shadow-sm`

The `shadow-sm` adds a subtle 1px box-shadow that gives cards depth without being heavy.

**Consistent card gaps:**
- Between cards in lists: `gap-4` (currently some use `gap-3`)
- Inside cards between sections: `gap-3`
- Page horizontal padding: `px-4`
- Bottom safe area: `mb-16` (reserve for World App nav)

---

## 5. Skeleton Loading Improvements

**Current:** Simple rectangles with `animate-pulse`
**Enhanced:** Match actual card shapes with rounded corners and icon placeholders

Skeleton template for ResourceCard:
```tsx
<div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 animate-pulse">
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-border-card" />
    <div className="flex-1 flex flex-col gap-1.5">
      <div className="h-4 w-2/3 rounded bg-border-card" />
      <div className="h-3 w-1/3 rounded bg-border-card" />
    </div>
  </div>
  <div className="h-3 rounded-full bg-border-card" />
  <div className="flex justify-between">
    <div className="h-3 w-1/4 rounded bg-border-card" />
    <div className="h-3 w-1/4 rounded bg-border-card" />
  </div>
</div>
```

Add `stagger-children` class to skeleton container for cascading reveal animation.

---

## 6. Agent Registration Modal Rewrite

**Current problem:** Profile page sends hardcoded `{ name, agentType, capabilities }` but API expects `{ agentURI, operatorWorldId, operatorAddress, role }`. Always fails.

**Fix:** Replace single button with `RegisterAgentModal` bottom-sheet:

**Fields:**
1. **Role selector** — 4 preset chips: Seer, Edge, Shield, Lens (maps to role string)
2. **Agent URI** — auto-generated: `https://vocaid-hub.vercel.app/agent-cards/{role}.json`
3. **Operator info** — pulled from session (walletAddress + World ID)
4. **Submit** — calls `/api/agents/register` with correct payload

**UI pattern:** Same bottom-sheet as CreateMarketModal/PaymentConfirmation:
- `fixed inset-0 z-50 bg-black/40`
- `rounded-t-2xl bg-white p-6 pb-10 animate-slide-up`

---

## 7. React Optimizations

**React.memo:** Wrap PredictionCard and ResourceCard (rendered in lists):
```tsx
export const PredictionCard = React.memo(function PredictionCard({ ... }) { ... });
```

**prefers-reduced-motion:** Add to globals.css:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `src/app/globals.css` | 3 color tokens + focus-ring utility + reduced-motion | HIGH |
| `src/components/ReputationBar.tsx` | Gradient classes | HIGH |
| `src/components/PredictionCard.tsx` | Add React.memo + cursor-pointer | MEDIUM |
| `src/components/ResourceCard.tsx` | Add cursor-pointer + shadow-sm | MEDIUM |
| `src/app/(protected)/profile/profile-content.tsx` | Replace register button with modal trigger | HIGH |
| `src/components/RegisterAgentModal.tsx` | NEW — agent registration bottom-sheet | HIGH |
| `src/app/(protected)/home/loading.tsx` | Upgrade skeleton to match card shapes | LOW |
| `src/app/(protected)/predictions/loading.tsx` | Upgrade skeleton | LOW |
| `src/app/(protected)/profile/loading.tsx` | Upgrade skeleton | LOW |
| `docs/DESIGN_SYSTEM.md` | Update color tokens to reflect purple palette | LOW |

---

## Verification

1. All CTA buttons render purple (not blue)
2. All verified badges render purple (not green)
3. 0G chain badges render violet-600 (not emerald green)
4. ReputationBar gradient is purple-to-purple
5. All buttons have `cursor-pointer`
6. Focus rings are visible and purple
7. Agent registration modal opens, sends correct payload, shows result
8. Skeleton loading matches card shapes
9. `npx next build` passes
10. Purple on white contrast: 5.27:1 (AA compliant)
