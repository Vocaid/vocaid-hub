# Color System + UI Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the purple/black/white/gray palette (eliminate green/blue leakage), polish card elevation and interactions, fix agent registration, and upgrade skeleton loading.

**Architecture:** 3 CSS token changes in globals.css fix 38 color instances instantly. Then targeted component edits for gradient, cursor, shadow, and agent registration modal. No new dependencies.

**Tech Stack:** Next.js 15, Tailwind CSS 4, Lucide React, React.memo

---

### Task 1: Fix Color Tokens in globals.css

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Change 3 color tokens**

In the `@theme inline` block, change these 3 lines:

```css
/* BEFORE */
--color-primary-accent: #3b82f6;
--color-chain-og: #10b981;
--color-status-verified: #10b981;

/* AFTER */
--color-primary-accent: #8247e5;
--color-chain-og: #7c3aed;
--color-status-verified: #8247e5;
```

**Step 2: Add focus-ring utility and reduced-motion**

After the `stagger-children` block, add:

```css
/* Focus ring utility */
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-primary-accent/40 focus:ring-offset-2;
}

/* Respect reduced-motion preference */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 3: Verify build**

Run: `rm -rf .next node_modules/.cache && npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "fix(design): purple palette — change primary-accent, chain-og, status-verified tokens"
```

---

### Task 2: Fix ReputationBar Gradient

**Files:**
- Modify: `src/components/ReputationBar.tsx`

**Step 1: Change gradient classes**

Find:
```
bg-gradient-to-r from-chain-og to-chain-world
```

Replace with:
```
bg-gradient-to-r from-chain-hedera to-primary-accent
```

**Step 2: Commit**

```bash
git add src/components/ReputationBar.tsx
git commit -m "fix(design): purple reputation bar gradient"
```

---

### Task 3: Add cursor-pointer + shadow to Cards

**Files:**
- Modify: `src/components/ResourceCard.tsx`
- Modify: `src/components/PredictionCard.tsx`

**Step 1: ResourceCard — add shadow-sm to card container**

Find the outer div className:
```
rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3
```

Replace with:
```
rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 shadow-sm
```

Also ensure ALL buttons in ResourceCard have `cursor-pointer`.

**Step 2: PredictionCard — add shadow-sm to card container**

Same pattern — find outer div and add `shadow-sm`.

**Step 3: Wrap both in React.memo**

For PredictionCard, change the export:
```typescript
// BEFORE
export function PredictionCard({ ... }: PredictionCardProps) {

// AFTER
import { memo } from 'react';
// ... at the end of the file
export const PredictionCard = memo(PredictionCardComponent);
```

(Rename the function to `PredictionCardComponent` internally, export as `PredictionCard`.)

Same for ResourceCard.

**Step 4: Commit**

```bash
git add src/components/ResourceCard.tsx src/components/PredictionCard.tsx
git commit -m "fix(design): add shadow + cursor-pointer + React.memo to cards"
```

---

### Task 4: Create RegisterAgentModal

**Files:**
- Create: `src/components/RegisterAgentModal.tsx`

**Step 1: Create the component**

The API expects: `{ agentURI, operatorWorldId, operatorAddress, role }`

```typescript
'use client';

import { useState } from 'react';
import { Bot, Loader2, Eye, TrendingUp, ShieldCheck, Search } from 'lucide-react';

interface RegisterAgentModalProps {
  onClose: () => void;
  onRegistered: () => void;
  walletAddress: string;
}

const ROLES = [
  { id: 'signal-analyst', label: 'Seer', icon: Eye, description: 'Signal Analysis', uri: 'seer' },
  { id: 'market-maker', label: 'Edge', icon: TrendingUp, description: 'Market Pricing', uri: 'edge' },
  { id: 'risk-manager', label: 'Shield', icon: ShieldCheck, description: 'Risk Management', uri: 'shield' },
  { id: 'discovery', label: 'Lens', icon: Search, description: 'Discovery', uri: 'lens' },
];

export function RegisterAgentModal({ onClose, onRegistered, walletAddress }: RegisterAgentModalProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = ROLES.find((r) => r.id === selectedRole);

  async function handleSubmit() {
    if (!selectedRole || !role) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentURI: `https://vocaid-hub.vercel.app/agent-cards/${role.uri}.json`,
          operatorWorldId: walletAddress,
          operatorAddress: walletAddress,
          role: selectedRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      onRegistered();
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
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary-accent/10">
            <Bot className="w-8 h-8 text-primary-accent" />
          </div>
          <h2 className="text-xl font-bold text-primary">Register Agent</h2>
          <p className="text-sm text-secondary">Choose a role for your new agent</p>
        </div>

        {/* Role selector */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-primary">Agent Role</span>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => {
              const RoleIcon = r.icon;
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg min-h-[44px] transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary-accent/10 border border-primary-accent/30 text-primary-accent'
                      : 'bg-surface border border-border-card text-secondary'
                  }`}
                >
                  <RoleIcon className="w-5 h-5 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold">{r.label}</p>
                    <p className="text-xs opacity-70">{r.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected info */}
        {role && (
          <div className="rounded-lg bg-surface border border-border-card p-3 animate-fade-in">
            <p className="text-xs text-secondary">Agent URI</p>
            <p className="text-xs font-mono text-primary truncate mt-0.5">
              vocaid-hub.vercel.app/agent-cards/{role.uri}.json
            </p>
            <p className="text-xs text-secondary mt-2">Operator</p>
            <p className="text-xs font-mono text-primary truncate mt-0.5">
              {walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-status-failed/10 border border-status-failed/30 p-3 text-sm text-status-failed">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selectedRole || loading}
          className="min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Registering on 0G Chain...
            </>
          ) : (
            'Register Agent'
          )}
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="min-h-[44px] rounded-lg border border-border-card text-primary text-sm font-medium active:scale-95 transition-transform cursor-pointer"
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
git add src/components/RegisterAgentModal.tsx
git commit -m "feat(profile): add RegisterAgentModal with role selector and correct API payload"
```

---

### Task 5: Wire RegisterAgentModal into Profile

**Files:**
- Modify: `src/app/(protected)/profile/profile-content.tsx`

**Step 1: Replace the registration logic**

Replace the import section — add:
```typescript
import { RegisterAgentModal } from '@/components/RegisterAgentModal';
```

Remove the old `handleRegisterAgent` function and replace with modal state:
```typescript
const [showRegisterModal, setShowRegisterModal] = useState(false);
```

Remove old state vars: `registering`, `registerError`, `registerSuccess`.

**Step 2: Replace the Register Agent CTA section**

Replace lines 140-167 with:
```typescript
{/* Register Agent CTA */}
<button
  onClick={() => setShowRegisterModal(true)}
  className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold w-full active:scale-95 transition-transform cursor-pointer"
>
  <Plus className="w-4 h-4" />
  Register New Agent
</button>

{showRegisterModal && (
  <RegisterAgentModal
    walletAddress={walletAddress ?? ''}
    onClose={() => setShowRegisterModal(false)}
    onRegistered={() => {
      setShowRegisterModal(false);
      // Page will reload with new agent via ISR
    }}
  />
)}
```

**Step 3: Clean up unused imports**

Remove `Loader2` from the import if no longer used in this file.

**Step 4: Commit**

```bash
git add src/app/\(protected\)/profile/profile-content.tsx
git commit -m "feat(profile): wire RegisterAgentModal with correct API payload"
```

---

### Task 6: Upgrade Skeleton Loading Pages

**Files:**
- Modify: `src/app/(protected)/home/loading.tsx`
- Modify: `src/app/(protected)/predictions/loading.tsx`
- Modify: `src/app/(protected)/profile/loading.tsx`

**Step 1: Home loading — upgrade ResourceCardSkeleton**

The current skeleton uses simple divs. Upgrade to match actual ResourceCard shape:

```tsx
function ResourceCardSkeleton() {
  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 animate-pulse shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-border-card" />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-4 w-2/3 rounded bg-border-card" />
          <div className="h-3 w-1/3 rounded bg-border-card" />
        </div>
        <div className="h-5 w-12 rounded-full bg-border-card" />
      </div>
      <div className="h-2 rounded-full bg-border-card" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-border-card" />
        <div className="h-9 w-16 rounded-lg bg-border-card" />
      </div>
    </div>
  );
}
```

Wrap the skeleton list in `stagger-children`:
```tsx
<div className="flex flex-col gap-4 stagger-children">
  {[0,1,2].map(i => <ResourceCardSkeleton key={i} />)}
</div>
```

**Step 2: Predictions loading — upgrade PredictionSkeleton**

Match PredictionCard shape:
```tsx
function PredictionSkeleton() {
  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 animate-pulse shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-border-card" />
        <div className="flex-1 h-10 rounded bg-border-card" />
      </div>
      <div className="h-3 rounded-full bg-border-card" />
      <div className="flex justify-between">
        <div className="h-3 w-24 rounded bg-border-card" />
        <div className="h-3 w-20 rounded bg-border-card" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1 h-11 rounded-lg bg-border-card" />
        <div className="flex-1 h-11 rounded-lg bg-border-card" />
      </div>
    </div>
  );
}
```

**Step 3: Profile loading — upgrade identity + agent fleet skeleton**

Match profile layout:
```tsx
function ProfileSkeleton() {
  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 animate-pulse shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-border-card" />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-4 w-1/3 rounded bg-border-card" />
          <div className="h-3 w-1/2 rounded bg-border-card" />
        </div>
      </div>
      <div className="h-6 w-32 rounded-full bg-border-card" />
    </div>
  );
}

function AgentSkeleton() {
  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-2.5 animate-pulse shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-border-card" />
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-4 w-16 rounded bg-border-card" />
          <div className="h-3 w-24 rounded bg-border-card" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded-full bg-border-card" />
        <div className="h-5 w-16 rounded-full bg-border-card" />
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/\(protected\)/home/loading.tsx src/app/\(protected\)/predictions/loading.tsx src/app/\(protected\)/profile/loading.tsx
git commit -m "fix(design): upgrade skeleton loading to match card shapes + add stagger animation"
```

---

### Task 7: Update DESIGN_SYSTEM.md

**Files:**
- Modify: `docs/DESIGN_SYSTEM.md`

**Step 1: Update the color table**

Change:
```
| `primary-accent` | `#3B82F6` | Links, active states, CTAs |
```
to:
```
| `primary-accent` | `#8247E5` | Links, active states, CTAs |
```

Change 0G chain color:
```
| 0G | Green | `#10B981` | GPU verification, compute indicators |
```
to:
```
| 0G | Violet | `#7C3AED` | GPU verification, compute indicators |
```

Change status-verified:
```
| Verified | `#10B981` | TEE attestation passed, World ID verified |
```
to:
```
| Verified | `#8247E5` | TEE attestation passed, World ID verified |
```

Update the Tailwind config example to match.

**Step 2: Commit**

```bash
git add docs/DESIGN_SYSTEM.md
git commit -m "docs: update DESIGN_SYSTEM.md with purple palette tokens"
```

---

### Task 8: Final Build + Deploy

**Step 1: Clean build**

```bash
rm -rf .next node_modules/.cache && npx next build
```
Expected: Compiled successfully

**Step 2: Push and deploy**

```bash
git push origin main
```

Vercel auto-deploys.

---

## Verification Checklist

1. [ ] All CTA buttons are purple (#8247E5), not blue
2. [ ] All verified badges are purple, not green
3. [ ] 0G chain badges are violet (#7C3AED), not green
4. [ ] ReputationBar gradient is purple-to-purple
5. [ ] All cards have subtle shadow (`shadow-sm`)
6. [ ] All buttons have `cursor-pointer`
7. [ ] Focus rings are purple (`ring-primary-accent/40`)
8. [ ] Agent registration modal opens with role selector
9. [ ] Agent registration sends correct payload to API
10. [ ] Skeleton loading pages match actual card shapes
11. [ ] `prefers-reduced-motion` disables animations
12. [ ] Purple on white contrast: 5.27:1 (AA compliant)
13. [ ] `npx next build` passes
14. [ ] Vercel deployment succeeds
