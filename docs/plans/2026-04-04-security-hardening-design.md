# Security Hardening Design — Smart Contracts + API Routes

**Date:** 2026-04-04
**Author:** Agent 5 (GPU Portal) — security research + brainstorming
**Scope:** 7 deployed contracts (0G Galileo + World Sepolia) + 19 API routes
**Findings:** 4 critical, 4 high, 4 medium, 3 low

---

## Three Tiers

### Tier A: Bounty-Blocking Fixes (7 code changes)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 1 | `/api/edge/trade` no auth — anyone spends server wallet | Add `requireWorldId()` | `src/app/api/edge/trade/route.ts` |
| 2 | `/api/seer/inference` no auth — free compute | Add `requireWorldId()` | `src/app/api/seer/inference/route.ts` |
| 3 | CredentialGate signal !== caller | Validate signal === session wallet in verify-proof | `src/app/api/verify-proof/route.ts` |
| 4 | Error messages leak contract internals | Generic error responses | All API routes |
| 5 | No rate limiting | In-memory rate limiter on public routes | New `src/lib/rate-limit.ts` |
| 6 | Payment ledger in-memory (lost on restart) | Persist to file or 0G Storage | `src/app/api/payments/route.ts` |
| 7 | `/api/world-id/check` leaks verification status | Require auth | `src/app/api/world-id/check/route.ts` |

### Tier B: Demo-Breaking Fixes (5 stability changes)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 8 | `getActiveProviders()` unbounded loop | Cap at 50, paginate | `src/lib/og-chain.ts` |
| 9 | Prediction payout rounding | Min bet validation + warning | `src/app/api/predictions/[id]/bet/route.ts` |
| 10 | Nonce collision on concurrent txs | Nonce manager or tx queue | `src/lib/og-chain.ts` |
| 11 | MockTEE single signer risk | Log validations to HCS | `src/app/api/gpu/register/route.ts` |
| 12 | World ID cache 60s too long for demo | Reduce to 15s + manual invalidation | `src/lib/world-id.ts` |

### Tier C: Documentation

| Deliverable | Path |
|-------------|------|
| Full security assessment | `docs/SECURITY_ASSESSMENT.md` |
| README Documentation Index update | `README.md` |
| PENDING_WORK items for unfixed issues | `docs/PENDING_WORK.md` |
| ACTIVE_WORK session log | `docs/ACTIVE_WORK.md` |

### Tier D: Contract Redeployment (blocked by testnet)

| Contract | Fix |
|----------|-----|
| `GPUProviderRegistry.sol` | Paginated `getActiveProviders(offset, limit)` + string validation |
| `ResourcePrediction.sol` | `mulDiv` payout + min bet + oracle timeout |
| `CredentialGate.sol` | `require(signal == msg.sender)` |

Queued as PENDING_WORK items. Blocked by 0G testnet SSL timeout (P-049).

---

## Approved Design Decisions

- API-layer mitigations now, contract redeployment when testnet recovers
- `docs/SECURITY_ASSESSMENT.md` (not root SECURITY.md) — matches existing docs pattern
- Rate limiter: simple in-memory (no Redis for hackathon)
- Payment persistence: file-based JSON (no database for hackathon)
- Nonce manager: ethers `NonceManager` wrapper on wallet client
- All 3 tiers implemented in single session
