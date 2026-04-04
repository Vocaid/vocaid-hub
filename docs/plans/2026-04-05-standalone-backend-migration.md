# Standalone Node.js Backend — Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all 24 API routes from Next.js serverless to a standalone Express server — fixes WASM crash, satisfies World ID bounty requirement, enables persistent process for SDK singletons.

**Architecture:** Next.js (:3000) serves SSR/UI only. Express (:5001) owns all `/api/*` routes. `next.config.ts` rewrites proxy transparently. Shared code stays in `src/lib/` — no duplication.

**Tech Stack:** Express 4, tsx (dev runner), cors, existing src/lib modules (ethers, viem, @hashgraph/sdk, @0glabs/0g-serving-broker, @worldcoin/idkit)

---

### Task 1: Express Skeleton + WASM Init + Dev Script Wiring

**Wave:** Foundation (must complete before all other tasks)
**Parallelizable:** No — all other tasks depend on this

**Files:**
- Create: `server/index.ts`
- Create: `server/tsconfig.json`
- Modify: `package.json` (add deps + scripts)
- Modify: `scripts/dev.sh` (add `[api]` tagged process)
- Modify: `next.config.ts` (add rewrites)

**Step 1: Install dependencies**

```bash
npm install express cors
npm install -D @types/express @types/cors
```

**Step 2: Create `server/tsconfig.json`**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "../dist/server",
    "rootDir": ".",
    "paths": {
      "@/*": ["../src/*"]
    }
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create `server/index.ts`**

```typescript
import express from 'express';
import cors from 'cors';
import { IDKit } from '@worldcoin/idkit';

const app = express();
const PORT = process.env.BACKEND_PORT ?? 5001;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', wasm: true, port: PORT });
});

// Route imports (added in Tasks 3A/3B/3C)
// import worldIdRoutes from './routes/world-id';
// app.use('/api', worldIdRoutes);

// Start server after WASM initialization
async function start() {
  console.log('[api] Initializing World ID WASM...');
  try {
    await IDKit.initServer();
    console.log('[api] ✓ WASM initialized');
  } catch (err) {
    console.warn('[api] WASM init failed (non-fatal for non-World-ID routes):', err);
  }

  app.listen(PORT, () => {
    console.log(`[api] ✓ Express backend ready at http://localhost:${PORT}`);
  });
}

start();
```

**Step 4: Add scripts to `package.json`**

Add to `"scripts"`:
```json
"dev:backend": "npx tsx watch server/index.ts",
"build:backend": "npx tsc -p server/tsconfig.json",
"start:backend": "node dist/server/index.js"
```

**Step 5: Update `scripts/dev.sh`**

Add new `[api]` section between ngrok and Next.js startup (after line 155, before line 157):

```bash
# ============================================================
# 5b. Start Express Backend (API server)
# ============================================================
TAG_API="${GREEN}[api]${NC}"

echo -e "${TAG_API} Starting Express backend on :5001..."
npm run dev:backend 2>&1 | prefix "$TAG_API" &
API_PID=$!
PIDS+=($API_PID)

for i in {1..15}; do
  if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${TAG_API} ${GREEN}✓ Backend ready at http://localhost:5001${NC}"
    break
  fi
  sleep 1
done
```

Update status summary section to include backend:
```bash
echo -e "  ${GREEN}[api]${NC}    http://localhost:5001"
```

**Step 6: Update `next.config.ts`**

Add rewrites to proxy `/api/*` to Express:

```typescript
async rewrites() {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5001';
  return {
    fallback: [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
    ],
  };
},
```

**Step 7: Run and verify**

```bash
npm run dev:backend
# Expected: [api] ✓ Express backend ready at http://localhost:5001
curl http://localhost:5001/health
# Expected: { "status": "ok", "wasm": true, "port": 5001 }
```

**Step 8: Commit**

```bash
git add server/ package.json scripts/dev.sh next.config.ts
git commit -m "feat: Express backend skeleton + WASM init + dev.sh wiring"
```

---

### Task 2: Express Middleware Layer

**Wave:** Foundation (must complete before route tasks)
**Parallelizable:** No — routes depend on this

**Files:**
- Create: `server/middleware/auth.ts`
- Create: `server/middleware/world-id-gate.ts`
- Create: `server/middleware/rate-limit.ts`
- Create: `server/middleware/error-handler.ts`

**Step 1: Create `server/middleware/auth.ts`**

Port NextAuth JWT validation from `src/auth/index.ts`. Read the JWT from cookie or Authorization header, verify with `NEXTAUTH_SECRET`, extract `user.id`, `user.walletAddress`.

Reuse: `src/auth/index.ts` for session types and secret.

**Step 2: Create `server/middleware/world-id-gate.ts`**

Port `requireWorldId()` from `src/lib/world-id.ts` to Express middleware format:

```typescript
// Returns 403 if user's address not verified on CredentialGate
import { isVerifiedOnChain } from '@/lib/world-id';
```

**Step 3: Create `server/middleware/rate-limit.ts`**

Port from `src/lib/rate-limit.ts` — in-memory sliding window per IP.

**Step 4: Create `server/middleware/error-handler.ts`**

Centralized Express error handler — logs full error server-side, returns generic message to client (P-080 pattern).

**Step 5: Commit**

```bash
git add server/middleware/
git commit -m "feat: Express middleware — auth, world-id gate, rate limit, error handler"
```

---

### Task 3A: World ID + Auth Routes

**Wave:** Routes (parallelizable with 3B and 3C)
**Depends on:** Task 1, Task 2

**Files:**
- Create: `server/routes/world-id.ts`
- Create: `server/routes/auth.ts`
- Modify: `server/index.ts` (register routes)

**Routes migrated:**
| Route | Method | Source |
|-------|--------|--------|
| `/api/rp-signature` | POST | `src/app/api/rp-signature/route.ts` |
| `/api/verify-proof` | POST | `src/app/api/verify-proof/route.ts` |
| `/api/world-id/check` | GET | `src/app/api/world-id/check/route.ts` |
| `/api/auth/*` | GET/POST | `src/app/api/auth/[...nextauth]/route.ts` |

**Critical:** `/api/rp-signature` uses `signRequest()` — WASM is already initialized in `server/index.ts` startup.

**Reuse from src/lib:**
- `signRequest`, `IDKit` from `@worldcoin/idkit`
- `isVerifiedOnChain`, `registerOnChain` from `src/lib/world-id.ts`
- `mintCredential`, `logAuditMessage` from `src/lib/hedera.ts`
- `checkRateLimit` from `src/lib/rate-limit.ts`

**Step 1: Write the routes**

Port each Next.js route handler to Express `router.post()` / `router.get()` format. Replace `NextRequest`/`NextResponse` with `req`/`res`.

**Step 2: Register in server/index.ts**

```typescript
import worldIdRoutes from './routes/world-id';
import authRoutes from './routes/auth';
app.use('/api', worldIdRoutes);
app.use('/api', authRoutes);
```

**Step 3: Test**

```bash
curl -X POST http://localhost:5001/api/rp-signature \
  -H 'Content-Type: application/json' \
  -d '{"action":"verify-human"}'
# Expected: 200 with { rp_id, sig, nonce, created_at, expires_at }
```

**Step 4: Commit**

```bash
git add server/routes/world-id.ts server/routes/auth.ts server/index.ts
git commit -m "feat: migrate World ID + auth routes to Express backend"
```

---

### Task 3B: Chain Interaction Routes

**Wave:** Routes (parallelizable with 3A and 3C)
**Depends on:** Task 1, Task 2

**Files:**
- Create: `server/routes/predictions.ts`
- Create: `server/routes/gpu.ts`
- Create: `server/routes/edge.ts`
- Create: `server/routes/seer.ts`
- Create: `server/routes/reputation.ts`
- Modify: `server/index.ts` (register routes)

**Routes migrated:**
| Route | Method | Source |
|-------|--------|--------|
| `/api/predictions` | GET/POST | `src/app/api/predictions/route.ts` |
| `/api/predictions/[id]/bet` | POST | `src/app/api/predictions/[id]/bet/route.ts` |
| `/api/predictions/[id]/claim` | POST | `src/app/api/predictions/[id]/claim/route.ts` |
| `/api/predictions/[id]/resolve` | POST | `src/app/api/predictions/[id]/resolve/route.ts` |
| `/api/gpu/list` | GET | `src/app/api/gpu/list/route.ts` |
| `/api/gpu/register` | POST | `src/app/api/gpu/register/route.ts` |
| `/api/edge/trade` | POST | `src/app/api/edge/trade/route.ts` |
| `/api/seer/inference` | POST | `src/app/api/seer/inference/route.ts` |
| `/api/reputation` | GET/POST | `src/app/api/reputation/route.ts` |

**Reuse from src/lib:**
- `ethers` for contract calls (predictions, GPU, edge)
- `src/lib/og-compute.ts` — listProviders, verifyProvider
- `src/lib/og-broker.ts` — callInference
- `src/lib/og-chain.ts` — getValidationSummary, getRegisteredProviders
- `src/lib/hedera.ts` — logAuditMessage
- `src/lib/reputation.ts` — giveFeedback, getReputation, getAllReputationScores
- `src/lib/contracts.ts` — addresses, ABIs

**Step 1: Write routes** — port each handler from NextRequest/NextResponse to Express req/res

**Step 2: Apply middleware** — `requireWorldId` on gpu/register, edge/trade, seer/inference, reputation POST

**Step 3: Test**

```bash
curl http://localhost:5001/api/predictions
# Expected: 200 with market list or demo data

curl -X POST http://localhost:5001/api/seer/inference \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"test"}'
# Expected: 200 with inference result or demo fallback
```

**Step 4: Commit**

```bash
git add server/routes/predictions.ts server/routes/gpu.ts server/routes/edge.ts server/routes/seer.ts server/routes/reputation.ts server/index.ts
git commit -m "feat: migrate chain interaction routes to Express (predictions, GPU, edge, seer, reputation)"
```

---

### Task 3C: Agent + Payment + Discovery Routes

**Wave:** Routes (parallelizable with 3A and 3B)
**Depends on:** Task 1, Task 2

**Files:**
- Create: `server/routes/agents.ts`
- Create: `server/routes/payments.ts`
- Create: `server/routes/resources.ts`
- Create: `server/routes/activity.ts`
- Create: `server/routes/hedera.ts`
- Create: `server/routes/proposals.ts`
- Create: `server/routes/agent-decision.ts`
- Create: `server/routes/well-known.ts`
- Modify: `server/index.ts` (register routes)

**Routes migrated:**
| Route | Method | Source |
|-------|--------|--------|
| `/api/agents` | GET | `src/app/api/agents/route.ts` |
| `/api/agents/register` | POST | `src/app/api/agents/register/route.ts` |
| `/api/agents/:name/a2a` | GET/POST | `src/app/api/agents/[name]/a2a/route.ts` |
| `/api/agents/:name/mcp` | GET/POST | `src/app/api/agents/[name]/mcp/route.ts` |
| `/api/payments` | GET/POST | `src/app/api/payments/route.ts` |
| `/api/initiate-payment` | POST | `src/app/api/initiate-payment/route.ts` |
| `/api/resources` | GET | `src/app/api/resources/route.ts` |
| `/api/activity` | GET | `src/app/api/activity/route.ts` |
| `/api/hedera/audit` | GET | `src/app/api/hedera/audit/route.ts` |
| `/api/proposals` | GET/POST | `src/app/api/proposals/route.ts` |
| `/api/agent-decision` | GET | `src/app/api/agent-decision/route.ts` |
| `/.well-known/agent-card.json` | GET | `src/app/.well-known/agent-card.json/route.ts` |

**Reuse from src/lib:**
- `src/lib/agent-router.ts` — dispatch, rate limiting
- `src/lib/agents/*.ts` — handler modules
- `src/lib/agentkit.ts` — listRegisteredAgents, registerAgent, getAgent
- `src/lib/blocky402.ts` — verifyPayment, settlePayment
- `src/lib/payment-ledger.ts` — readPayments, addPayment
- `src/lib/cache.ts` — cachedFetch, circuit breaker

**Step 1: Write routes** — port each handler

**Step 2: Apply middleware** — `requireWorldId` on payments POST, agents register

**Step 3: Test**

```bash
curl http://localhost:5001/api/agents
# Expected: 200 with agent list

curl http://localhost:5001/api/resources
# Expected: 200 with resource list

curl http://localhost:5001/.well-known/agent-card.json
# Expected: 200 with composite agent card
```

**Step 4: Commit**

```bash
git add server/routes/ server/index.ts
git commit -m "feat: migrate agent, payment, discovery routes to Express"
```

---

### Task 4: Cleanup + Docs + Deploy

**Wave:** Finalization (after all route tasks complete)
**Parallelizable:** No — depends on 3A + 3B + 3C

**Files:**
- Delete: `src/app/api/` (all route files — moved to Express)
- Keep: `src/app/.well-known/` if needed as fallback
- Modify: `docs/ARCHITECTURE.md`
- Modify: `README.md`
- Modify: `docs/PENDING_WORK.md`
- Modify: `docs/ACTIVE_WORK.md`

**Step 1: Remove Next.js API routes**

```bash
rm -rf src/app/api/
```

Keep `src/app/.well-known/` only if Express doesn't serve it.

**Step 2: Update `docs/ARCHITECTURE.md`**

- Update the file tree: remove `app/api/` section, add `server/` section
- Update rendering strategy table: remove API routes from Next.js
- Add new section: "Backend Architecture (Express :5001)"
- Update "Data Ownership" table with backend as owner
- Update contract/chain interaction diagram

**Step 3: Update `README.md`**

- Update Architecture diagram: show Express as separate box
- Update "Getting Started" section: add backend startup
- Update Project Structure: add `server/` directory listing
- Update API Routes table: note they run on Express, not Next.js
- Add "Backend Development" section with dev/build/deploy commands
- Update deployed infrastructure section

**Step 4: Update `docs/PENDING_WORK.md`**

- Mark backend migration as done
- Log any new gaps discovered during migration

**Step 5: Update `docs/ACTIVE_WORK.md`**

- Add migration work rows

**Step 6: Deploy**

- Vercel: redeploy Next.js (frontend only, no API routes)
- Railway/Render/fly.io: deploy Express backend
- Update environment variables on both platforms
- Verify end-to-end: World App → Next.js → Express → chains

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: complete backend migration — remove Next.js API routes, update docs"
```

---

## Verification Checklist

After all tasks complete:

```bash
# 1. Dev startup works
./scripts/dev.sh
# Expected: [ngrok] [api] [next] [claw] all start with colored tags

# 2. WASM works
curl -X POST http://localhost:5001/api/rp-signature \
  -H 'Content-Type: application/json' -d '{"action":"verify-human"}'
# Expected: 200 with signature

# 3. World ID verify works in World App
# Tap "Verify with World ID" → completes successfully

# 4. Chain routes work
curl http://localhost:5001/api/predictions
curl http://localhost:5001/api/resources
curl http://localhost:5001/api/agents

# 5. Proxy works (frontend → backend)
curl http://localhost:3000/api/predictions
# Expected: same response as :5001 (proxied)

# 6. Tests pass
npx vitest run
# Expected: 91 tests pass (src/lib unchanged)

# 7. TypeScript clean
npx tsc --noEmit --skipLibCheck
# Expected: 0 errors
```
