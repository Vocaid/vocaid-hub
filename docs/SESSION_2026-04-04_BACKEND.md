# Session Log: Backend Migration + Hardening — 2026-04-04

44 commits across 4 work streams. All 125 tests passing at session end.

---

## Work Stream 1: Wave 3A — World ID + Auth Routes (4 endpoints)

Migrated from `src/app/api/` to `server/routes/` with Zod validation.

| Endpoint | File | Key Details |
|----------|------|-------------|
| `POST /api/rp-signature` | `server/routes/world-id.ts` | WASM `signRequest()`, rate limited 30/min |
| `POST /api/verify-proof` | `server/routes/world-id.ts` | World Developer Portal v4/v2 fallback, CredentialGate + Hedera mint + HCS audit |
| `GET /api/world-id/check` | `server/routes/world-id.ts` | Auth-gated `isVerifiedOnChain()` read |
| `GET /api/auth/session` + `ALL /api/auth/*` | `server/routes/auth.ts` | JWT decode from cookie + proxy to Next.js |

**Schemas created:** `server/schemas/world-id.ts` — `RpSignatureBodySchema`, `VerifyProofBodySchema`, `WorldIdCheckQuerySchema`

---

## Work Stream 2: Wave 3B — Chain Interaction Routes (9 endpoints)

| Endpoint | File | Chain | Gate |
|----------|------|-------|------|
| `GET/POST /api/predictions` | `server/routes/predictions.ts` | 0G (ethers) | None |
| `POST /api/predictions/:id/bet` | `server/routes/predictions.ts` | 0G | None |
| `POST /api/predictions/:id/claim` | `server/routes/predictions.ts` | 0G | None |
| `POST /api/predictions/:id/resolve` | `server/routes/predictions.ts` | 0G + Hedera HCS | None |
| `GET /api/gpu/list` | `server/routes/gpu.ts` | 0G broker TEE | World ID |
| `POST /api/gpu/register` | `server/routes/gpu.ts` | 0G (ERC-8004 + GPUProviderRegistry) | World ID |
| `POST /api/edge/trade` | `server/routes/edge.ts` | 0G + Hedera HCS | World ID |
| `POST /api/seer/inference` | `server/routes/seer.ts` | 0G broker | World ID |
| `GET/POST /api/reputation` | `server/routes/reputation.ts` | 0G (ReputationRegistry) | World ID |

**Schemas created:** `server/schemas/predictions.ts`, `server/schemas/gpu.ts`

---

## Work Stream 3: Security Audit + Remediation

### P0 — Security Fixes

| ID | Fix | File |
|----|-----|------|
| S1 | Auth proxy path traversal guard (`..`, `//`, leading `/`) | `server/routes/auth.ts` |
| S2 | Auth proxy `session` returns 405 instead of empty 200 | `server/routes/auth.ts` |
| S3 | `decodeProof` validates 512 hex chars before BigInt parse | `server/routes/world-id.ts` |
| S4 | Removed `.passthrough()` from `VerifyProofBodySchema`, enumerated known v4 fields | `server/schemas/world-id.ts` |
| S5 | Reputation value bounded to `int 0-100`, tag1 enum-constrained | `server/routes/reputation.ts` |

### P1 — Reliability Fixes

| ID | Fix | Files |
|----|-----|-------|
| R1 | Singleton `ethers.JsonRpcProvider` per route file | `predictions.ts`, `gpu.ts`, `edge.ts`, `proposals.ts` |
| R2 | `tx.wait()` wrapped in 60s `Promise.race` timeout | `predictions.ts` (5x), `gpu.ts` (2x), `edge.ts` (1x), `proposals.ts` (3x) |
| R3 | Rate limiting on all 13 POST endpoints | All route files |

### P2 — Consistency Fixes

- Seer fallback: `verified: false` instead of `null`
- Predictions resolve: skip HCS when `HEDERA_AUDIT_TOPIC` not set

---

## Work Stream 4: Wave H3 — Integration Wiring

| Task | File | Change |
|------|------|--------|
| Blocky402 timeout + retry | `src/lib/blocky402.ts` | `fetchWithTimeout` (15s) + `withRetry` (verify: 2 retries, settle: 1 retry) |
| 0G broker timeout | `src/lib/og-broker.ts` | `fetchWithTimeout` (30s) on `callInference` |
| Cache invalidation | 6 route files | POST handlers flush cached GET via `app.responseCache.invalidate()` |
| Hedera import fix | `src/lib/hedera.ts` | Fixed broken import path `../server/` to `../../server/` |

---

## Implementation Evaluation — Gaps Found & Closed

During the hardening review, these additional gaps were found and fixed:

| Gap | File | Fix |
|-----|------|-----|
| Per-request provider leak | `proposals.ts` | Singleton provider |
| 3x bare `tx.wait()` | `proposals.ts` | 60s timeout wrappers |
| No rate limiting | `proposals.ts`, `payments.ts` | Added 5/min and 10/min limits |
| No cache invalidation | `proposals.ts`, `gpu.ts`, `edge.ts` | Added invalidation on success |
| Bare `tx.wait()` bet action | `edge.ts` | 60s timeout wrapper |

---

## Mock API Request Test Results

All tests run against `localhost:5001`:

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | `GET /health` | 200 + 7 plugins listed | 200 |
| 2 | Security headers present | nosniff, DENY, strict-origin | All present |
| 3 | `POST /rp-signature` empty body | 400 Zod error | 400 |
| 4 | `POST /rp-signature` valid | 200 + sig/nonce | 200 |
| 5 | Auth path traversal `..%2F..%2F` | 400 blocked | 400 |
| 6 | `GET /auth/session` no token | 401 | 401 |
| 7 | `GET /world-id/check` no auth | 401 | 401 |
| 8 | `GET /world-id/check` bad address | 400 Zod error | 400 |
| 9 | `GET /predictions` | 500 (chain unreachable) | 500 |
| 10 | `GET /reputation` no auth | 401 | 401 |
| 11 | `POST /reputation` value=999 | 400 (max 100) | 400 |
| 12 | `POST /verify-proof` missing action | 400 | 400 |
| 13 | Rate limit: 31st rp-signature | 429 | 429 |
| 15 | `GET /gpu/list` no auth | 401 | 401 |
| 16 | `POST /edge/trade` no auth | 401 | 401 |
| 17 | `POST /seer/inference` no auth | 401 | 401 |
| 18 | `POST /predictions` short question | 400 (min 5 chars) | 400 |

---

## Docs Updated

| Document | Changes |
|----------|---------|
| `docs/ARCHITECTURE.md` | Expanded Backend Hardening: integration wiring table, cache invalidation matrix, rate limiting coverage (13 endpoints) |
| `README.md` | Test count: 34 to 125 tests (12 files) |
| `docs/PITCH_STRATEGY.md` | Added Q&A: "Is the backend production-ready?" |
| `docs/PENDING_WORK.md` | Added P-110 to P-115 (all done) |

---

## Test Suite

**125 tests across 12 files — all passing.**

- `server/__tests__/fetch-with-timeout.test.ts` — 5 tests
- `server/__tests__/retry.test.ts` — 12 tests
- `server/__tests__/circuit-breaker.test.ts` — 11 tests
- `server/__tests__/response-cache.test.ts` — 6 tests
- `src/lib/__tests__/hedera.test.ts` — 4 tests
- 7 other test files — 87 tests
