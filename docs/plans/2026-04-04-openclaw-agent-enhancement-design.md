# OpenClaw Agent Enhancement — Design Document

**Date:** 2026-04-04
**Problem:** Agents fail with "No API key for provider anthropic" — auth-profiles.json missing for seer/edge/shield/lens. Also, Shield and Lens lack dedicated API routes for the demo pipeline.
**Solution:** Copy Anthropic auth to all agents + add /api/shield/clearance and /api/lens/feedback routes with demo fallbacks.

---

## Part 1: Fix Anthropic Auth for All Agents

Create `auth-profiles.json` in each agent directory:
- `~/.openclaw/agents/seer/agent/auth-profiles.json`
- `~/.openclaw/agents/edge/agent/auth-profiles.json`
- `~/.openclaw/agents/shield/agent/auth-profiles.json`
- `~/.openclaw/agents/lens/agent/auth-profiles.json`

Content: same as `~/.openclaw/agents/main/agent/auth-profiles.json` (Anthropic API key).

## Part 2: New API Routes

### POST /api/shield/clearance

**Purpose:** Shield agent validates a provider before Edge can trade.

**Request:** `{ agentId: number, action: "trade" | "hire" | "inference" }`

**Logic:**
1. Read IdentityRegistry — does the agentId exist?
2. Read ValidationRegistry — is there a TEE validation pass?
3. Read ReputationRegistry — is quality >= 60, uptime >= 95%?
4. Return `{ cleared: boolean, reason: string, checks: { identity, validation, reputation } }`

**Demo fallback:** If DEMO_MODE or chain unreachable → return `{ cleared: true, reason: "demo-mode", checks: ... }` with mock values.

### POST /api/lens/feedback

**Purpose:** Lens agent submits reputation feedback after observing an interaction.

**Request:** `{ agentId: number, signal: "quality" | "uptime" | "latency" | "successRate", value: number, reason: string }`

**Logic:**
1. Validate signal type and value (0-100)
2. Call `ReputationRegistry.giveFeedback()` via demo wallet
3. Log to Hedera HCS audit topic
4. Return `{ txHash, agentId, signal, value }`

**Demo fallback:** If DEMO_MODE or chain unreachable → return mock success with fake txHash.

## Part 3: Enhance Existing Routes

### /api/seer/inference (enhance)
- After running inference, automatically call `/api/shield/clearance` for the selected provider
- Include shield clearance result in response

### /api/edge/trade (enhance)
- Before placing bet, call Shield clearance internally
- If Shield denies → return 403 with reason
- After successful trade, call `/api/lens/feedback` to record the interaction

## Complete Pipeline (Demonstrable via curl)

```bash
# 1. Seer scans and infers
curl -X POST /api/seer/inference -d '{"prompt":"Analyze GPU pricing"}'
# → { inference: "...", provider: "0xa48f...", shieldClearance: { cleared: true } }

# 2. Shield validates a provider
curl -X POST /api/shield/clearance -d '{"agentId":0,"action":"trade"}'
# → { cleared: true, checks: { identity: true, validation: true, reputation: { quality: 87 } } }

# 3. Edge executes trade (auto-checks Shield)
curl -X POST /api/edge/trade -d '{"marketId":0,"side":"yes","amount":"0.01"}'
# → { txHash: "0x...", shieldCleared: true, lensRecorded: true }

# 4. Lens records feedback
curl -X POST /api/lens/feedback -d '{"agentId":0,"signal":"quality","value":85}'
# → { txHash: "0x...", recorded: true }
```

## Files

| Action | File |
|--------|------|
| Create | `~/.openclaw/agents/{seer,edge,shield,lens}/agent/auth-profiles.json` (4 files) |
| Create | `src/app/api/shield/clearance/route.ts` |
| Create | `src/app/api/lens/feedback/route.ts` |
| Modify | `src/app/api/seer/inference/route.ts` (add Shield clearance) |
| Modify | `src/app/api/edge/trade/route.ts` (add Shield check + Lens recording) |

## Verification
1. `openclaw gateway run` — no API key errors
2. Telegram bot responds to messages
3. `curl /api/shield/clearance` returns clearance result
4. `curl /api/lens/feedback` writes reputation + returns txHash
5. `curl /api/edge/trade` checks Shield before executing
6. All routes work in demo mode when 0G testnet is down
7. `npx next build` passes
