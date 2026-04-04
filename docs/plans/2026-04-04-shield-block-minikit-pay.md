# P-057 Shield Block + P-059 MiniKit Pay — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the Shield agent's validation check into the resource API (blocks unverified GPU providers) and integrate MiniKit.pay() into the hire flow for World MiniKit bounty eligibility.

**Architecture:** P-057 adds a `getValidationSummary()` call inside `mapGpuToResources()` in the resources API route — providers with zero validations or avgResponse < 50 are marked `verified: false`. P-059 replaces the manual x402 header flow in `marketplace-content.tsx` with the native `pay()` command from `@worldcoin/minikit-js`, falling back to the existing x402 flow when not in World App.

**Tech Stack:** viem (ValidationRegistry reads), @worldcoin/minikit-js `pay()` + `Tokens.USDC`, Next.js API routes.

---

### Task 1: Claim in ACTIVE_WORK.md

**Files:**
- Modify: `docs/ACTIVE_WORK.md`

**Step 1: Add claim row**

Add after the last row in the Active Work table:

```markdown
| 7 | P-057 Shield validation check + P-059 MiniKit.pay() | `src/app/api/resources/route.ts`, `src/app/(protected)/home/marketplace-content.tsx` | active | 2026-04-04 | — |
```

**Step 2: Commit**

```bash
git add docs/ACTIVE_WORK.md
git commit -m "wip: claim P-057 (Shield block) + P-059 (MiniKit pay) — Agent 7"
```

---

### Task 2: Add Shield validation check to resources API

**Files:**
- Modify: `src/app/api/resources/route.ts:74-118`

**Context:** The `mapGpuToResources()` function currently hardcodes `reputation: 75` and `verified: true` for on-chain providers. We need to call `getValidationSummary(agentId)` from `src/lib/og-chain.ts:68-78` to check if the provider has passed validation. The function returns `{ count, avgResponse }` — if `count === 0n` (no validations) or `avgResponse < 50`, the provider is unverified.

**Step 1: Make mapGpuToResources async and add validation check**

Change the function signature and add the validation lookup. Replace lines 74-118 in `src/app/api/resources/route.ts`:

From:
```typescript
function mapGpuToResources(
  broker: OGServiceInfo[],
  onChain: OnChainGPUProvider[],
): ResourceCardProps[] {
```

To:
```typescript
async function mapGpuToResources(
  broker: OGServiceInfo[],
  onChain: OnChainGPUProvider[],
): Promise<ResourceCardProps[]> {
```

Add import at top of file (after existing imports):
```typescript
import { getValidationSummary } from "@/lib/og-chain";
```

Replace the on-chain provider loop (lines 86-101) with:
```typescript
  // On-chain registered providers (from GPUProviderRegistry)
  // Shield check: query ValidationRegistry for each provider's agentId
  for (const p of onChain) {
    const addr = p.address.toLowerCase();
    seen.add(addr);
    const b = brokerByAddr.get(addr);

    // Shield agent logic: check if provider passed TEE validation
    let isVerified = false;
    try {
      const validation = await getValidationSummary(BigInt(p.agentId), "gpu-tee-attestation");
      isVerified = validation.count > 0n && validation.avgResponse >= 50;
    } catch {
      // Validation check failed — treat as unverified (safe default)
      isVerified = false;
    }

    resources.push({
      type: "gpu" as const,
      name: b?.model || p.gpuModel || "GPU Provider",
      subtitle: b?.url || `${p.teeType} · Agent #${p.agentId}`,
      reputation: 75,
      verified: isVerified,
      chain: "0g" as const,
      price: "$0.05/call",
      verificationType: "tee" as const,
    });
  }
```

Also update the caller on line 37 — add `await`:

From:
```typescript
      ...mapGpuToResources(broker, onChain),
```

To:
```typescript
      ...(await mapGpuToResources(broker, onChain)),
```

**Step 2: Verify**

Run: `npm run build`
Expected: Compiles with no errors.

**Step 3: Commit**

```bash
git add src/app/api/resources/route.ts
git commit -m "feat(0g): add Shield validation check — block unverified GPU providers"
```

---

### Task 3: Enhance ResourceCard UX for unverified providers

**Files:**
- Modify: `src/components/ResourceCard.tsx:62-74`

**UX rationale (from ui-ux-pro-max):**
- Unverified providers must not be silently hireable — this undermines the Shield agent's purpose
- The Hire button should be visually disabled (muted) with a tooltip-style label
- The card itself should have a subtle visual distinction (reduced opacity border)
- Touch targets stay 44x44px (Apple HIG / DESIGN_SYSTEM.md)
- `cursor-pointer` only on enabled buttons

**Step 1: Update the Hire button to respect verification state**

In `src/components/ResourceCard.tsx`, replace the footer row (lines 62-74):

From:
```tsx
      {/* Footer row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary capitalize">{label}</span>
          <VerificationStatus verified={verified} type={verificationType} />
        </div>
        <button
          onClick={() => onHire?.({ name, price, type })}
          className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg bg-primary-accent text-white text-sm font-semibold active:scale-95 transition-transform"
        >
          Hire {price}
        </button>
      </div>
```

To:
```tsx
      {/* Footer row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary capitalize">{label}</span>
          <VerificationStatus verified={verified} type={verificationType} />
        </div>
        {verified ? (
          <button
            onClick={() => onHire?.({ name, price, type })}
            className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg bg-primary-accent text-white text-sm font-semibold cursor-pointer active:scale-95 transition-transform"
          >
            Hire {price}
          </button>
        ) : (
          <span
            className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg bg-status-inactive/20 text-status-inactive text-sm font-semibold flex items-center"
            title="Provider has not passed Shield verification"
          >
            Unverified
          </span>
        )}
      </div>
```

**Step 2: Add subtle card distinction for unverified providers**

In the same file, update the outer `<div>` on line 42:

From:
```tsx
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
```

To:
```tsx
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${
      verified
        ? 'border-border-card bg-surface'
        : 'border-status-inactive/30 bg-surface/80 opacity-75'
    }`}>
```

**Step 3: Verify**

Run: `npm run build`
Expected: Compiles with no errors. Unverified cards appear muted with disabled hire button.

**Step 4: Commit**

```bash
git add src/components/ResourceCard.tsx
git commit -m "feat(app): disable Hire button on unverified providers (Shield UX)"
```

---

### Task 4: Wire MiniKit.pay() into hire flow with loading UX

**Files:**
- Modify: `src/app/(protected)/home/marketplace-content.tsx`

**Context:** The current `handleHire()` function (lines 37-97) uses a manual 2-step x402 flow. We need to:
1. Add MiniKit `pay()` as the primary payment method (with x402 fallback)
2. Add a visible loading overlay during payment (UX guideline: `loading-buttons` — disable button + show spinner during async)
3. Add error feedback if payment fails (UX guideline: `error-feedback` — clear message near problem)

**Step 1: Add imports and new state**

Add import at top of file (after line 5):

```typescript
import { pay, Tokens } from '@worldcoin/minikit-js';
import { Loader2 } from 'lucide-react';
```

Add new state after `paying` state (after line 30):

```typescript
  const [payError, setPayError] = useState<string | null>(null);
  const [payingResource, setPayingResource] = useState<string | null>(null);
```

**Step 2: Replace handleHire function**

Replace lines 37-97 with:

```typescript
  async function handleHire(resource: { name: string; price: string; type: ResourceType }) {
    if (paying) return;
    setPaying(true);
    setPayError(null);
    setPayingResource(resource.name);

    try {
      // Step 1: Get payment requirements from server
      const initRes = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceName: resource.name,
          resourceType: resource.type,
          amount: parsePrice(resource.price),
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        setPayError(initData.error ?? 'Payment initiation failed');
        return;
      }

      // Step 2: Try MiniKit.pay() (native World App payment)
      let miniKitSuccess = false;
      let miniKitTxHash = '';

      try {
        const payResult = await pay({
          reference: initData.paymentId,
          to: process.env.NEXT_PUBLIC_PAYMENT_RECEIVER ?? '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE',
          tokens: [{ symbol: Tokens.USDC, token_amount: initData.requirements.amount }],
          description: `Hire ${resource.name}`,
          fallback: () => null,
        });

        if (payResult.executedWith === 'minikit' && payResult.result) {
          miniKitSuccess = true;
          miniKitTxHash = payResult.result.transactionId;
        }
      } catch {
        // Not in World App or pay failed — fall through to x402
      }

      if (miniKitSuccess) {
        setPaymentResult({
          amount: initData.requirements.amount,
          txHash: miniKitTxHash,
          resourceName: resource.name,
        });
        return;
      }

      // Step 3: Fallback — x402 payment via server
      const paymentPayload = btoa(JSON.stringify({
        paymentId: initData.paymentId,
        network: initData.requirements.network,
        token: initData.requirements.token,
        amount: initData.requirements.amount,
        payer: 'world-app-user',
        resource: resource.name,
        timestamp: Date.now(),
      }));

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': paymentPayload,
        },
        body: JSON.stringify({ resourceName: resource.name }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPaymentResult({
          amount: data.payment?.amount ?? initData.requirements.amount,
          txHash: data.payment?.txHash ?? 'pending',
          resourceName: resource.name,
        });
      } else {
        setPayError(data.error ?? 'Payment failed');
      }
    } catch {
      setPayError('Network error — please try again');
    } finally {
      setPaying(false);
      setPayingResource(null);
    }
  }
```

**Step 3: Add loading state to Hire button in ResourceCard**

The `paying` and `payingResource` state needs to reach ResourceCard. Update the `onHire` callback in the JSX (around line 124) to pass loading state.

Replace the ResourceCard rendering in the filtered map:

```tsx
          {filtered.map((resource) => (
            <ResourceCard
              key={`${resource.type}-${resource.name}`}
              {...resource}
              onHire={handleHire}
              hiring={paying && payingResource === resource.name}
            />
          ))}
```

Then update `src/components/ResourceCard.tsx` to accept and use `hiring` prop:

Add to `ResourceCardProps` interface:

```typescript
  hiring?: boolean;
```

Add to destructured props:

```typescript
  hiring,
```

Update the verified Hire button to show spinner when hiring:

```tsx
        {verified ? (
          <button
            onClick={() => onHire?.({ name, price, type })}
            disabled={hiring}
            className={`min-h-11 min-w-11 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              hiring
                ? 'bg-primary-accent/60 text-white/80 cursor-wait'
                : 'bg-primary-accent text-white cursor-pointer active:scale-95'
            }`}
          >
            {hiring ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                Paying...
              </span>
            ) : (
              `Hire ${price}`
            )}
          </button>
        ) : (
          <span
            className="min-h-11 min-w-11 px-4 py-2 rounded-lg bg-status-inactive/20 text-status-inactive text-sm font-semibold flex items-center"
            title="Provider has not passed Shield verification"
          >
            Unverified
          </span>
        )}
```

Add `Loader2` to the lucide-react import in ResourceCard.tsx:

```typescript
import { Bot, Cpu, Loader2, User } from 'lucide-react';
```

**Step 4: Add error toast below filter tabs**

In `marketplace-content.tsx`, add error display after the filter tabs (after line 118):

```tsx
      {/* Payment error feedback */}
      {payError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-status-failed/30 bg-status-failed/5 px-4 py-3 text-sm text-status-failed animate-fade-in"
        >
          <span>{payError}</span>
          <button
            onClick={() => setPayError(null)}
            className="ml-2 text-status-failed/60 hover:text-status-failed text-lg leading-none"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}
```

**Step 5: Add env var for payment receiver**

Add to `.env.example` (at the end):

```
# Payment Receiver (for MiniKit pay)
NEXT_PUBLIC_PAYMENT_RECEIVER=0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE
```

**Step 6: Verify**

Run: `npm run build`
Expected: Compiles with no errors.

**Step 7: Commit**

```bash
git add src/app/(protected)/home/marketplace-content.tsx src/components/ResourceCard.tsx .env.example
git commit -m "feat(world): wire MiniKit.pay() with loading spinner, error toast, x402 fallback"
```

---

### Task 5: Update PENDING_WORK.md + ACTIVE_WORK.md

**Files:**
- Modify: `docs/PENDING_WORK.md`
- Modify: `docs/ACTIVE_WORK.md`

**Step 1: Mark P-057 and P-059 done in PENDING_WORK.md**

Change P-057 status from `unclaimed` to `✅ done`, agent to `Agent 7`.
Change P-059 status from `unclaimed` to `✅ done`, agent to `Agent 7`.

**Step 2: Update ACTIVE_WORK.md — mark done**

Change Agent 7 P-057/P-059 row status from `active` to `done`, add completed timestamp.

**Step 3: Commit**

```bash
git add docs/PENDING_WORK.md docs/ACTIVE_WORK.md
git commit -m "docs: mark P-057 (Shield block) + P-059 (MiniKit pay) done"
```

---

### Task 6: Final Verification

**Step 1:** Run `npm run build` — expect zero errors.

**Step 2:** Verify Shield UX:

- Unverified GPU providers: card has muted opacity, "Unverified" label instead of Hire button
- Verified GPU providers: full opacity card, active Hire button with price

**Step 3:** Verify MiniKit pay UX:

- Clicking Hire shows spinner + "Paying..." on the button (loading-buttons guideline)
- In World App: native pay dialog triggers, PaymentConfirmation modal on success
- In browser: x402 fallback flow, PaymentConfirmation modal on success
- On failure: red error toast below filter tabs with dismiss button (error-feedback guideline)
- Error toast uses `role="alert"` for screen readers (accessibility guideline)

**Step 4:** Verify design system compliance:

- Touch targets: all buttons are min 44x44px (`min-h-11 min-w-11`)
- Colors: status-inactive (#94A3B8) for unverified, status-failed (#EF4444) for errors, status-verified (#10B981) for success
- Animations: fade-in on error toast (0.3s), spin on loader
- `cursor-pointer` on active Hire buttons, `cursor-wait` during payment
- `prefers-reduced-motion`: Tailwind's `animate-spin` respects this natively
