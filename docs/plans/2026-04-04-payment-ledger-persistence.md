# P-081: Payment Ledger Persistence + Stale Doc Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the in-memory payment ledger with file-based JSON so demo payments survive server restarts, and clean up the stale Agent Autonomy Gap section in PENDING_WORK.md.

**Architecture:** Create a simple `PaymentLedger` helper in `src/lib/payment-ledger.ts` that reads/writes `data/payments.json`. The payment route (`src/app/api/payments/route.ts`) swaps the in-memory array for ledger function calls. The `data/` directory is gitignored (runtime data, not source).

**Tech Stack:** Node.js `fs` (readFileSync/writeFileSync), JSON, no external deps.

---

### Task 1: Clean up stale Agent Autonomy Gap section

**Files:**
- Modify: `docs/PENDING_WORK.md:103-113`

**Step 1: Replace the stale section**

The section says "Infrastructure is 95% complete" and lists P-057/058/060/061/062 as affected. All 5 are now done. Replace with a resolved note:

```markdown
## 🏗️ Agent Autonomy Gap (Cross-Cutting) — RESOLVED

> All agent autonomy gaps have been addressed:
> - P-057: Shield validation check in `/api/resources` — DONE (Agent 6)
> - P-058: Lens writes `giveFeedback()` after payments — DONE (Agent 3)
> - P-060: Seer 0G Compute inference via `/api/seer/inference` — DONE (Agent 4)
> - P-061: Edge trade execution via `/api/edge/trade` — DONE (Agent 6)
> - P-062: Agent-to-agent fleet demo script — DONE (Agent 6)
> - P-075: A2A dynamic endpoints per agent — DONE (Agent 4)
> - P-076: MCP dynamic endpoints per agent — DONE (Agent 4)
>
> The agent fleet is fully operational via API routes, demo scripts, and A2A/MCP endpoints.
```

**Step 2: Commit**

```bash
git add docs/PENDING_WORK.md
git commit -m "docs: mark Agent Autonomy Gap section as fully resolved"
```

---

### Task 2: Create payment ledger helper

**Files:**
- Create: `src/lib/payment-ledger.ts`

**Step 1: Write the helper**

```typescript
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const LEDGER_PATH = join(DATA_DIR, "payments.json");
const MAX_PAYMENTS = 50;

export interface PaymentRecord {
  id: string;
  payer: string;
  amount: string;
  resource: string;
  txHash: string;
  network: string;
  settledAt: string;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readPayments(): PaymentRecord[] {
  ensureDir();
  if (!existsSync(LEDGER_PATH)) return [];
  try {
    return JSON.parse(readFileSync(LEDGER_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export function addPayment(record: PaymentRecord): void {
  const payments = readPayments();
  payments.unshift(record);
  if (payments.length > MAX_PAYMENTS) payments.length = MAX_PAYMENTS;
  writeFileSync(LEDGER_PATH, JSON.stringify(payments, null, 2));
}
```

**Step 2: Commit**

```bash
git add src/lib/payment-ledger.ts
git commit -m "feat: add file-based payment ledger (data/payments.json)"
```

---

### Task 3: Wire ledger into payment route

**Files:**
- Modify: `src/app/api/payments/route.ts:12-24,30-32,121-132`

**Step 1: Replace in-memory array with ledger calls**

Remove lines 12-24 (PaymentRecord interface + recentPayments array + MAX_PAYMENTS constant).

Add import at top:
```typescript
import { readPayments, addPayment, type PaymentRecord } from "@/lib/payment-ledger";
```

Replace GET handler (line 30-32):
```typescript
export async function GET() {
  return NextResponse.json({ payments: readPayments() });
}
```

Replace ledger write (lines 121-132):
```typescript
    // Step 4: Record in persistent demo ledger
    const record: PaymentRecord = {
      id: crypto.randomUUID(),
      payer: verification.payer,
      amount: verification.amount,
      resource: body?.resourceName ?? "unknown",
      txHash: settlement.txHash,
      network: verification.network,
      settledAt: new Date().toISOString(),
    };
    addPayment(record);
```

**Step 2: Verify build**

Run: `npm run build 2>&1 | grep -E "payments/route|error" | head -5`
Expected: No errors related to payments/route

**Step 3: Commit**

```bash
git add src/app/api/payments/route.ts
git commit -m "feat: persist payment ledger to data/payments.json (survives restart)"
```

---

### Task 4: Gitignore data directory

**Files:**
- Modify: `.gitignore`

**Step 1: Add data/ to gitignore**

Append to `.gitignore`:
```
# Runtime data (payment ledger, demo state)
data/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore data/ directory (runtime demo state)"
```

---

### Task 5: Update docs

**Files:**
- Modify: `docs/PENDING_WORK.md` — mark P-081 done
- Modify: `docs/ACTIVE_WORK.md` — add Agent 6 row

**Step 1: Mark P-081 done**

Change P-081 status from `unclaimed` to `✅ done`, Agent to `Agent 6`.

**Step 2: Commit**

```bash
git add docs/PENDING_WORK.md docs/ACTIVE_WORK.md
git commit -m "docs: mark P-081 payment ledger persistence done"
```

---

## Verification

1. `npm run build` passes
2. Start dev server, make a payment via `/api/payments` POST, restart server, `GET /api/payments` still returns the payment
3. `data/payments.json` exists after first write
4. `data/` is not tracked by git (`git status` shows nothing under data/)
