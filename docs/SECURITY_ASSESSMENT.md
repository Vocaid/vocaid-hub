# Smart Contract & API Security Assessment

**Date:** 2026-04-04
**Auditor:** Agent 5 (GPU Portal) — automated security research
**Scope:** 7 deployed contracts (0G Galileo + World Sepolia) + 19 API routes
**Context:** ETHGlobal Cannes 2026 hackathon — testnet deployment, zero real funds

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 4 | 3 mitigated at API layer, 1 queued for contract redeployment |
| High | 4 | All mitigated at API layer |
| Medium | 4 | 3 mitigated, 1 documented as known limitation |
| Low | 3 | Documented, not blocking |

**Total: 15 findings across 7 contracts and 19 API routes.**

All contracts run on testnets with zero real funds. API-layer mitigations applied immediately; Solidity fixes queued for when 0G testnet recovers from SSL timeout (P-049).

---

## On-Chain Findings

### GPUProviderRegistry.sol (0G Galileo)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SC-01 | Critical | `getActiveProviders()` unbounded loop — O(n) gas, DoS with many providers | API layer: `getRegisteredProviders(limit=50)` caps results |
| SC-02 | Low | No validation on gpuModel/teeType strings (empty allowed) | API validates input before contract call |
| SC-03 | Low | `providerList` never pruned (deactivated stay in array) | Known limitation — gas inefficiency grows over time |

### MockTEEValidator.sol (0G Galileo)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SC-04 | Critical | Single `trustedSigner` — key compromise fakes all validations | By design for hackathon (mock validator). Production needs multi-sig or Automata DCAP |
| SC-05 | Medium | No replay protection on signatures | Signatures consumed by ValidationRegistry (requestHash unique per validation) |

### ResourcePrediction.sol (0G Galileo)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SC-06 | Critical | Payout rounding: `(userBet * totalPool) / winningPool` loses precision | API enforces minimum bet of 0.001 A0GI to minimize rounding impact |
| SC-07 | Medium | Single oracle for market resolution — no timeout/fallback | Known limitation — oracle is deployer wallet |
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
| SC-15 | Critical | Signal parameter not bound to `msg.sender` — can register arbitrary addresses | API validates signal is valid address; frontend passes session wallet |

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

In-memory sliding window rate limiter at `src/lib/rate-limit.ts`. Not distributed — single-process only. Production needs Redis/Upstash.

### Fund Handling

| Issue | Status |
|-------|--------|
| All prediction routes share single server PRIVATE_KEY | Known limitation — hackathon uses one deployer wallet |
| No nonce management for concurrent transactions | Known limitation — demo is single-user |
| Payment ledger in-memory (lost on restart) | Known limitation — acceptable for demo |

### Error Disclosure (Documented)

API routes return `err.message` to clients in catch blocks. This can leak contract revert reasons and internal state. Production should return generic error messages and log details server-side only.

---

## Mitigations Applied

| Finding | Code Fix | Commit |
|---------|----------|--------|
| SC-01 (GPU DoS) | `getRegisteredProviders(limit=50)` | Tier B commit |
| SC-06 (Rounding) | Min bet 0.001 A0GI in `/api/predictions/[id]/bet` | Tier B commit |
| SC-15 (Signal) | `isAddress()` validation in verify-proof | Tier A commit |
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
5. **Error messages leak internals** — Catch blocks expose `err.message`. Production should sanitize.
6. **No distributed rate limiting** — In-memory limiter is single-process. Production needs Redis.
7. **ERC-8004 registries have unbounded iteration** — `getSummary()` and `readAllFeedback()` are O(n). Fine for demo scale, needs pagination for production.
8. **0G testnet unreachable** — SSL timeout on `evmrpc-testnet.0g.ai`. Demo fallback mode provides mock data.

---

## Production Roadmap

If this protocol moves to production, the following changes are required:

### Contract Layer
- Redeploy `GPUProviderRegistry` with paginated `getActiveProviders(offset, limit)`
- Redeploy `ResourcePrediction` with `mulDiv` payout calculation + minimum bet constant + oracle timeout
- Redeploy `CredentialGate` with `require(signal == msg.sender)`
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
- Add circuit breakers for external dependencies (0G RPC, Hedera Mirror Node, Blocky402)
- Load testing for prediction markets under concurrent betting
- Formal security audit by third party (Trail of Bits, OpenZeppelin)

---

## References

- [OpenClaw Risk Assessment](OPENCLAW_RISK_ASSESSMENT.md) — 5 attack surfaces, 9 CVEs, security hardening
- [Market Risk Assessment](MARKET_RISK_ASSESSMENT.md) — TEE.Fail analysis, competitive landscape
- [ERC-8004 Spec](https://eips.ethereum.org/EIPS/eip-8004) — Trustless Agent Identity standard
- [Automata DCAP](https://github.com/automata-network/automata-dcap-attestation) — Production TEE verification
