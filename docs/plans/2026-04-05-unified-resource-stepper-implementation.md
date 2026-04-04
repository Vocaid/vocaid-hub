# Unified ResourceStepper — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace GPUStepper + 3 inline panels with a single ResourceStepper that handles all 4 resource types in a consistent 3-step flow.

**Architecture:** One component with a type selector at step 1, type-specific fields, type-specific verify logic at step 2, and unified ERC-8004 registration at step 3. Wallet comes from `useSession()` — no manual connect step.

**Tech Stack:** Next.js 15, React 19, next-auth useSession, Tailwind CSS 4, Lucide React

---

### Task 1: Create ResourceStepper.tsx

**Files:**
- Create: `src/components/ResourceStepper.tsx`

This is the main task — a single unified component that replaces GPUStepper + AgentRegisterPanel + HumanRegisterPanel + DePINRegisterPanel.

**Key design decisions:**
- `useSession()` provides wallet — no manual connect step
- Type selector is a row of 4 buttons at the top (part of step 1)
- Step 1: type + type-specific fields
- Step 2: verify (GPU: TEE, others: World ID check)
- Step 3: register on ERC-8004

The component should reuse the exact same StepIndicator, StepConnector, InfoRow, SuccessRow helper components from the current GPUStepper (same CSS classes).

**Step 1: Write the full component**

The component must:
1. Import `useSession` from `next-auth/react`
2. Define 4 type configs with their fields, verify logic, and register endpoints
3. Render the stepper with type-specific content at each step
4. Handle loading/error/success states per step
5. Auto-populate wallet from session on mount

**Type-specific field definitions:**

| Type | Step 1 Fields | Step 2 Verify | Step 3 Register |
|------|--------------|---------------|-----------------|
| GPU | (auto from broker) | GET /api/gpu/list?address=X | POST /api/gpu/register |
| Agent | name + capability select | World ID status check | POST /api/agents/register |
| Human | skill name + category select | World ID status check | POST /api/agents/register |
| DePIN | device name + type select + capacity | Demo validation | POST /api/agents/register |

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/ResourceStepper.tsx
git commit -m "feat: add unified ResourceStepper for all 4 resource types"
```

---

### Task 2: Wire ResourceStepper into GPUVerifyTabs

**Files:**
- Modify: `src/app/(protected)/gpu-verify/GPUVerifyTabs.tsx`

**Step 1: Replace the register tab content**

Replace the entire register section (the type selector + conditional panel rendering) with a single `<ResourceStepper />` import:

```typescript
import ResourceStepper from '@/components/ResourceStepper';

// In the render:
{activeTab === 'register' && <ResourceStepper />}
```

Remove:
- `AgentRegisterPanel` function
- `HumanRegisterPanel` function
- `DePINRegisterPanel` function
- `AGENT_CAPABILITIES` constant
- `SKILL_CATEGORIES` constant
- `DEPIN_TYPES` constant
- The type selector buttons
- The `registerType` state
- The `getSessionAddress` helper (ResourceStepper uses useSession instead)

Also remove the `import GPUStepper` since ResourceStepper replaces it.

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/\(protected\)/gpu-verify/GPUVerifyTabs.tsx
git commit -m "feat: wire ResourceStepper into register tab, remove old panels"
```

---

### Task 3: Delete old GPUStepper

**Files:**
- Delete: `src/components/GPUStepper.tsx`

**Step 1: Remove the file**

```bash
git rm src/components/GPUStepper.tsx
```

**Step 2: Search for remaining imports**

```bash
grep -r "GPUStepper" src/ --include="*.tsx" --include="*.ts"
```

If any imports remain, update them to use ResourceStepper.

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`

**Step 4: Commit**

```bash
git commit -m "refactor: delete GPUStepper.tsx (replaced by ResourceStepper)"
```

---

### Task 4: Build + E2E Test + Deploy

**Step 1: Clean build**

```bash
rm -rf .next node_modules/.cache && npx next build
```

**Step 2: Start dev server and test each flow**

```bash
npm run dev
```

Test in browser at `http://localhost:3000/gpu-verify`:

1. Click "Register" tab
2. **GPU flow:** Select GPU → wallet shows auto-populated → click Verify → shows model/TEE → click Register → shows agentId
3. **Agent flow:** Select Agent → enter name + select capability → click Verify → shows World ID check → click Register → shows agentId
4. **Human flow:** Select Human → enter skill + select category → click Verify → shows verified → click Register → shows agentId
5. **DePIN flow:** Select DePIN → enter device + select type → click Verify → shows device info → click Register → shows agentId

**Step 3: Push**

```bash
git push origin main
```

---

## Verification Checklist

1. [ ] ResourceStepper renders on Register tab
2. [ ] 4 type buttons visible (GPU / Agent / Human / DePIN)
3. [ ] Wallet auto-populated from session (no manual connect)
4. [ ] GPU: Step 2 discovers node from 0G broker
5. [ ] Agent: Capability is a dropdown select
6. [ ] Human: Category is a dropdown select
7. [ ] DePIN: Type is a dropdown select
8. [ ] All types: Step 3 shows agentId + txHash on success
9. [ ] All types: Error state shows retry button
10. [ ] All types: Demo mode works when testnet unreachable
11. [ ] GPUStepper.tsx deleted, no broken imports
12. [ ] `npx next build` passes
