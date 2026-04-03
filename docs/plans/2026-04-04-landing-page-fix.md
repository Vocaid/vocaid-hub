# Landing Page Fix — Brand + Auth Error

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 issues on the landing page: (1) multi-color chain icons should be purple-only brand color, (2) logo not rendering, (3) auto-auth error crashing the page.

**Architecture:** The landing page at `src/app/page.tsx` is the unauthenticated entry point. It renders inside World App via MiniKit. The AuthButton auto-fires `walletAuth()` on mount, which fails with digest error because the SIWE flow crashes server-side. The chain icons use 3 different colors (blue/green/purple) but brand requires purple-only.

**Tech Stack:** Next.js 15, Tailwind CSS 4, @worldcoin/minikit-js, next-auth 5

---

### Task 1: Fix landing page — purple-only chain icons + logo

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace multi-color chain icons with purple brand color and fix logo**

The chain icons currently use `bg-chain-world/10` (blue), `bg-chain-og/10` (green), `bg-chain-hedera/10` (purple). User wants ALL purple.

Also fix:
- Font size `text-[11px]` → `text-xs` (12px)
- Add `mb-16` for World App bottom nav reserve

```tsx
// Replace the entire chain icons section + fix font sizes
// All 3 circles: bg-chain-hedera/10 + text-chain-hedera (purple only)
```

**Step 2: Verify logo renders**

The `<Image src="/app-logo.png">` was added but user reports it's not rendering (text shows instead). Check if `public/app-logo.png` exists and is valid.

Run: `ls -la public/app-logo.png`

If exists, the issue is likely the app was built before the file was committed. Rebuild.

---

### Task 2: Fix AuthButton auto-auth crash

**Files:**
- Modify: `src/components/AuthButton/index.tsx`

**Root cause analysis:**

The error `Error {digest: "3142902775"}` is a Next.js server-side error digest. The auto-auth flow:
1. `useEffect` fires on mount when `isInstalled === true`
2. Calls `walletAuth()` → `MiniKit.walletAuth()` → `signIn('credentials', ...)`
3. `signIn` with `redirectTo: '/home'` causes a server-side redirect
4. During redirect, the auth `authorize()` callback runs server-side
5. `MiniKit.getUserInfo()` fails server-side (it's a client-only API)
6. The error gets serialized as a digest

**Fix:** Remove auto-auth on mount. The user should explicitly tap "Login with Wallet". Auto-auth is aggressive UX and causes crashes when the MiniKit SIWE flow doesn't complete cleanly.

Also: remove `console.log` debugging statements.

---

### Task 3: Commit and verify

**Step 1:** `npx next build` passes
**Step 2:** Commit with proper message
**Step 3:** Update ACTIVE_WORK.md
