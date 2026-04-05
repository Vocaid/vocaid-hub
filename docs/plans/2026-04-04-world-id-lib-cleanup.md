# World ID Lib Cleanup — Remove Next.js Dependencies

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove deprecated Next.js-specific code from `src/lib/world-id.ts` so the Fastify backend doesn't pull in Next.js dependencies when importing `isVerifiedOnChain`.

**Architecture:** Delete 2 imports and 2 functions (~35 lines). The Fastify plugin `server/plugins/world-id-gate.ts` already replaces this functionality. No consumers exist.

**Tech Stack:** TypeScript, viem

---

### Task 1: Remove Next.js imports and deprecated functions

**Files:**
- Modify: `src/lib/world-id.ts:4-5` (delete imports), `:106-147` (delete functions)

**Step 1: Delete the Next.js imports (lines 4-5)**

Remove these two lines:
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
```

**Step 2: Delete the deprecated `requireWorldId` function (lines 106-130)**

Remove the entire function including its JSDoc comment block (lines 106-130).

**Step 3: Delete the deprecated `withWorldIdGate` function (lines 132-147)**

Remove the entire function including its JSDoc comment block (lines 132-147).

**Step 4: Verify no blank line pile-up at end of file**

File should end cleanly after the `isVerifiedOnChain` function (line 104) with a single trailing newline.

**Step 5: Run TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck
npx tsc -p server/tsconfig.json --noEmit --skipLibCheck
```

Expected: No new errors. Pre-existing errors in other Wave 3A/3B files are acceptable.

**Step 6: Commit**

```bash
git add src/lib/world-id.ts
git commit -m "refactor: remove deprecated Next.js code from world-id.ts (Wave 2 cleanup)"
```
