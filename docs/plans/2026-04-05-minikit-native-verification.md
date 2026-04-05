# MiniKit Native World ID Verification — Replace Broken IDKit Bridge

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the IDKit bridge verification flow (which polls forever inside World App) with MiniKit's native `verificationStatus` check.

**Architecture:** IDKit's bridge flow (QR code + external polling) cannot work inside a World App mini app — there's no external device to scan the QR. Instead, read `MiniKit.user.verificationStatus.isOrbVerified` which World App populates at install time. Replace `useWorldIdGate` hook, simplify `WorldIdGateModal` to an informational modal (no IDKit), and remove the broken `Verify` component.

**Tech Stack:** Next.js 15, MiniKit v2.0.2, `@worldcoin/minikit-js`, TypeScript

---

### Task 1: Replace `useWorldIdGate` with MiniKit native check

**Files:**
- Modify: `src/hooks/useWorldIdGate.ts`

**Step 1: Rewrite the hook**

Replace the entire file with:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useSession } from 'next-auth/react';

/**
 * Checks World ID verification via MiniKit.user.verificationStatus.
 * Falls back to /api/world-id/check for on-chain status.
 */
export function useWorldIdGate() {
  const { data: session } = useSession();
  const walletAddress = (session?.user as { walletAddress?: string } | undefined)?.walletAddress;

  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const recheckStatus = useCallback(async () => {
    if (!walletAddress) {
      setIsVerified(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    // Primary: MiniKit native verification status (instant, no network)
    const miniKitStatus = MiniKit.user?.verificationStatus?.isOrbVerified;
    if (miniKitStatus === true) {
      setIsVerified(true);
      setIsChecking(false);
      return;
    }

    // Fallback: on-chain check (for cases where MiniKit user data isn't populated)
    try {
      const res = await fetch(`/api/world-id/check?address=${walletAddress}`);
      const data = await res.json();
      setIsVerified(data.verified === true);
    } catch {
      // If both fail, treat MiniKit status as authoritative
      setIsVerified(miniKitStatus ?? false);
    } finally {
      setIsChecking(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    recheckStatus();
  }, [recheckStatus]);

  return { isVerified, isChecking, recheckStatus };
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep -i "useWorldIdGate\|world-id-gate" || echo "OK"
```

**Step 3: Commit**

```bash
git add src/hooks/useWorldIdGate.ts
git commit -m "fix: use MiniKit native verification instead of broken IDKit bridge"
```

---

### Task 2: Replace WorldIdGateModal with informational modal

**Files:**
- Modify: `src/components/WorldIdGateModal.tsx`

**Step 1: Rewrite the modal**

The modal no longer triggers IDKit verification. It checks MiniKit status and either:
- Auto-closes if already verified (MiniKit just hadn't updated yet)
- Shows instructions to verify in World App settings

```typescript
'use client';

import { useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { MiniKit } from '@worldcoin/minikit-js';

interface WorldIdGateModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

/**
 * Informational modal shown when World ID verification is required.
 * Checks MiniKit.user.verificationStatus and auto-resolves if verified.
 */
export function WorldIdGateModal({ open, onClose, onVerified }: WorldIdGateModalProps) {
  // Auto-detect if user became verified (e.g. after switching back from World App settings)
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      if (MiniKit.user?.verificationStatus?.isOrbVerified) {
        clearInterval(interval);
        onVerified();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, onVerified]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[428px] rounded-2xl bg-white p-6 flex flex-col gap-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-accent" />
            <h2 className="text-lg font-bold text-primary">World ID Required</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        <p className="text-sm text-secondary leading-relaxed">
          To use this feature, you need to verify your identity with World ID.
          Open <strong>World App &rarr; Settings &rarr; Verify</strong> to complete Orb verification.
        </p>

        <p className="text-xs text-secondary/70">
          Once verified, come back and this screen will update automatically.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/WorldIdGateModal.tsx
git commit -m "fix: replace IDKit verification modal with informational World ID modal"
```

---

### Task 3: Remove the broken Verify component

**Files:**
- Delete: `src/components/Verify/index.tsx`

**Step 1: Verify no other imports exist**

```bash
grep -r "from.*Verify" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v WorldIdGateModal
```

Expected: No results (only WorldIdGateModal imported Verify, and we replaced it in Task 2).

**Step 2: Delete the file**

```bash
rm src/components/Verify/index.tsx
rmdir src/components/Verify 2>/dev/null || true
```

**Step 3: Commit**

```bash
git add -A src/components/Verify/
git commit -m "chore: remove broken IDKit Verify component (replaced by MiniKit native check)"
```

---

### Task 4: Clean up unused IDKit imports in globals.css and next.config.ts

**Files:**
- Modify: `src/app/globals.css` — remove the IDKit CSS override (no longer needed)
- Modify: `next.config.ts` — remove `asyncWebAssembly` (no WASM needed without IDKit)

**Step 1: Remove IDKit CSS override from globals.css**

Remove the block at the end:
```css
/* Center World ID popup on mobile instead of bottom-sheet */
@media (max-width: 1024px) {
  .idkit-backdrop { ... }
  .idkit-modal { ... }
}
```

**Step 2: Remove asyncWebAssembly from next.config.ts**

Remove the webpack config block:
```typescript
webpack(config) {
  config.experiments = { ...config.experiments, asyncWebAssembly: true };
  return config;
},
```

**Step 3: Commit**

```bash
git add src/app/globals.css next.config.ts
git commit -m "chore: remove IDKit WASM config and CSS overrides (no longer needed)"
```

---

### Task 5: Verify and deploy

**Step 1: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

**Step 2: Push and deploy**

```bash
git push origin main
```
