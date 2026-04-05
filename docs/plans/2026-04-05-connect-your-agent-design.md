# Design: Connect Your Agent — Profile Page Overhaul

**Date:** 2026-04-05
**Status:** Approved

## Context

The profile page currently shows 4 hub-operated fleet agents (Seer, Edge, Shield, Lens) with deploy buttons. We're replacing this with a "Connect Your Agent" experience where users generate an API key, paste it into their OpenClaw (or any external agent runtime) config, and their agent can immediately call Vocaid Hub's A2A/MCP services.

**Key constraints:**

- 4 agent slots per user (each user is responsible for their own model/token consumption)
- No database — file-based storage only
- Hub agents (Seer/Edge/Shield/Lens) continue operating in background — just hidden from profile
- Must be demo-friendly: generate key, paste in config, agent starts calling endpoints
- External agents discover services via `/.well-known/agent-card.json` and call A2A/MCP with their API key

## Architecture

### Data Flow

```text
User (Profile Page)
  → Generate API Key (POST /api/api-keys/generate, requires World ID)
  → Copy key into OpenClaw config

OpenClaw Instance (external)
  → GET /.well-known/agent-card.json (discover services, no auth needed)
  → POST /api/agents/seer/a2a { method, params } + X-API-Key header
  → POST /api/agents/edge/mcp { tool, input } + X-API-Key header
  → ... (all 4 agents available as services)
```

### API Key Model

- Format: `voc_` + 32 bytes hex (68 chars total)
- One key per user (regenerating revokes old key)
- Tied to: wallet address + World ID nullifier
- Storage: `data/api-keys.json` (file-based, in-memory cache)
- Validation: `X-API-Key` header on A2A/MCP POST endpoints

### 4 Slots Per User

Each user gets 4 agent slots corresponding to the 4 hub services their external agent can consume:

- **Seer** — Signal analysis, 0G inference
- **Edge** — Trade execution, prediction markets
- **Shield** — TEE validation, risk clearance
- **Lens** — Reputation feedback, agent discovery

The user's external agent (OpenClaw) calls these services using its own model API keys. Vocaid provides the application skills/contracts — the external agent consumes them via A2A and ERC-8004 protocols.

## Wave Strategy

### Wave 1: API Key Backend (Session 1)

New files: `src/lib/api-key-ledger.ts`, `server/schemas/api-keys.ts`, `server/routes/api-keys.ts`, `server/plugins/api-key-auth.ts`
Modified files: `server/index.ts`

### Wave 2: A2A/MCP Auth Gate (Session 1 or 2)

Modified files: `server/routes/agents.ts`, `server/routes/well-known.ts`

### Wave 3: Profile Page Frontend (Session 2)

Modified files: `src/app/(protected)/profile/profile-content.tsx`, `src/app/(protected)/profile/page.tsx`

### Wave 4: End-to-End Integration Test (Session 2 or 3)

Full demo walkthrough verification.
