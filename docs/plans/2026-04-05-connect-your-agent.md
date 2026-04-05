# Connect Your Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fleet deploy section on the profile page with an API key generation flow so users can connect their own OpenClaw agent instance to Vocaid Hub's A2A/MCP services. Users select their preferred chain (0G, Hedera, World) and provide a wallet address + private key (encrypted at rest) so agents can transact on their behalf.

**Architecture:** File-based API key storage (following `payment-ledger.ts` pattern) with encrypted private key field, Fastify plugin for key validation on A2A/MCP POST endpoints, chain selector + wallet config on profile, and World ID badge removed from individual agent cards (verification lives at profile level). 4 agent slots per user — each user manages their own model/token consumption.

**Tech Stack:** Fastify, Zod, Next.js (App Router), Tailwind CSS, lucide-react, file-based JSON storage, Node.js `crypto` (AES-256-GCM for private key encryption)

---

## Wave 1: API Key Backend

### Task 1: API Key Storage Layer

**Files:**
- Create: `src/lib/api-key-ledger.ts`

**Context:** Follow the exact pattern from `src/lib/payment-ledger.ts` — synchronous `fs` reads/writes to `data/api-keys.json`, `ensureDir()` helper, no locking (single-threaded Node.js), in-memory cache for fast validation.

**Step 1: Create `src/lib/api-key-ledger.ts`**

```typescript
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomBytes, createHash } from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');
const KEYS_PATH = join(DATA_DIR, 'api-keys.json');

export type ChainId = '0g' | 'hedera' | 'world';

export interface ApiKeyRecord {
  keyHash: string;          // SHA-256 hash for validation
  maskedKey: string;        // "voc_a1b2...f6" for display
  walletAddress: string;
  worldIdNullifier: string;
  chain: ChainId;           // Selected chain for agent transactions
  agentWallet?: string;     // Wallet address agents use to transact
  encryptedPk?: string;     // AES-256-GCM encrypted private key (encrypted with API key)
  pkIv?: string;            // IV for decryption
  pkTag?: string;           // Auth tag for decryption
  createdAt: string;        // ISO timestamp
  lastUsedAt: string | null;
}

// ── In-memory cache ──────────────────────────────────
let _cache: ApiKeyRecord[] | null = null;

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readKeys(): ApiKeyRecord[] {
  if (_cache) return _cache;
  ensureDir();
  if (!existsSync(KEYS_PATH)) return [];
  try {
    _cache = JSON.parse(readFileSync(KEYS_PATH, 'utf-8'));
    return _cache!;
  } catch {
    return [];
  }
}

function writeKeys(records: ApiKeyRecord[]): void {
  ensureDir();
  writeFileSync(KEYS_PATH, JSON.stringify(records, null, 2));
  _cache = records;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function maskKey(key: string): string {
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

// ── Encryption helpers (AES-256-GCM, key derived from API key) ──

function encryptPrivateKey(plaintext: string, apiKey: string): { encrypted: string; iv: string; tag: string } {
  const keyBuf = createHash('sha256').update(apiKey).digest(); // 32 bytes
  const iv = randomBytes(12);
  const cipher = require('crypto').createCipheriv('aes-256-gcm', keyBuf, iv);
  let enc = cipher.update(plaintext, 'utf-8', 'hex');
  enc += cipher.final('hex');
  return { encrypted: enc, iv: iv.toString('hex'), tag: (cipher as any).getAuthTag().toString('hex') };
}

export function decryptPrivateKey(record: ApiKeyRecord, apiKey: string): string | null {
  if (!record.encryptedPk || !record.pkIv || !record.pkTag) return null;
  try {
    const keyBuf = createHash('sha256').update(apiKey).digest();
    const decipher = require('crypto').createDecipheriv('aes-256-gcm', keyBuf, Buffer.from(record.pkIv, 'hex'));
    (decipher as any).setAuthTag(Buffer.from(record.pkTag, 'hex'));
    let dec = decipher.update(record.encryptedPk, 'hex', 'utf-8');
    dec += decipher.final('utf-8');
    return dec;
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────

interface GenerateParams {
  walletAddress: string;
  worldIdNullifier: string;
  chain: ChainId;
  agentWallet?: string;
  privateKey?: string;       // Plaintext — encrypted before storage
}

/** Generate a new API key. Revokes any existing key for the same wallet. Returns plaintext key (shown once). */
export function generateApiKey(params: GenerateParams): { key: string; maskedKey: string; createdAt: string } {
  const raw = `voc_${randomBytes(32).toString('hex')}`;
  const now = new Date().toISOString();

  let encFields: Pick<ApiKeyRecord, 'encryptedPk' | 'pkIv' | 'pkTag'> = {};
  if (params.privateKey) {
    const { encrypted, iv, tag } = encryptPrivateKey(params.privateKey, raw);
    encFields = { encryptedPk: encrypted, pkIv: iv, pkTag: tag };
  }

  const record: ApiKeyRecord = {
    keyHash: hashKey(raw),
    maskedKey: maskKey(raw),
    walletAddress: params.walletAddress.toLowerCase(),
    worldIdNullifier: params.worldIdNullifier,
    chain: params.chain,
    agentWallet: params.agentWallet,
    ...encFields,
    createdAt: now,
    lastUsedAt: null,
  };

  const keys = readKeys().filter((k) => k.walletAddress !== params.walletAddress.toLowerCase());
  keys.push(record);
  writeKeys(keys);
  return { key: raw, maskedKey: record.maskedKey, createdAt: now };
}

/** Validate an API key. Returns the record if valid, null if invalid. Updates lastUsedAt. */
export function validateApiKey(key: string): ApiKeyRecord | null {
  const hash = hashKey(key);
  const keys = readKeys();
  const record = keys.find((k) => k.keyHash === hash);
  if (!record) return null;
  record.lastUsedAt = new Date().toISOString();
  writeKeys(keys);
  return record;
}

/** Get key metadata for a wallet (no plaintext key). */
export function getKeyForWallet(walletAddress: string): ApiKeyRecord | null {
  return readKeys().find((k) => k.walletAddress === walletAddress.toLowerCase()) ?? null;
}

/** Revoke a key by wallet. */
export function revokeKeyForWallet(walletAddress: string): boolean {
  const keys = readKeys();
  const filtered = keys.filter((k) => k.walletAddress !== walletAddress.toLowerCase());
  if (filtered.length === keys.length) return false;
  writeKeys(filtered);
  return true;
}
```

**Step 2: Verify file creates correctly**

Run: `npx tsx -e "import { generateApiKey } from './src/lib/api-key-ledger'; console.log(generateApiKey('0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE', 'test-nullifier'))"`

Expected: JSON output with `key` starting with `voc_`, `maskedKey`, `createdAt`. File `data/api-keys.json` should exist.

**Step 3: Commit**

```bash
git add src/lib/api-key-ledger.ts
git commit -m "feat: add API key storage layer (file-based ledger)"
```

---

### Task 2: API Key Validation Plugin

**Files:**
- Create: `server/plugins/api-key-auth.ts`
- Modify: `server/index.ts:44-48` (add plugin registration)

**Context:** Follow the exact pattern from `server/plugins/world-id-gate.ts` — `fp()` wrapper, `app.decorateRequest()`, `app.decorate()` for the preHandler. Depends on nothing (API key is self-contained auth).

**Step 1: Create `server/plugins/api-key-auth.ts`**

```typescript
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    apiKeyUser?: { walletAddress: string; worldIdNullifier: string };
  }
  interface FastifyInstance {
    requireApiKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function apiKeyAuthPlugin(app: FastifyInstance) {
  app.decorateRequest('apiKeyUser', undefined);

  app.decorate('requireApiKey', async (request: FastifyRequest, reply: FastifyReply) => {
    const key =
      (request.headers['x-api-key'] as string) ??
      (request.body as Record<string, unknown> | null)?.apiKey as string | undefined;

    if (!key || typeof key !== 'string') {
      reply.code(401).send({ error: 'API key required. Generate one at /profile.' });
      return;
    }

    const { validateApiKey } = await import('@/lib/api-key-ledger');
    const record = validateApiKey(key);

    if (!record) {
      reply.code(401).send({ error: 'Invalid API key' });
      return;
    }

    request.apiKeyUser = {
      walletAddress: record.walletAddress,
      worldIdNullifier: record.worldIdNullifier,
    };
  });
}

export default fp(apiKeyAuthPlugin, {
  name: 'api-key-auth',
});
```

**Step 2: Register plugin in `server/index.ts`**

Add after line 44 (`worldIdGatePlugin`):

```typescript
import apiKeyAuthPlugin from './plugins/api-key-auth.js';
```
(Add to imports near line 35)

```typescript
await app.register(apiKeyAuthPlugin);
```
(Add after line 44, before `rateLimitPlugin`)

Also add `'api-key-auth'` to the health check plugins array at line 56.

**Step 3: Commit**

```bash
git add server/plugins/api-key-auth.ts server/index.ts
git commit -m "feat: add API key validation plugin (requireApiKey preHandler)"
```

---

### Task 3: API Key Management Routes

**Files:**
- Create: `server/schemas/api-keys.ts`
- Create: `server/routes/api-keys.ts`
- Modify: `server/index.ts` (register routes)

**Context:** Three endpoints behind `app.requireWorldId`: generate, status, revoke. Follow existing route patterns from `server/routes/gpu.ts`.

**Step 1: Create schema `server/schemas/api-keys.ts`**

```typescript
import { z } from 'zod';
import { AddressSchema } from './common.js';

const ChainSchema = z.enum(['0g', 'hedera', 'world']);

/** POST /api/api-keys/generate */
export const GenerateKeySchema = z.object({
  walletAddress: AddressSchema,
  chain: ChainSchema,
  agentWallet: AddressSchema.optional(),
  privateKey: z.string().min(1).optional(),  // Plaintext — encrypted before storage
});
```

**Step 2: Create routes `server/routes/api-keys.ts`**

```typescript
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { GenerateKeySchema } from '../schemas/api-keys.js';

export default async function apiKeyRoutes(app: FastifyInstance) {
  const f = app.withTypeProvider<ZodTypeProvider>();

  // POST /api/api-keys/generate — Generate (or regenerate) an API key
  f.post(
    '/api-keys/generate',
    {
      schema: { body: GenerateKeySchema },
      preHandler: [app.requireWorldId],
    },
    async (request, reply) => {
      const { walletAddress } = request.body;

      // User can only generate keys for their own wallet
      if (request.verifiedAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
        return reply.code(403).send({ error: 'Can only generate keys for your own wallet' });
      }

      const { chain, agentWallet, privateKey } = request.body;
      const { generateApiKey } = await import('@/lib/api-key-ledger');
      const result = generateApiKey({
        walletAddress,
        worldIdNullifier: request.verifiedAddress!,
        chain,
        agentWallet,
        privateKey,
      });

      return {
        key: result.key,
        maskedKey: result.maskedKey,
        createdAt: result.createdAt,
      };
    },
  );

  // GET /api/api-keys/status — Check if user has an active key
  f.get(
    '/api-keys/status',
    { preHandler: [app.requireWorldId] },
    async (request) => {
      const { getKeyForWallet } = await import('@/lib/api-key-ledger');
      const record = getKeyForWallet(request.verifiedAddress!);

      if (!record) return { hasKey: false };

      return {
        hasKey: true,
        maskedKey: record.maskedKey,
        chain: record.chain,
        agentWallet: record.agentWallet ?? null,
        hasPrivateKey: !!record.encryptedPk,
        createdAt: record.createdAt,
        lastUsedAt: record.lastUsedAt,
      };
    },
  );

  // DELETE /api/api-keys/revoke — Revoke the current key
  f.delete(
    '/api-keys/revoke',
    { preHandler: [app.requireWorldId] },
    async (request) => {
      const { revokeKeyForWallet } = await import('@/lib/api-key-ledger');
      const revoked = revokeKeyForWallet(request.verifiedAddress!);
      return { revoked };
    },
  );
}
```

**Step 3: Register routes in `server/index.ts`**

Add import near the Wave 3C block (around line 80):

```typescript
import apiKeyRoutes from './routes/api-keys.js';
```

Add registration after line 89 (`agentRoutes`):

```typescript
await app.register(apiKeyRoutes, { prefix: '/api' });
```

**Step 4: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

**Step 5: Commit**

```bash
git add server/schemas/api-keys.ts server/routes/api-keys.ts server/index.ts
git commit -m "feat: add API key management routes (generate/status/revoke)"
```

---

### Wave 1 Audit

**Test 1: Generate a key**

```bash
# First get a session cookie (sign in via the app), then:
curl -X POST https://vocaid-api.ngrok.dev/api/api-keys/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<TOKEN>" \
  -d '{"walletAddress":"0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE"}'
```

Expected: `{ "key": "voc_...", "maskedKey": "voc_a1b2...f6", "createdAt": "..." }`

**Test 2: Check status**

```bash
curl https://vocaid-api.ngrok.dev/api/api-keys/status \
  -H "Cookie: next-auth.session-token=<TOKEN>"
```

Expected: `{ "hasKey": true, "maskedKey": "voc_a1b2...f6", "createdAt": "...", "lastUsedAt": null }`

**Test 3: Verify file**

```bash
cat data/api-keys.json
```

Expected: JSON array with one record (keyHash, maskedKey, walletAddress, etc.)

**Test 4: Regenerate (revokes old)**

Run generate again. Verify `data/api-keys.json` still has exactly 1 record (old replaced).

**Test 5: Revoke**

```bash
curl -X DELETE https://vocaid-api.ngrok.dev/api/api-keys/revoke \
  -H "Cookie: next-auth.session-token=<TOKEN>"
```

Expected: `{ "revoked": true }`. Status check should now return `{ "hasKey": false }`.

---

## Wave 2: A2A/MCP Auth Gate

### Task 4: Gate A2A/MCP Execution Endpoints

**Files:**
- Modify: `server/routes/agents.ts:148-169` (A2A POST) and `server/routes/agents.ts:180-208` (MCP POST)

**Context:** Add `preHandler: [app.requireApiKey]` to the two POST handlers. GET handlers (capability cards, tool schemas) remain open — they're discovery endpoints. Also update the rate limit key to use wallet address instead of IP when authenticated.

**Step 1: Add preHandler to A2A POST (line 148)**

Change:

```typescript
  typed.post('/agents/:name/a2a', {
    schema: { params: AgentNameParamsSchema, body: A2ATaskSchema },
  }, async (request, reply) => {
```

To:

```typescript
  typed.post('/agents/:name/a2a', {
    schema: { params: AgentNameParamsSchema, body: A2ATaskSchema },
    preHandler: [app.requireApiKey],
  }, async (request, reply) => {
```

**Step 2: Update rate limit key in A2A POST (line 152)**

Change:

```typescript
    const ip = request.headers['x-forwarded-for'] as string ?? request.headers['x-real-ip'] as string ?? 'unknown';
    if (!checkRateLimit(name, ip)) {
```

To:

```typescript
    const rateLimitKey = request.apiKeyUser?.walletAddress ?? request.headers['x-forwarded-for'] as string ?? 'unknown';
    if (!checkRateLimit(name, rateLimitKey)) {
```

**Step 3: Add preHandler to MCP POST (line 181)**

Change:

```typescript
  typed.post('/agents/:name/mcp', {
    schema: { params: AgentNameParamsSchema, body: McpToolCallSchema },
  }, async (request, reply) => {
```

To:

```typescript
  typed.post('/agents/:name/mcp', {
    schema: { params: AgentNameParamsSchema, body: McpToolCallSchema },
    preHandler: [app.requireApiKey],
  }, async (request, reply) => {
```

**Step 4: Update rate limit key in MCP POST (line 185)**

Same change as Step 2:

```typescript
    const rateLimitKey = request.apiKeyUser?.walletAddress ?? request.headers['x-forwarded-for'] as string ?? 'unknown';
    if (!checkRateLimit(name, rateLimitKey)) {
```

**Step 5: Commit**

```bash
git add server/routes/agents.ts
git commit -m "feat: gate A2A/MCP POST endpoints with API key auth"
```

---

### Task 5: Update Discovery Endpoint

**Files:**
- Modify: `server/routes/well-known.ts:19-31`

**Step 1: Add `authentication` field to the card object (after line 29)**

Change the card object to include:

```typescript
      const card = {
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name: 'Vocaid Hub',
        description:
          'Reliable Resources for the Agentic Economy — 4 AI agents backed by World ID-verified human operators, registered on 0G Chain via ERC-8004.',
        version: '1.0.0',
        operator: {
          worldAppId: process.env.NEXT_PUBLIC_WORLD_APP_ID || 'app_74d7b06d88b9e220ad1cc06e387c55f3',
          identityRegistry: process.env.IDENTITY_REGISTRY || null,
          chain: '0g-galileo-testnet',
        },
        authentication: {
          type: 'api-key',
          header: 'X-API-Key',
          description: 'Generate an API key at /profile after World ID verification',
          keyPrefix: 'voc_',
        },
        agents,
      };
```

**Step 2: Commit**

```bash
git add server/routes/well-known.ts
git commit -m "feat: add authentication metadata to discovery endpoint"
```

---

### Wave 2 Audit

**Test 1: A2A without key → 401**

```bash
curl -X POST https://vocaid-api.ngrok.dev/api/agents/seer/a2a \
  -H "Content-Type: application/json" \
  -d '{"method":"getProviders"}'
```

Expected: `401 { "error": "API key required. Generate one at /profile." }`

**Test 2: A2A with valid key → success**

```bash
curl -X POST https://vocaid-api.ngrok.dev/api/agents/seer/a2a \
  -H "Content-Type: application/json" \
  -H "X-API-Key: voc_<YOUR_KEY>" \
  -d '{"method":"getProviders"}'
```

Expected: 200 with providers list (or demo fallback)

**Test 3: A2A with invalid key → 401**

```bash
curl -X POST https://vocaid-api.ngrok.dev/api/agents/seer/a2a \
  -H "Content-Type: application/json" \
  -H "X-API-Key: voc_invalid" \
  -d '{"method":"getProviders"}'
```

Expected: `401 { "error": "Invalid API key" }`

**Test 4: MCP with key → success**

```bash
curl -X POST https://vocaid-api.ngrok.dev/api/agents/seer/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: voc_<YOUR_KEY>" \
  -d '{"tool":"list_providers","input":{}}'
```

Expected: 200 with tool output

**Test 5: Discovery shows auth metadata**

```bash
curl https://vocaid-api.ngrok.dev/.well-known/agent-card.json | jq .authentication
```

Expected: `{ "type": "api-key", "header": "X-API-Key", "description": "...", "keyPrefix": "voc_" }`

**Test 6: GET endpoints remain open (no key needed)**

```bash
curl https://vocaid-api.ngrok.dev/api/agents/seer/a2a
curl https://vocaid-api.ngrok.dev/api/agents/seer/mcp
```

Expected: 200 with capability cards / tool schemas (no auth error)

---

## Wave 3: Profile Page Frontend

### Task 6: Redesign Profile Page (Server Component)

**Files:**
- Modify: `src/app/(protected)/profile/page.tsx` (replace entirely)

**Step 1: Simplify `page.tsx` — remove fleet agents, remove `AgentData`**

```typescript
import { auth } from '@/auth';
import { Page } from '@/components/PageLayout';
import { ProfileContent } from './profile-content';

export const metadata = {
  title: 'Profile — Vocaid Hub',
};

export default async function ProfilePage() {
  const session = await auth();

  return (
    <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4 pt-2">
      <ProfileContent
        username={session?.user.username ?? 'Anonymous'}
        walletAddress={session?.user.walletAddress}
      />
    </Page.Main>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(protected)/profile/page.tsx
git commit -m "refactor: simplify profile page server component (remove fleet agents)"
```

---

### Task 7: Replace DeployFleetSection with ConnectAgentSection

**Files:**
- Modify: `src/app/(protected)/profile/profile-content.tsx` (replace entirely)

**Context:** Remove all fleet-related code (`DeployFleetSection`, `FLEET_AGENTS`, `ROLE_NAMES`, `AgentCard` import). Add `ConnectAgentSection` with API key generation, copy, and setup instructions. Keep the identity card and marketplace link. Keep `WorldIdGateModal` + `useWorldIdGate` for gating key generation.

**Step 1: Rewrite `profile-content.tsx`**

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, Key, Copy, Check, RefreshCw, ArrowRight, Eye, TrendingUp, Shield, Bot, Wallet,
} from 'lucide-react';
import { ChainBadge } from '@/components/ChainBadge';
import { WorldIdGateModal } from '@/components/WorldIdGateModal';
import { useWorldIdGate } from '@/hooks/useWorldIdGate';
import Link from 'next/link';

interface ProfileContentProps {
  username: string;
  walletAddress?: string;
}

function truncateAddress(addr?: string): string {
  if (!addr) return '\u2014';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const HUB_SERVICES = [
  { icon: Eye, name: 'Seer', desc: 'Signal analysis & 0G inference' },
  { icon: TrendingUp, name: 'Edge', desc: 'Trade execution & prediction markets' },
  { icon: Shield, name: 'Shield', desc: 'TEE validation & risk clearance' },
  { icon: Bot, name: 'Lens', desc: 'Reputation feedback & agent discovery' },
];

export function ProfileContent({ username, walletAddress }: ProfileContentProps) {
  return (
    <>
      {/* Identity card */}
      <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-accent/5">
            <ChainBadge chain="world" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary capitalize">{username}</p>
            <p className="text-xs font-mono text-secondary">{truncateAddress(walletAddress)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-status-verified/10 text-status-verified">
            <ShieldCheck className="w-3.5 h-3.5" />
            World ID Verified
          </span>
          <span className="text-xs text-secondary">ERC-8004 ID: #1</span>
        </div>
      </div>

      {/* Connect Your Agent */}
      <ConnectAgentSection walletAddress={walletAddress} />

      {/* Link to Resources page */}
      <Link
        href="/gpu-verify"
        className="flex items-center justify-between rounded-xl border border-dashed border-border-card p-4 hover:border-primary-accent/50 transition-colors cursor-pointer"
      >
        <div>
          <p className="text-sm font-medium text-primary">Register resources for the marketplace</p>
          <p className="text-xs text-secondary mt-0.5">GPUs, agents, skills, and DePIN devices available for hire</p>
        </div>
        <ArrowRight className="w-4 h-4 text-secondary shrink-0" />
      </Link>
    </>
  );
}

/* ─── Connect Agent Section ───────────────────────────── */

type KeyState = 'loading' | 'none' | 'exists' | 'generated';
type ChainId = '0g' | 'hedera' | 'world';

const CHAINS: { id: ChainId; label: string; color: string }[] = [
  { id: '0g', label: '0G Galileo', color: 'text-chain-og' },
  { id: 'hedera', label: 'Hedera', color: 'text-chain-hedera' },
  { id: 'world', label: 'World Chain', color: 'text-chain-world' },
];

function ConnectAgentSection({ walletAddress }: { walletAddress?: string }) {
  const [keyState, setKeyState] = useState<KeyState>('loading');
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [chain, setChain] = useState<ChainId>('0g');
  const [agentWallet, setAgentWallet] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPk, setShowPk] = useState(false);
  const { isVerified, recheckStatus } = useWorldIdGate();
  const [showGateModal, setShowGateModal] = useState(false);

  // Check existing key on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/api-keys/status');
        if (!res.ok) { setKeyState('none'); return; }
        const data = await res.json();
        if (data.hasKey) {
          setMaskedKey(data.maskedKey);
          if (data.chain) setChain(data.chain);
          if (data.agentWallet) setAgentWallet(data.agentWallet);
          setKeyState('exists');
        } else {
          setKeyState('none');
        }
      } catch {
        setKeyState('none');
      }
    }
    checkStatus();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!isVerified) {
      setShowGateModal(true);
      return;
    }
    if (!walletAddress) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/api-keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          chain,
          ...(agentWallet ? { agentWallet } : {}),
          ...(privateKey ? { privateKey } : {}),
        }),
      });
      if (!res.ok) { setGenerating(false); return; }
      const data = await res.json();
      setFullKey(data.key);
      setMaskedKey(data.maskedKey);
      setPrivateKey(''); // Clear from memory
      setKeyState('generated');
    } catch { /* ignore */ }
    setGenerating(false);
  }, [isVerified, walletAddress, chain, agentWallet, privateKey]);

  const handleCopy = useCallback(() => {
    if (!fullKey) return;
    navigator.clipboard.writeText(fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [fullKey]);

  return (
    <>
      <div className="rounded-xl border border-border-card bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-primary-accent" />
          <h2 className="text-base font-semibold text-primary">Connect Your Agent</h2>
        </div>
        <p className="text-xs text-secondary mb-4">
          Use your API key to connect any external agent runtime (OpenClaw, etc.) to Vocaid Hub services via A2A and MCP protocols.
        </p>

        {/* Chain Selector */}
        {(keyState === 'none' || keyState === 'loading') && (
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-primary mb-1.5 block">Chain</label>
              <div className="flex gap-1.5">
                {CHAINS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChain(c.id)}
                    className={`flex-1 min-h-11 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      chain === c.id
                        ? 'bg-primary-accent text-white'
                        : 'bg-surface border border-border-card text-secondary'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-primary mb-1.5 block">
                <Wallet className="w-3 h-3 inline mr-1" />Agent Wallet Address
              </label>
              <input
                type="text"
                placeholder="0x... (wallet agents will use to transact)"
                value={agentWallet}
                onChange={(e) => setAgentWallet(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-border-card bg-surface px-4 text-sm font-mono placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-primary mb-1.5 block">
                <Key className="w-3 h-3 inline mr-1" />Private Key (encrypted at rest)
              </label>
              <div className="relative">
                <input
                  type={showPk ? 'text' : 'password'}
                  placeholder="Paste private key (encrypted before storage)"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="w-full min-h-11 rounded-lg border border-border-card bg-surface px-4 pr-10 text-sm font-mono placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
                />
                <button
                  onClick={() => setShowPk((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-secondary" />
                </button>
              </div>
              <p className="text-[10px] text-secondary mt-1">Encrypted with your API key using AES-256-GCM. Never stored in plaintext.</p>
            </div>
          </div>
        )}

        {/* Key Display / Generate */}
        {keyState === 'loading' && (
          <div className="h-11 rounded-lg bg-surface animate-pulse" />
        )}

        {keyState === 'none' && (
          <button
            onClick={handleGenerate}
            disabled={generating || !agentWallet}
            className="w-full min-h-11 rounded-lg bg-primary-accent text-white text-sm font-semibold transition-colors hover:bg-primary-accent/90 cursor-pointer disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate API Key'}
          </button>
        )}

        {(keyState === 'exists' || keyState === 'generated') && (
          <div className="flex flex-col gap-3">
            {/* Key field */}
            <div className="flex items-center gap-2 rounded-lg bg-surface border border-border-card px-4 py-2.5">
              <code className="flex-1 font-mono text-xs text-primary truncate">
                {fullKey ?? maskedKey}
              </code>
              {fullKey && (
                <button onClick={handleCopy} className="shrink-0 cursor-pointer" title="Copy">
                  {copied ? (
                    <Check className="w-4 h-4 text-status-verified" />
                  ) : (
                    <Copy className="w-4 h-4 text-secondary hover:text-primary transition-colors" />
                  )}
                </button>
              )}
              <button onClick={handleGenerate} disabled={generating} className="shrink-0 cursor-pointer" title="Regenerate">
                <RefreshCw className={`w-4 h-4 text-secondary hover:text-primary transition-colors ${generating ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {fullKey && (
              <p className="text-[10px] text-amber-600 bg-amber-50 rounded-md px-3 py-1.5">
                Copy this key now — it won't be shown again. If you lose it, regenerate a new one.
              </p>
            )}
          </div>
        )}

        {/* Setup Instructions */}
        {(keyState === 'exists' || keyState === 'generated') && (
          <div className="mt-4 pt-4 border-t border-border-card">
            <p className="text-xs font-medium text-primary mb-2">Quick Setup</p>
            <ol className="flex flex-col gap-1.5 text-xs text-secondary list-decimal list-inside">
              <li>Copy your API key above</li>
              <li>Set the <code className="font-mono text-[10px] bg-surface px-1 py-0.5 rounded">X-API-Key</code> header in your agent config</li>
              <li>Discover services at <code className="font-mono text-[10px] bg-surface px-1 py-0.5 rounded">/.well-known/agent-card.json</code></li>
              <li>Call A2A or MCP endpoints with your key</li>
            </ol>
          </div>
        )}

        {/* Available Services */}
        <div className="mt-4 pt-4 border-t border-border-card">
          <p className="text-xs font-medium text-primary mb-2">Available Services (4 slots)</p>
          <div className="grid grid-cols-2 gap-2">
            {HUB_SERVICES.map(({ icon: Icon, name, desc }) => (
              <div key={name} className="flex items-start gap-2 rounded-lg bg-surface p-2.5">
                <Icon className="w-3.5 h-3.5 text-primary-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-primary">{name}</p>
                  <p className="text-[10px] text-secondary leading-tight">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WorldIdGateModal
        open={showGateModal}
        onClose={() => { setShowGateModal(false); recheckStatus(); }}
        onVerified={async () => {
          setShowGateModal(false);
          await recheckStatus();
          handleGenerate();
        }}
      />
    </>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No TypeScript errors. Profile page builds successfully.

**Step 3: Commit**

```bash
git add src/app/(protected)/profile/profile-content.tsx
git commit -m "feat: replace fleet deploy with Connect Your Agent section"
```

---

---

### Task 8: Remove World ID Badge from AgentCard

**Files:**
- Modify: `src/components/AgentCard.tsx`

**Context:** With the architecture shift, World ID verification lives at the user/profile level, not per-agent. The `verified` prop and `operatorWorldId` display on individual agent cards no longer make sense.

**Step 1: Remove `verified` prop and `operatorWorldId` from AgentCardProps**

In `src/components/AgentCard.tsx`, remove:
- `operatorWorldId` from the props interface
- `verified` from the props interface
- The World ID verified badge rendering (the `ShieldCheck` + "World ID" section)
- The `operatorWorldId` truncated display

Keep: `name`, `role`, `agentId`, `reputation`, `onSelect` — these are still used on the marketplace/resources pages.

**Step 2: Update all AgentCard usages**

Search for `<AgentCard` across the codebase and remove `operatorWorldId` and `verified` props from all call sites. The profile page call sites will be removed entirely in Task 7, but check if AgentCard is used on other pages (marketplace, resources).

**Step 3: Commit**

```bash
git add src/components/AgentCard.tsx
git commit -m "refactor: remove World ID badge from AgentCard (verification at profile level)"
```

---

### Wave 3 Audit

**Test 1: Profile page loads**
Navigate to `/profile`. Should show identity card + "Connect Your Agent" section + marketplace link. No fleet agents visible.

**Test 2: Generate key (World ID verified)**
Click "Generate API Key". Should show the full key with copy button + warning message.

**Test 3: Copy key**
Click copy button. Paste somewhere — should be the full `voc_...` key.

**Test 4: Page reload shows masked key**
Refresh the page. Should show masked key (`voc_a1b2...f6`) with regenerate button but no copy button (full key gone).

**Test 5: Regenerate key**
Click regenerate (RefreshCw icon). Should show new full key. Old key should stop working.

**Test 6: World ID gate**
If not verified: clicking "Generate API Key" should show World ID modal.

---

## Wave 4: End-to-End Integration Test

### Task 9: Full Demo Flow Verification

**No code changes — audit only.**

**Test 1: Fresh user flow**
1. Sign in via World App
2. Navigate to `/profile`
3. Verify World ID (if not already)
4. Click "Generate API Key"
5. Copy the key

**Test 2: External agent flow**

```bash
# 1. Discover services
curl https://vocaid-api.ngrok.dev/.well-known/agent-card.json

# 2. Call Seer (inference)
curl -X POST https://vocaid-api.ngrok.dev/api/agents/seer/a2a \
  -H "Content-Type: application/json" \
  -H "X-API-Key: voc_<COPIED_KEY>" \
  -d '{"method":"getProviders"}'

# 3. Call Shield (validation)
curl -X POST https://vocaid-api.ngrok.dev/api/agents/shield/a2a \
  -H "Content-Type: application/json" \
  -H "X-API-Key: voc_<COPIED_KEY>" \
  -d '{"method":"requestClearance","params":{"agentId":"27","tag":"gpu-tee-attestation"}}'

# 4. Call Lens (reputation)
curl -X POST https://vocaid-api.ngrok.dev/api/agents/lens/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: voc_<COPIED_KEY>" \
  -d '{"tool":"get_reputation_scores","input":{"agentId":"27"}}'

# 5. Call Edge (market data)
curl -X POST https://vocaid-api.ngrok.dev/api/agents/edge/a2a \
  -H "Content-Type: application/json" \
  -H "X-API-Key: voc_<COPIED_KEY>" \
  -d '{"method":"getMarket","params":{"marketId":0}}'
```

Expected: All 4 services respond with data (or demo fallback with `_demo: true`).

**Test 3: Revoked key stops working**

```bash
# Revoke via UI (regenerate) or API
curl -X DELETE https://vocaid-api.ngrok.dev/api/api-keys/revoke \
  -H "Cookie: next-auth.session-token=<TOKEN>"

# Try old key
curl -X POST https://vocaid-api.ngrok.dev/api/agents/seer/a2a \
  -H "Content-Type: application/json" \
  -H "X-API-Key: voc_<OLD_KEY>" \
  -d '{"method":"getProviders"}'
```

Expected: `401 { "error": "Invalid API key" }`

**Test 4: Build passes**

Run: `npm run build`
Expected: Clean build, no errors.
