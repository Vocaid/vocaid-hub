# P-020 + P-021: Test Infrastructure & Auth Type Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add minimal test infrastructure with vitest + fix the `@ts-expect-error` in auth/index.ts.

**Architecture:** Vitest (ESM-native, zero-config for Next.js 15). Tests cover pure math in prediction-math.ts and the audit trail parser in hedera.ts. Auth fix is a 5-line refactor matching NextAuth's expected callback signature.

**Tech Stack:** Vitest, TypeScript, Next.js 15

---

### Task 1: Fix P-021 — `@ts-expect-error` in auth/index.ts

**Files:**
- Modify: `src/auth/index.ts:38-47`

**Step 1: Replace the authorize callback**

Replace lines 38-47:
```typescript
      // @ts-expect-error TODO
      authorize: async ({
        nonce,
        signedNonce,
        finalPayloadJson,
      }: {
        nonce: string;
        signedNonce: string;
        finalPayloadJson: string;
      }) => {
```

With:
```typescript
      authorize: async (credentials) => {
        const nonce = credentials?.nonce as string;
        const signedNonce = credentials?.signedNonce as string;
        const finalPayloadJson = credentials?.finalPayloadJson as string;
```

This matches NextAuth's expected `(credentials: Partial<Record<string, unknown>>) => Awaitable<User | null>` signature. The `as string` casts are safe because these fields are defined in the `credentials` config above (lines 33-37).

**Step 2: Verify type check**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | grep "auth/index" | head -5`
Expected: 0 errors

**Step 3: Verify no remaining @ts-expect-error**

Run: `grep -rn "@ts-expect-error" src/`
Expected: 0 results (or only in node_modules)

**Step 4: Commit**

```bash
git add src/auth/index.ts
git commit -m "fix(auth): remove @ts-expect-error — match NextAuth authorize signature (P-021)"
```

---

### Task 2: Install vitest + create config

**Files:**
- Run: `npm install -D vitest`
- Create: `vitest.config.ts`
- Modify: `package.json` (add test script)

**Step 1: Install vitest**

Run: `npm install -D vitest`

**Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

**Step 3: Add test script to package.json**

Add to `scripts`: `"test": "vitest run"`

**Step 4: Verify vitest runs**

Run: `npx vitest run 2>&1 | tail -5`
Expected: "No test files found" (not an error — just no tests yet)

**Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test framework + config (P-020)"
```

---

### Task 3: Test prediction-math.ts — pure math functions

**Files:**
- Create: `src/lib/__tests__/prediction-math.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  simulateBet,
  formatOdds,
  formatMultiplier,
  isHighImpact,
  isBlockedImpact,
  formatPool,
} from '../prediction-math';

describe('simulateBet', () => {
  it('returns equal odds on empty pools', () => {
    const result = simulateBet(0n, 0n, 'yes', 100n);
    expect(result.newYesOdds).toBe(1);
    expect(result.newNoOdds).toBe(0);
    expect(result.estimatedPayout).toBe(100n);
    expect(result.estimatedMultiplier).toBe(1);
  });

  it('calculates correct odds for yes bet on balanced pool', () => {
    const result = simulateBet(1000n, 1000n, 'yes', 100n);
    expect(result.newYesOdds).toBeGreaterThan(0.5);
    expect(result.newNoOdds).toBeLessThan(0.5);
    expect(result.newYesOdds + result.newNoOdds).toBeCloseTo(1, 5);
  });

  it('calculates correct odds for no bet on balanced pool', () => {
    const result = simulateBet(1000n, 1000n, 'no', 100n);
    expect(result.newNoOdds).toBeGreaterThan(0.5);
    expect(result.newYesOdds).toBeLessThan(0.5);
  });

  it('payout exceeds bet amount when winning side is smaller', () => {
    const result = simulateBet(900n, 100n, 'no', 50n);
    expect(result.estimatedPayout).toBeGreaterThan(50n);
    expect(result.estimatedMultiplier).toBeGreaterThan(1);
  });

  it('reports price impact', () => {
    const result = simulateBet(1000n, 1000n, 'yes', 500n);
    expect(result.priceImpact).toBeGreaterThan(0);
  });

  it('handles large bets without overflow', () => {
    const large = 10n ** 18n;
    const result = simulateBet(large, large, 'yes', large);
    expect(result.newYesOdds).toBeGreaterThan(0.5);
    expect(result.estimatedMultiplier).toBeGreaterThan(0);
  });
});

describe('formatOdds', () => {
  it('formats 0.5 as 50.0%', () => {
    expect(formatOdds(0.5)).toBe('50.0%');
  });

  it('formats 1.0 as 100.0%', () => {
    expect(formatOdds(1)).toBe('100.0%');
  });

  it('formats 0 as 0.0%', () => {
    expect(formatOdds(0)).toBe('0.0%');
  });
});

describe('formatMultiplier', () => {
  it('formats 2.5 as 2.5x', () => {
    expect(formatMultiplier(2.5)).toBe('2.5x');
  });

  it('formats 1 as 1.0x', () => {
    expect(formatMultiplier(1)).toBe('1.0x');
  });
});

describe('isHighImpact', () => {
  it('returns false at 5%', () => {
    expect(isHighImpact(0.05)).toBe(false);
  });

  it('returns true above 5%', () => {
    expect(isHighImpact(0.051)).toBe(true);
  });
});

describe('isBlockedImpact', () => {
  it('returns false at 10%', () => {
    expect(isBlockedImpact(0.10)).toBe(false);
  });

  it('returns true above 10%', () => {
    expect(isBlockedImpact(0.101)).toBe(true);
  });
});

describe('formatPool', () => {
  it('formats large values with k suffix', () => {
    const oneThousandEth = (1000n * 10n ** 18n).toString();
    expect(formatPool(oneThousandEth)).toBe('1000.0k');
  });

  it('formats mid values with 1 decimal', () => {
    const fiveEth = (5n * 10n ** 18n).toString();
    expect(formatPool(fiveEth)).toBe('5.0');
  });

  it('formats small values with 4 decimals', () => {
    const small = (10n ** 14n).toString();
    expect(formatPool(small)).toBe('0.0001');
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All 15 tests pass

**Step 3: Commit**

```bash
git add src/lib/__tests__/prediction-math.test.ts
git commit -m "test: add prediction-math unit tests — 15 tests for core game economics (P-020)"
```

---

### Task 4: Test hedera.ts — queryAuditTrail parser

**Files:**
- Create: `src/lib/__tests__/hedera.test.ts`

**Step 1: Write tests (mocked fetch)**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryAuditTrail } from '../hedera';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('queryAuditTrail', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('parses base64 messages from Mirror Node response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [
          {
            sequence_number: 1,
            message: btoa('{"type":"payment","amount":"0.01"}'),
            consensus_timestamp: '1711900000.000000000',
            topic_id: '0.0.12345',
          },
        ],
      }),
    });

    const messages = await queryAuditTrail('0.0.12345', 10);
    expect(messages).toHaveLength(1);
    expect(messages[0].sequenceNumber).toBe(1);
    expect(messages[0].contents).toBe('{"type":"payment","amount":"0.01"}');
    expect(messages[0].topicId).toBe('0.0.12345');
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(queryAuditTrail('0.0.99999')).rejects.toThrow('Mirror Node query failed');
  });

  it('returns empty array for topic with no messages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    const messages = await queryAuditTrail('0.0.12345');
    expect(messages).toHaveLength(0);
  });

  it('respects limit parameter in URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    await queryAuditTrail('0.0.12345', 5);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=5'),
    );
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All 19 tests pass (15 prediction + 4 hedera)

**Step 3: Commit**

```bash
git add src/lib/__tests__/hedera.test.ts
git commit -m "test: add hedera audit trail parser tests — 4 tests with mocked Mirror Node (P-020)"
```

---

### Task 5: Update docs — mark P-020 and P-021 done

**Files:**
- Modify: `docs/PENDING_WORK.md`
- Modify: `docs/ACTIVE_WORK.md`

**Step 1: Update PENDING_WORK.md**

- P-020: Change status to `✅ done`, agent to `Agent 4`
- P-021: Change status to `✅ done`, agent to `Agent 4`

**Step 2: Update ACTIVE_WORK.md**

Add done row for Agent 4.

**Step 3: Commit**

```bash
git add docs/PENDING_WORK.md docs/ACTIVE_WORK.md
git commit -m "docs: mark P-020 + P-021 done in PENDING_WORK and ACTIVE_WORK"
```

---

## Verification

1. `npx vitest run` — 19 tests pass (15 prediction-math + 4 hedera)
2. `npx tsc --noEmit --skipLibCheck` — 0 errors
3. `grep -rn "@ts-expect-error" src/` — 0 results
4. `grep "unclaimed" docs/PENDING_WORK.md` — only P-031 (favicon) remains
5. README.md — no changes needed (doesn't reference tests)
