# Unified ResourceStepper — Architecture Design

**Date:** 2026-04-05
**Problem:** 4 inconsistent registration panels. GPU has a polished 3-step stepper; Agent/Human/DePIN have flat forms with different layouts. Wallet connect is redundant (already in session). Agent registration fails without World ID (fixed via DEMO_MODE but semantically wrong).
**Solution:** Single ResourceStepper component replacing GPUStepper + all 3 panels. Same 3-step visual flow for all types, type-specific fields render conditionally.

---

## Architecture

### Component: `src/components/ResourceStepper.tsx`

Replaces:
- `src/components/GPUStepper.tsx` (delete after migration)
- `AgentRegisterPanel` in GPUVerifyTabs.tsx (remove)
- `HumanRegisterPanel` in GPUVerifyTabs.tsx (remove)
- `DePINRegisterPanel` in GPUVerifyTabs.tsx (remove)

### 3-Step Flow

```
┌─────────────────────────────────────────────┐
│ Step 1: Identity                            │
│                                             │
│ Select resource type:                       │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│ │ GPU │ │Agent│ │Human│ │DePIN│           │
│ └─────┘ └─────┘ └─────┘ └─────┘           │
│                                             │
│ Wallet: 0x58c4...7eeE ✓ (from session)     │
│                                             │
│ [Type-specific fields]                      │
│  GPU: model name (auto from broker)         │
│  Agent: name + capability dropdown          │
│  Human: skill name + category dropdown      │
│  DePIN: device name + type + capacity       │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Step 2: Verify                              │
│                                             │
│  GPU: TEE attestation via 0G broker         │
│       Shows: model, endpoint, TEE status    │
│                                             │
│  Agent: World ID verification check         │
│       Shows: verified ✓ or demo mode        │
│                                             │
│  Human: World ID proof of personhood        │
│       Shows: verified ✓ (already done)      │
│                                             │
│  DePIN: Device validation (demo mode)       │
│       Shows: type, capacity, location       │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Step 3: Register on ERC-8004                │
│                                             │
│  All types: Register identity on 0G Chain   │
│  GPU: + GPUProviderRegistry                 │
│  Human: + HumanSkillRegistry                │
│  DePIN: + DePINRegistry                     │
│  Agent: IdentityRegistry only               │
│                                             │
│  Shows: agentId, txHash, explorer link      │
└─────────────────────────────────────────────┘
```

### Wallet Connection Strategy

**NO manual wallet connect step.** The wallet comes from the session via `useSession()` hook:

```typescript
import { useSession } from 'next-auth/react';

function ResourceStepper() {
  const { data: session } = useSession();
  const walletAddress = session?.user?.id ?? session?.user?.walletAddress;

  // If no wallet, show error — user should be authenticated by protected layout
  if (!walletAddress) return <div>Authentication required</div>;

  // Start at Step 1 with wallet already connected
  // ...
}
```

This eliminates the redundant wallet connect step entirely.

### API Routing Per Type

| Type | Step 2 API | Step 3 API |
|------|-----------|-----------|
| GPU | `GET /api/gpu/list?address=0x...` | `POST /api/gpu/register` |
| Agent | Internal World ID check | `POST /api/agents/register` |
| Human | Internal World ID check | `POST /api/agents/register` (role: human-provider) |
| DePIN | Demo validation | `POST /api/agents/register` (role: depin-provider) |

### Props Interface

```typescript
interface ResourceStepperProps {
  defaultType?: 'gpu' | 'agent' | 'human' | 'depin';
}
```

### Visual Design

Same stepper indicators as current GPUStepper:
- Step circles: 1/2/3 with check marks on completion
- Vertical connector lines between steps
- Success state: green checks, explorer link, agentId display
- Error state: red text with retry button
- Loading state: Loader2 spinner
- Card wrapper: `rounded-xl border border-border-card bg-white p-5 shadow-sm`

### E2E Test Plan

1. **GPU registration:**
   - Select "GPU" → wallet auto-populated → click "Verify Node" → shows model/TEE → click "Register" → shows agentId + txHash

2. **Agent registration:**
   - Select "Agent" → wallet auto-populated → enter name + select capability → click "Verify" → shows World ID status → click "Register" → shows agentId

3. **Human registration:**
   - Select "Human" → wallet auto-populated → enter skill + select category → click "Verify" → shows "Verified Human" → click "Register" → shows agentId

4. **DePIN registration:**
   - Select "DePIN" → wallet auto-populated → enter device + type + capacity → click "Verify" → shows device info → click "Register" → shows agentId

---

## Files

| Action | File |
|--------|------|
| Create | `src/components/ResourceStepper.tsx` (unified 3-step component) |
| Modify | `src/app/(protected)/gpu-verify/GPUVerifyTabs.tsx` (remove 3 panels, use ResourceStepper) |
| Delete | `src/components/GPUStepper.tsx` (replaced by ResourceStepper) |

## Verification

1. All 4 resource types register successfully
2. Wallet auto-populated from session (no manual connect)
3. Step indicators consistent across all types
4. Success state shows agentId + txHash + explorer link
5. Error state shows retry button
6. Demo mode works when 0G testnet is unreachable
7. `npx next build` passes
