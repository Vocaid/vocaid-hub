# Fix Registration Flows — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 4 resource registration flows (GPU, Agent, Human, DePIN) — bypass World ID for demo, auto-populate wallet, fix form layouts, add capability dropdown.

**Architecture:** The Agent/Human/DePIN flows all share `/api/agents/register` which gates on `isVerifiedOnChain()`. Adding a `DEMO_MODE` env bypass solves all three. GPU stepper needs auto-session detection. Form layouts need consistent styling matching the design system.

**Tech Stack:** Next.js 15, Tailwind CSS 4, viem, 0G Galileo

---

### Task 1: Add DEMO_MODE bypass to /api/agents/register

**Files:**
- Modify: `src/app/api/agents/register/route.ts` (lines 45-55)

**Step 1: Add demo mode bypass before the World ID check**

Find (line 45-55):
```typescript
    // Verify the operator has a valid World ID on-chain
    const isVerified = await isVerifiedOnChain(operatorAddress as Address);
    if (!isVerified) {
      return NextResponse.json(
        {
          error:
            "Operator address is not World ID verified. Complete World ID verification first.",
        },
        { status: 403 },
      );
    }
```

Replace with:
```typescript
    // Verify the operator has a valid World ID on-chain
    // In demo mode, skip on-chain verification (testnet may be unreachable)
    const demoMode = process.env.DEMO_MODE === 'true';
    if (!demoMode) {
      const isVerified = await isVerifiedOnChain(operatorAddress as Address);
      if (!isVerified) {
        return NextResponse.json(
          {
            error:
              "Operator address is not World ID verified. Complete World ID verification first.",
          },
          { status: 403 },
        );
      }
    }
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add src/app/api/agents/register/route.ts
git commit -m "fix(agents): add DEMO_MODE bypass for World ID check in registration"
```

---

### Task 2: Auto-populate wallet in GPUStepper

**Files:**
- Modify: `src/components/GPUStepper.tsx`

**Step 1: Add useEffect to auto-connect on mount**

After the existing state declarations (around line 134), add a `useEffect` that auto-triggers `connectWallet` on mount:

```typescript
  // Auto-connect wallet from session on mount (user is already authenticated)
  useEffect(() => {
    if (!walletAddress && step1.status === 'idle') {
      connectWallet();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
```

This means when the user opens the GPU tab, step 1 auto-completes from the session and jumps to step 2 immediately.

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/GPUStepper.tsx
git commit -m "fix(gpu): auto-populate wallet from session on mount"
```

---

### Task 3: Fix Agent capability to dropdown + consistent layout

**Files:**
- Modify: `src/app/(protected)/gpu-verify/GPUVerifyTabs.tsx` (AgentRegisterPanel, lines 204-307)

**Step 1: Change capability from text input to select dropdown**

In `AgentRegisterPanel`, find the capability input field and replace with a select/dropdown:

```tsx
<div className="flex flex-col gap-1.5">
  <label htmlFor="agent-capability" className="text-sm font-medium text-primary">
    Capability
  </label>
  <select
    id="agent-capability"
    value={capability}
    onChange={(e) => setCapability(e.target.value)}
    className="min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary-accent/30 cursor-pointer"
  >
    <option value="">Select capability...</option>
    <option value="signal-analysis">Signal Analysis</option>
    <option value="code-review">Code Review</option>
    <option value="data-processing">Data Processing</option>
    <option value="translation">Translation</option>
    <option value="inference">AI Inference</option>
    <option value="custom">Custom</option>
  </select>
</div>
```

**Step 2: Ensure consistent card wrapper**

All form content should be inside:
```tsx
<div className="rounded-xl border border-border-card bg-white p-4 flex flex-col gap-4 shadow-sm">
```

**Step 3: Commit**

```bash
git add src/app/\(protected\)/gpu-verify/GPUVerifyTabs.tsx
git commit -m "fix(agent): change capability to dropdown select + consistent card layout"
```

---

### Task 4: Fix Human registration layout

**Files:**
- Modify: `src/app/(protected)/gpu-verify/GPUVerifyTabs.tsx` (HumanRegisterPanel, lines 318-412)

**Step 1: Fix layout to match Agent panel**

Ensure HumanRegisterPanel has:
- Card wrapper: `rounded-xl border border-border-card bg-white p-4 flex flex-col gap-4 shadow-sm`
- All inputs: `min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm`
- All labels: `text-sm font-medium text-primary` with `htmlFor`
- Category should be a `<select>` dropdown (not text input)
- Submit button: `min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold cursor-pointer`

**Step 2: Commit**

```bash
git add src/app/\(protected\)/gpu-verify/GPUVerifyTabs.tsx
git commit -m "fix(human): consistent card layout + proper spacing for human registration"
```

---

### Task 5: Fix DePIN registration layout

**Files:**
- Modify: `src/app/(protected)/gpu-verify/GPUVerifyTabs.tsx` (DePINRegisterPanel, lines 423-517)

**Step 1: Same layout fixes as Human panel**

- Card wrapper with shadow-sm
- All inputs min-h-[44px]
- Infrastructure type as `<select>` dropdown
- Labels with htmlFor
- Consistent button styling

**Step 2: Commit**

```bash
git add src/app/\(protected\)/gpu-verify/GPUVerifyTabs.tsx
git commit -m "fix(depin): consistent card layout + proper spacing for DePIN registration"
```

---

### Task 6: Build + Verify + Deploy

**Step 1: Clean build**

```bash
rm -rf .next node_modules/.cache && npx next build
```

**Step 2: Test each flow**

1. Open `/gpu-verify` → GPU tab → wallet should auto-populate
2. Switch to Agent tab → select capability from dropdown → submit → should succeed (DEMO_MODE=true)
3. Switch to Human tab → form layout matches Agent → submit succeeds
4. Switch to DePIN tab → form layout matches → submit succeeds

**Step 3: Push**

```bash
git push origin main
```

---

## Verification

1. [ ] GPU: Step 1 auto-fills wallet (no manual connect button needed)
2. [ ] Agent: Capability is a `<select>` dropdown with 6 options
3. [ ] Agent: Registration succeeds when DEMO_MODE=true in .env.local
4. [ ] Human: Card layout matches Agent panel (rounded-xl, shadow-sm, gap-4)
5. [ ] Human: Category is a dropdown, all inputs have 44px height
6. [ ] DePIN: Same layout consistency as Human/Agent
7. [ ] DePIN: Registration succeeds
8. [ ] All 4 forms show success state after registration
9. [ ] `npx next build` passes
