# MiniKit v2 Migration — Fix Wallet Auth

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix wallet login crash caused by @worldcoin/minikit-js v2.0.2 breaking changes.

**Architecture:** MiniKit v2 removed `MiniKit.commands` property and changed `walletAuth()` return type from `{ data: { address, message, signature } }` to `{ address, message, signature }` directly. Two fixes needed: (1) update wallet auth to use v2 return shape, (2) downgrade or patch the UI kit's haptic feedback crash.

**Tech Stack:** @worldcoin/minikit-js v2.0.2, @worldcoin/mini-apps-ui-kit-react v1.6.0, next-auth 5

---

### Task 1: Fix walletAuth() result access pattern

**Files:**
- Modify: `src/auth/wallet/index.ts:18-35`

**Problem:** Line 30-33 accesses `result.data.address`, `result.data.message`, `result.data.signature`. In MiniKit v2, `walletAuth()` returns `WalletAuthResult` directly — properties are `result.address`, `result.message`, `result.signature`.

**Step 1: Fix the result destructuring**

```typescript
// OLD (v1): result.data.address
// NEW (v2): result.address

const result = await MiniKit.walletAuth({...});
await signIn('credentials', {
  redirectTo: '/home',
  nonce,
  signedNonce,
  finalPayloadJson: JSON.stringify({
    status: 'success',
    address: result.address,     // was result.data.address
    message: result.message,     // was result.data.message
    signature: result.signature, // was result.data.signature
  }),
});
```

**Step 2: Fix the type import in auth/index.ts**

`src/auth/index.ts:3` imports `from '@worldcoin/minikit-js/commands'` — this still works in v2 (exports map points to `command-exports`) but verify it compiles.

**Step 3: Build to verify**

Run: `npx next build 2>&1 | tail -10`
Expected: Compiled successfully

**Step 4: Commit**

```
fix(world): migrate walletAuth to MiniKit v2 return shape
```

---

### Task 2: Fix haptic feedback crash from UI kit

**Problem:** `@worldcoin/mini-apps-ui-kit-react` v1.6.0 internally calls `window.MiniKit.commands.sendHapticFeedback()` which is removed in minikit-js v2. This is a **library bug** — the UI kit hasn't been updated for minikit-js v2.

**Options:**
1. Downgrade minikit-js to v1.11.0 (last v1) — safest, may break other v2 features
2. Pin UI kit to compatible version — UI kit v1.6.0 IS the latest, no v2-compatible version exists
3. Patch at runtime — add a shim that re-adds `MiniKit.commands` with a no-op haptic

**Chosen: Option 3 (runtime shim)** — least disruptive, haptic feedback is non-critical.

**Files:**
- Modify: `src/providers/index.tsx` (or wherever MiniKit provider is initialized)

**Step 1: Add MiniKit.commands shim in the provider**

After MiniKit initializes, patch `window.MiniKit.commands` with a no-op:

```typescript
// In the MiniKit provider wrapper, after initialization:
if (typeof window !== 'undefined' && window.MiniKit && !window.MiniKit.commands) {
  window.MiniKit.commands = {
    sendHapticFeedback: () => {},
  };
}
```

**Step 2: Build + verify no more "commands has been removed" error**

**Step 3: Commit**

```
fix(world): shim MiniKit.commands for UI kit haptic compatibility
```

---

### Task 3: Deploy and verify

**Step 1:** `vercel --prod`
**Step 2:** Test wallet login in World App
**Step 3:** Update PENDING_WORK.md with P-043 (MiniKit v2 migration)
