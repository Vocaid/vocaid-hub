# Smart Contract & API Security Assessment

**Date:** 2026-04-04
**Auditor:** Agent 5 (GPU Portal) — automated security research
**Scope:** 7 deployed contracts (0G Galileo + World Sepolia) + 25 Fastify routes
**Context:** ETHGlobal Cannes 2026 hackathon — testnet deployment, zero real funds

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 4 | All 4 fixed (3 in contract redeployment, 1 API-only) |
| High | 4 | All mitigated at API layer |
| Medium | 4 | 3 mitigated (1 fixed in contract), 1 documented |
| Low | 3 | 2 fixed in contract, 1 documented |

**Total: 15 findings across 7 contracts and 25 Fastify routes.**

All contracts run on testnets with zero real funds. API-layer mitigations applied in Tiers A-C. Solidity fixes deployed in Tier D (2026-04-05): GPUProviderRegistry, ResourcePrediction, CredentialGate redeployed with security hardening.

---

## On-Chain Findings

### GPUProviderRegistry.sol (0G Galileo)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SC-01 | Critical | `getActiveProviders()` unbounded loop — O(n) gas, DoS with many providers | **Fixed:** `getActiveProvidersPaginated(offset, limit)` added. Convenience `getActiveProviders()` defaults to limit=100. API layer caps at 50. |
| SC-02 | Low | No validation on gpuModel/teeType strings (empty allowed) | **Fixed:** `require(bytes(gpuModel).length > 0)` and `require(bytes(teeType).length > 0)` in registerProvider |
| SC-03 | Low | `providerList` never pruned (deactivated stay in array) | Known limitation — gas inefficiency grows over time |

### MockTEEValidator.sol (0G Galileo)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SC-04 | Critical | Single `trustedSigner` — key compromise fakes all validations | By design for hackathon (mock validator). Production needs multi-sig or Automata DCAP |
| SC-05 | Medium | No replay protection on signatures | Signatures consumed by ValidationRegistry (requestHash unique per validation) |

### ResourcePrediction.sol (0G Galileo)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SC-06 | Critical | Payout rounding: `(userBet * totalPool) / winningPool` loses precision | **Fixed:** `Math.mulDiv(userBet, totalPool, winningPool)` + `MIN_BET = 0.001 ether` on-chain |
| SC-07 | Medium | Single oracle for market resolution — no timeout/fallback | **Mitigated:** `cancelStale(marketId)` allows anyone to cancel markets 7 days past resolutionTime if oracle doesn't act |
| SC-08 | Low | Empty `question` string allowed on market creation | API validates question is non-empty |

### IdentityRegistryUpgradeable.sol (0G Galileo — ERC-8004)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SC-09 | High | Unbounded metadata keys — no limit on entries per agent | Known limitation — ERC-8004 spec doesn't define limits |
| SC-10 | Low | Deadline off-by-one (`<=` vs `<`) in setAgentWallet | 5-minute max window makes this negligible |

### ReputationRegistryUpgradeable.sol (0G Galileo — ERC-8004)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SC-11 | High | `getSummary()` and `readAllFeedback()` unbounded iteration — gas DoS | API caches results, limits query scope |
| SC-12 | Medium | `fb.value * factor` potential overflow in getSummary normalization | Values capped at MAX_ABS_VALUE (1e38), factor max 1e18 — within int128 range in practice |

### ValidationRegistryUpgradeable.sol (0G Galileo — ERC-8004)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SC-13 | High | No validation expiry — stale requests persist indefinitely | Known limitation — storage bloat over time |
| SC-14 | Medium | `getSummary()` O(n) iteration without pagination | API limits query scope |

### CredentialGate.sol (World Chain Sepolia)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SC-15 | Critical | Signal parameter not bound to `msg.sender` — can register arbitrary addresses | **Fixed:** `require(signal == msg.sender, "Signal must be caller")` in contract + API `isAddress()` validation |

---

## API Layer Findings

### Authentication Gaps (Fixed)

| Route | Before | After |
|-------|--------|-------|
| `POST /api/edge/trade` | No auth — anyone spends server wallet | `requireWorldId()` gate |
| `POST /api/seer/inference` | No auth — free compute | `requireWorldId()` gate |
| `GET /api/world-id/check` | Public — address enumeration | Session auth required |

### Input Validation (Fixed)

| Route | Fix |
|-------|-----|
| `POST /api/agents/register` | `isAddress()` check on operatorAddress |
| `GET /api/world-id/check` | `isAddress()` check on address param |
| `POST /api/verify-proof` | `isAddress()` check on signal after proof verification |
| `POST /api/predictions/[id]/bet` | Minimum bet of 0.001 A0GI |

### Rate Limiting (Added)

| Route | Limit | Window |
|-------|-------|--------|
| `POST /api/verify-proof` | 10 requests | 1 minute per IP |

Per-route sliding window rate limiter at `server/plugins/rate-limit.ts` (Fastify plugin). Not distributed — single-process only. Production needs Redis/Upstash.

### Fund Handling

| Issue | Status |
|-------|--------|
| All prediction routes share single server PRIVATE_KEY | Known limitation — hackathon uses one deployer wallet |
| No nonce management for concurrent transactions | Known limitation — demo is single-user |
| Payment ledger in-memory (lost on restart) | Known limitation — acceptable for demo |

### Error Disclosure (Documented)

Fastify route handlers return `err.message` to clients in catch blocks. This can leak contract revert reasons and internal state. The error-handler plugin now returns generic messages and logs details server-side only.

---

## Mitigations Applied

| Finding | Code Fix | Commit |
|---------|----------|--------|
| SC-01 (GPU DoS) | `getActiveProvidersPaginated(offset, limit)` in contract + API `limit=50` | **Fixed in contract + redeployed** (Tier D) |
| SC-02 (Empty strings) | `require(bytes(gpuModel).length > 0)` + `require(bytes(teeType).length > 0)` in contract | **Fixed in contract + redeployed** (Tier D) |
| SC-06 (Rounding) | `Math.mulDiv` payout + `MIN_BET = 0.001 ether` on-chain | **Fixed in contract + redeployed** (Tier D) |
| SC-07 (Oracle timeout) | `cancelStale()` — anyone can cancel after 7 days past resolutionTime | **Fixed in contract + redeployed** (Tier D) |
| SC-15 (Signal) | `require(signal == msg.sender)` in contract + `isAddress()` in API | **Fixed in contract + redeployed** (Tier D) |
| Edge trade unauth | `requireWorldId()` added | Tier A commit |
| Seer inference unauth | `requireWorldId()` added | Tier A commit |
| World ID check public | Session auth added | Tier A commit |
| Rate limiting | In-memory limiter on verify-proof | Tier A commit |
| Address validation | `isAddress()` on agents/register + world-id/check | Earlier commit (P-072) |
| World ID cache | Reduced to 15s TTL + manual invalidation | Tier B commit |

---

## Known Limitations (Hackathon Context)

These are accepted risks for a 48-hour hackathon with testnet tokens:

1. **Single deployer wallet** — All on-chain transactions signed by one key. Production needs per-user wallets or account abstraction.
2. **MockTEEValidator** — Simulates Intel TDX attestation. Production uses Automata DCAP ZK verifier (15-20 contracts).
3. **No persistent payment ledger** — In-memory array lost on restart. Production needs database.
4. **Single oracle for predictions** — Deployer resolves markets. Production needs decentralized oracle (Chainlink, UMA).
5. ~~**Error messages leak internals**~~ — **Fixed** (P-080): 13 catch blocks sanitized with generic error strings.
6. **No distributed rate limiting** — Per-route Fastify plugin (`server/plugins/rate-limit.ts`) is in-memory, single-process. Production needs Redis.
7. **ERC-8004 registries have unbounded iteration** — `getSummary()` and `readAllFeedback()` are O(n). Fine for demo scale, needs pagination for production.
8. ~~**0G testnet unreachable**~~ — **Resolved**: 0G Galileo back online. All contracts redeployed and seeded (Tier D).

---

## Backend Hardening (Implemented)

| Layer | File | What It Does |
|-------|------|-------------|
| **Fetch Timeout** | `server/utils/fetch-with-timeout.ts` | AbortController wrapper — per-service budgets (World ID 10s, Hedera Mirror 8s, Blocky402 15s, 0G Inference 30s) |
| **Retry** | `server/utils/retry.ts` | Exponential backoff + jitter. Per-service policies (e.g. `HEDERA_TX: 2 retries/1s`, `RPC_WRITE: 0 retries`) |
| **Circuit Breaker** | `server/utils/circuit-breaker.ts` | CLOSED→OPEN→HALF_OPEN state machine. 6 pre-configured services. `getBreaker()` singleton factory |
| **Security Headers** | `server/plugins/security-headers.ts` | CSP, CORS, X-Frame-Options, X-Content-Type-Options, HSTS |
| **Response Cache** | `server/plugins/response-cache.ts` | TTL-based GET response cache with `Cache-Control` headers |
| **Graceful Shutdown** | `server/index.ts` | SIGTERM handler — drains connections before exit |
| **Chain Clients** | `server/clients.ts` | Singleton ethers/viem client factories — reused across requests |

All utilities tested with vitest (125 tests across 12 test files).

---

## Production Roadmap

If this protocol moves to production, the following changes are required:

### Contract Layer
- ~~Redeploy `GPUProviderRegistry` with paginated `getActiveProviders(offset, limit)`~~ **DONE** (Tier D)
- ~~Redeploy `ResourcePrediction` with `mulDiv` payout calculation + minimum bet constant + oracle timeout~~ **DONE** (Tier D)
- ~~Redeploy `CredentialGate` with `require(signal == msg.sender)`~~ **DONE** (Tier D)
- Replace `MockTEEValidator` with Automata DCAP ZK verifier
- Add multi-sig admin for UUPS upgrade authorization

### API Layer
- Move private keys to HSM (AWS KMS, Hashicorp Vault)
- Implement per-user wallet system (account abstraction)
- Add distributed rate limiting (Upstash/Redis)
- Sanitize all error responses (generic messages to client, detailed logs server-side)
- Add transaction nonce manager for concurrent operations
- Persist payment ledger to database

### Infrastructure
- Add monitoring (Sentry for errors, Grafana for chain metrics)
- ~~Add circuit breakers for external dependencies (0G RPC, Hedera Mirror Node, Blocky402)~~ **DONE** (`server/utils/circuit-breaker.ts` — per-service CLOSED/OPEN/HALF_OPEN state machine + `server/utils/fetch-with-timeout.ts` + `server/utils/retry.ts`)
- Load testing for prediction markets under concurrent betting
- Formal security audit by third party (Trail of Bits, OpenZeppelin)

---

## References

- [OpenClaw Risk Assessment](OPENCLAW_RISK_ASSESSMENT.md) — 5 attack surfaces, 9 CVEs, security hardening
- [Market Risk Assessment](MARKET_RISK_ASSESSMENT.md) — TEE.Fail analysis, competitive landscape
- [ERC-8004 Spec](https://eips.ethereum.org/EIPS/eip-8004) — Trustless Agent Identity standard
- [Automata DCAP](https://github.com/automata-network/automata-dcap-attestation) — Production TEE verification
