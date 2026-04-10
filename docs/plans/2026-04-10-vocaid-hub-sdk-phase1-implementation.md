# Vocaid Hub SDK — Phase 1: SDK Core Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold `@vocaid/hub-sdk` with HubClient, types, and three core modules (A2A, Identity, Vocaid) — following the exact patterns from `@vocaid/connect`.

**Architecture:** Monorepo package at `vocaid-hub/packages/hub-sdk/`. HubClient aggregates modules the same way VocaidClient aggregates resources. Each module is a class receiving shared config. Zero unnecessary dependencies — only `@vocaid/connect`, `ethers`, and `@hashgraph/sdk`.

**Tech Stack:** TypeScript 5.5+, tsup (ESM build), vitest (tests), Node 18+ (native fetch)

**Design doc:** `docs/plans/2026-04-10-vocaid-hub-hedera-gateway-design.md`

**Pattern source:** `sdks/vocaid-connect-ts/` — replicate its client, transport, error, and test patterns exactly.

---

## Task 1: Package Scaffold

**Files:**
- Create: `vocaid-hub/packages/hub-sdk/package.json`
- Create: `vocaid-hub/packages/hub-sdk/tsconfig.json`
- Create: `vocaid-hub/packages/hub-sdk/tsup.config.ts`
- Create: `vocaid-hub/packages/hub-sdk/vitest.config.ts`
- Create: `vocaid-hub/packages/hub-sdk/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@vocaid/hub-sdk",
  "version": "0.1.0",
  "description": "Framework-agnostic SDK for the Vocaid Hub — A2A, ERC-8004, x402, Hedera",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./agents": {
      "import": "./dist/agents/index.js",
      "types": "./dist/agents/index.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@vocaid/connect": "^0.1.0",
    "ethers": "^6.13.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

> Note: `@hashgraph/sdk` is NOT added in Phase 1. It ships in Phase 2 (Hedera module). Keep deps minimal.

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/agents/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: false,
  target: "es2022",
});
```

**Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
```

**Step 5: Create stub src/index.ts**

```typescript
export const VERSION = "0.1.0";
```

**Step 6: Create stub src/agents/index.ts**

```typescript
export {};
```

**Step 7: Install dependencies and verify build**

Run: `cd vocaid-hub/packages/hub-sdk && npm install`

Run: `npm run build`
Expected: Build succeeds, `dist/index.js` and `dist/index.d.ts` created.

Run: `npm run typecheck`
Expected: No errors.

**Step 8: Commit**

```bash
git add vocaid-hub/packages/hub-sdk/
git commit -m "feat(hub-sdk): scaffold package with tsup, vitest, typescript"
```

---

## Task 2: Types — Core Config & Chain Types

**Files:**
- Create: `vocaid-hub/packages/hub-sdk/src/types/config.ts`
- Create: `vocaid-hub/packages/hub-sdk/src/types/chains.ts`
- Create: `vocaid-hub/packages/hub-sdk/src/types/index.ts`
- Test: `vocaid-hub/packages/hub-sdk/src/types/__tests__/config.test.ts`

**Step 1: Write the failing test**

```typescript
// src/types/__tests__/config.test.ts
import { describe, expect, it } from "vitest";
import type { HubClientOptions, ChainConfig, SupportedChain } from "../index.js";

describe("HubClientOptions type", () => {
  it("accepts valid options", () => {
    const options: HubClientOptions = {
      vocaidApiKey: "voc_test123",
      chains: {
        hedera: { operatorId: "0.0.123", operatorKey: "302e..." },
      },
    };
    expect(options.vocaidApiKey).toBe("voc_test123");
    expect(options.chains.hedera).toBeDefined();
  });

  it("supports multiple chains", () => {
    const options: HubClientOptions = {
      vocaidApiKey: "voc_test123",
      chains: {
        base: { rpcUrl: "https://base-sepolia.example.com", privateKey: "0x..." },
        arbitrum: { rpcUrl: "https://arb-sepolia.example.com", privateKey: "0x..." },
      },
    };
    expect(Object.keys(options.chains)).toHaveLength(2);
  });

  it("accepts optional hubUrl override", () => {
    const options: HubClientOptions = {
      vocaidApiKey: "voc_test123",
      chains: {},
      hubUrl: "https://custom-hub.example.com",
    };
    expect(options.hubUrl).toBe("https://custom-hub.example.com");
  });
});

describe("SupportedChain type", () => {
  it("includes all expected chains", () => {
    const chains: SupportedChain[] = [
      "hedera", "base", "arbitrum", "optimism", "ethereum", "polygon",
    ];
    expect(chains).toHaveLength(6);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd vocaid-hub/packages/hub-sdk && npx vitest run src/types/__tests__/config.test.ts`
Expected: FAIL — cannot import from `../index.js`

**Step 3: Write the types**

```typescript
// src/types/chains.ts
export type SupportedChain =
  | "hedera"
  | "base"
  | "arbitrum"
  | "optimism"
  | "ethereum"
  | "polygon";

export interface HederaChainConfig {
  operatorId: string;
  operatorKey: string;
  network?: "testnet" | "mainnet";
  mirrorNodeUrl?: string;
}

export interface EvmChainConfig {
  rpcUrl: string;
  privateKey: string;
  chainId?: number;
}

export type ChainConfig = HederaChainConfig | EvmChainConfig;

export type ChainMap = Partial<Record<SupportedChain, ChainConfig>>;
```

```typescript
// src/types/config.ts
import type { ChainMap } from "./chains.js";

export interface HubClientOptions {
  vocaidApiKey: string;
  chains: ChainMap;
  hubUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
```

```typescript
// src/types/index.ts
export type { HubClientOptions } from "./config.js";
export type {
  SupportedChain,
  HederaChainConfig,
  EvmChainConfig,
  ChainConfig,
  ChainMap,
} from "./chains.js";
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/config.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add vocaid-hub/packages/hub-sdk/src/types/
git commit -m "feat(hub-sdk): add core config and chain types"
```

---

## Task 3: Types — A2A Agent Card

**Files:**
- Create: `vocaid-hub/packages/hub-sdk/src/types/agent-card.ts`
- Update: `vocaid-hub/packages/hub-sdk/src/types/index.ts`
- Test: `vocaid-hub/packages/hub-sdk/src/types/__tests__/agent-card.test.ts`

**Step 1: Write the failing test**

```typescript
// src/types/__tests__/agent-card.test.ts
import { describe, expect, it } from "vitest";
import type { AgentCard, AgentCapability, AgentSkill } from "../index.js";

describe("AgentCard type", () => {
  it("models a valid A2A Agent Card per spec", () => {
    const card: AgentCard = {
      name: "vocaid-hub",
      description: "Vocaid Hub — hiring signal gateway and trading desk",
      url: "https://vocaid-hub.vercel.app",
      version: "0.1.0",
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      skills: [
        {
          id: "hiring-signals",
          name: "Hiring Signals",
          description: "Get BULLISH/NEUTRAL/BEARISH hiring market signals by domain",
          inputModes: ["application/json"],
          outputModes: ["application/json"],
        },
      ],
      defaultInputModes: ["application/json"],
      defaultOutputModes: ["application/json"],
    };

    expect(card.name).toBe("vocaid-hub");
    expect(card.skills).toHaveLength(1);
    expect(card.skills[0].id).toBe("hiring-signals");
  });

  it("supports authentication field", () => {
    const card: AgentCard = {
      name: "test-agent",
      description: "Test",
      url: "https://example.com",
      version: "1.0.0",
      capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
      skills: [],
      defaultInputModes: ["application/json"],
      defaultOutputModes: ["application/json"],
      authentication: {
        schemes: ["bearer"],
        credentials: "erc8004",
      },
    };
    expect(card.authentication?.schemes).toContain("bearer");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/agent-card.test.ts`
Expected: FAIL — AgentCard not exported

**Step 3: Write the A2A types**

```typescript
// src/types/agent-card.ts

/**
 * A2A Agent Card — per Google's Agent-to-Agent protocol spec.
 * @see https://a2a-protocol.org/latest/specification/#agent-card
 */
export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: AgentCapability;
  skills: AgentSkill[];
  defaultInputModes: string[];
  defaultOutputModes: string[];
  authentication?: AgentAuthentication;
  documentationUrl?: string;
  provider?: AgentProvider;
}

export interface AgentCapability {
  streaming: boolean;
  pushNotifications: boolean;
  stateTransitionHistory: boolean;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  inputModes: string[];
  outputModes: string[];
  tags?: string[];
}

export interface AgentAuthentication {
  schemes: string[];
  credentials?: string;
}

export interface AgentProvider {
  organization: string;
  url?: string;
}
```

**Step 4: Update types/index.ts**

Add to `src/types/index.ts`:

```typescript
export type {
  AgentCard,
  AgentCapability,
  AgentSkill,
  AgentAuthentication,
  AgentProvider,
} from "./agent-card.js";
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/agent-card.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add vocaid-hub/packages/hub-sdk/src/types/
git commit -m "feat(hub-sdk): add A2A Agent Card types per spec"
```

---

## Task 4: Types — Hiring Signals

**Files:**
- Create: `vocaid-hub/packages/hub-sdk/src/types/signals.ts`
- Update: `vocaid-hub/packages/hub-sdk/src/types/index.ts`
- Test: `vocaid-hub/packages/hub-sdk/src/types/__tests__/signals.test.ts`

**Step 1: Write the failing test**

```typescript
// src/types/__tests__/signals.test.ts
import { describe, expect, it } from "vitest";
import type { HiringSignal, SignalDomain, SignalInterpretation } from "../index.js";
import { VALID_DOMAINS, SIGNAL_WEIGHTS } from "../signals.js";

describe("Signal types", () => {
  it("has 7 valid domains", () => {
    expect(VALID_DOMAINS).toHaveLength(7);
    expect(VALID_DOMAINS).toContain("ai_engineer");
    expect(VALID_DOMAINS).toContain("backend");
  });

  it("weights sum to 1.0", () => {
    const sum = SIGNAL_WEIGHTS.demand + SIGNAL_WEIGHTS.supply + SIGNAL_WEIGHTS.quality;
    expect(sum).toBeCloseTo(1.0);
  });

  it("models a complete hiring signal", () => {
    const signal: HiringSignal = {
      domain: "ai_engineer",
      timeWindow: "30d",
      generatedAt: new Date().toISOString(),
      compositeScore: 0.72,
      interpretation: "BULLISH",
      demand: { openPositions: 45, newPostings: 12, trend: "increasing", trendPct: 26.7 },
      supply: { totalInterviews: 230, avgScore: 68.5, passRate: 0.69 },
    };
    expect(signal.interpretation).toBe("BULLISH");
    expect(signal.compositeScore).toBeGreaterThan(0.6);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/signals.test.ts`
Expected: FAIL

**Step 3: Write signal types**

```typescript
// src/types/signals.ts

export const VALID_DOMAINS = [
  "ai_engineer", "backend", "frontend",
  "data_science", "devops", "product", "design",
] as const;

export type SignalDomain = (typeof VALID_DOMAINS)[number];

export type SignalInterpretation = "BULLISH" | "NEUTRAL" | "BEARISH";

export type TimeWindow = "7d" | "30d" | "90d";

export const SIGNAL_WEIGHTS = {
  demand: 0.5,
  supply: 0.3,
  quality: 0.2,
} as const;

export interface DemandSignal {
  openPositions: number;
  newPostings: number;
  trend: "increasing" | "stable";
  trendPct: number;
}

export interface SupplySignal {
  totalInterviews: number;
  avgScore: number;
  passRate: number;
}

export interface HiringSignal {
  domain: SignalDomain;
  timeWindow: TimeWindow;
  generatedAt: string;
  compositeScore: number;
  interpretation: SignalInterpretation;
  demand: DemandSignal;
  supply: SupplySignal;
}
```

**Step 4: Update types/index.ts** — add signal exports:

```typescript
export {
  VALID_DOMAINS,
  SIGNAL_WEIGHTS,
} from "./signals.js";
export type {
  SignalDomain,
  SignalInterpretation,
  TimeWindow,
  DemandSignal,
  SupplySignal,
  HiringSignal,
} from "./signals.js";
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/signals.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add vocaid-hub/packages/hub-sdk/src/types/
git commit -m "feat(hub-sdk): add hiring signal types (ported from Python)"
```

---

## Task 5: Errors Module

**Files:**
- Create: `vocaid-hub/packages/hub-sdk/src/errors.ts`
- Test: `vocaid-hub/packages/hub-sdk/src/errors.test.ts`

**Step 1: Write the failing test**

```typescript
// src/errors.test.ts
import { describe, expect, it } from "vitest";
import {
  HubError,
  HubConfigError,
  HubConnectionError,
  HubChainError,
  HubPaymentError,
  HubIdentityError,
} from "./errors.js";

describe("Error hierarchy", () => {
  it("HubConfigError extends HubError", () => {
    const err = new HubConfigError("bad config");
    expect(err).toBeInstanceOf(HubError);
    expect(err).toBeInstanceOf(HubConfigError);
    expect(err.message).toBe("bad config");
    expect(err.name).toBe("HubConfigError");
  });

  it("HubChainError includes chain name", () => {
    const err = new HubChainError("hedera", "connection refused");
    expect(err.chain).toBe("hedera");
    expect(err.message).toBe("[hedera] connection refused");
  });

  it("HubPaymentError includes amount and chain", () => {
    const err = new HubPaymentError("insufficient balance", { chain: "base", amount: "1.50" });
    expect(err.chain).toBe("base");
    expect(err.amount).toBe("1.50");
  });

  it("HubIdentityError includes agentId", () => {
    const err = new HubIdentityError("not registered", { agentId: "0x123" });
    expect(err.agentId).toBe("0x123");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/errors.test.ts`
Expected: FAIL

**Step 3: Write error classes**

```typescript
// src/errors.ts

export class HubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class HubConfigError extends HubError {}

export class HubConnectionError extends HubError {}

export class HubChainError extends HubError {
  readonly chain: string;

  constructor(chain: string, message: string) {
    super(`[${chain}] ${message}`);
    this.chain = chain;
  }
}

export class HubPaymentError extends HubError {
  readonly chain?: string;
  readonly amount?: string;

  constructor(message: string, details?: { chain?: string; amount?: string }) {
    super(message);
    this.chain = details?.chain;
    this.amount = details?.amount;
  }
}

export class HubIdentityError extends HubError {
  readonly agentId?: string;

  constructor(message: string, details?: { agentId?: string }) {
    super(message);
    this.agentId = details?.agentId;
  }
}
```

**Step 4: Run test**

Run: `npx vitest run src/errors.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add vocaid-hub/packages/hub-sdk/src/errors.ts vocaid-hub/packages/hub-sdk/src/errors.test.ts
git commit -m "feat(hub-sdk): add error hierarchy"
```

---

## Task 6: HubClient Class

**Files:**
- Create: `vocaid-hub/packages/hub-sdk/src/client.ts`
- Test: `vocaid-hub/packages/hub-sdk/src/client.test.ts`

This mirrors `VocaidClient` — validates config, instantiates modules.

**Step 1: Write the failing test**

```typescript
// src/client.test.ts
import { describe, expect, it } from "vitest";
import { HubClient } from "./client.js";
import { HubConfigError } from "./errors.js";

describe("HubClient", () => {
  const validOptions = {
    vocaidApiKey: "voc_test_key_12345678901234567890",
    chains: {
      base: { rpcUrl: "https://base-sepolia.example.com", privateKey: "0xabc" },
    },
  };

  it("creates client with valid options", () => {
    const hub = new HubClient(validOptions);
    expect(hub).toBeDefined();
    expect(hub.a2a).toBeDefined();
    expect(hub.identity).toBeDefined();
    expect(hub.vocaid).toBeDefined();
  });

  it("throws HubConfigError when vocaidApiKey is missing", () => {
    expect(() => new HubClient({ vocaidApiKey: "", chains: {} })).toThrow(HubConfigError);
  });

  it("throws HubConfigError when vocaidApiKey has bad prefix", () => {
    expect(() => new HubClient({ vocaidApiKey: "sk_bad", chains: {} })).toThrow(HubConfigError);
  });

  it("reads VOCAID_API_KEY from env if not provided", () => {
    const original = process.env.VOCAID_API_KEY;
    process.env.VOCAID_API_KEY = "voc_env_key_123456789012345678901";
    try {
      const hub = new HubClient({ chains: {} } as any);
      expect(hub).toBeDefined();
    } finally {
      if (original) process.env.VOCAID_API_KEY = original;
      else delete process.env.VOCAID_API_KEY;
    }
  });

  it("uses default hubUrl when not provided", () => {
    const hub = new HubClient(validOptions);
    expect(hub.hubUrl).toBe("https://vocaid-hub.vercel.app");
  });

  it("accepts custom hubUrl", () => {
    const hub = new HubClient({ ...validOptions, hubUrl: "https://custom.example.com" });
    expect(hub.hubUrl).toBe("https://custom.example.com");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/client.test.ts`
Expected: FAIL

**Step 3: Write HubClient**

```typescript
// src/client.ts
import { HubConfigError } from "./errors.js";
import { A2AModule } from "./modules/a2a.js";
import { IdentityModule } from "./modules/identity.js";
import { VocaidModule } from "./modules/vocaid.js";
import type { HubClientOptions, ChainMap } from "./types/index.js";

const DEFAULT_HUB_URL = "https://vocaid-hub.vercel.app";

export class HubClient {
  readonly a2a: A2AModule;
  readonly identity: IdentityModule;
  readonly vocaid: VocaidModule;
  readonly hubUrl: string;
  readonly chains: ChainMap;

  constructor(options: HubClientOptions) {
    const apiKey =
      options.vocaidApiKey ||
      (typeof process !== "undefined" ? process.env?.VOCAID_API_KEY : undefined) ||
      "";

    if (!apiKey) {
      throw new HubConfigError(
        "No API key provided. Pass vocaidApiKey in options or set VOCAID_API_KEY env var.",
      );
    }
    if (!apiKey.startsWith("voc_")) {
      throw new HubConfigError("Invalid API key format. Keys must start with 'voc_'.");
    }

    this.hubUrl = options.hubUrl ?? DEFAULT_HUB_URL;
    this.chains = options.chains;

    const shared = { apiKey, hubUrl: this.hubUrl, chains: this.chains };

    this.a2a = new A2AModule(shared);
    this.identity = new IdentityModule(shared);
    this.vocaid = new VocaidModule(shared);
  }
}
```

> Note: Modules are stubs at this point — they'll be built in Tasks 7-9. Create the stubs now so the client compiles.

**Step 4: Create module stubs** (so client.ts compiles)

```typescript
// src/modules/a2a.ts
import type { SharedConfig } from "./shared.js";
export class A2AModule {
  constructor(_config: SharedConfig) {}
}
```

```typescript
// src/modules/identity.ts
import type { SharedConfig } from "./shared.js";
export class IdentityModule {
  constructor(_config: SharedConfig) {}
}
```

```typescript
// src/modules/vocaid.ts
import type { SharedConfig } from "./shared.js";
export class VocaidModule {
  constructor(_config: SharedConfig) {}
}
```

```typescript
// src/modules/shared.ts
import type { ChainMap } from "../types/index.js";

export interface SharedConfig {
  apiKey: string;
  hubUrl: string;
  chains: ChainMap;
}
```

**Step 5: Run test**

Run: `npx vitest run src/client.test.ts`
Expected: PASS (6 tests)

**Step 6: Commit**

```bash
git add vocaid-hub/packages/hub-sdk/src/client.ts vocaid-hub/packages/hub-sdk/src/client.test.ts vocaid-hub/packages/hub-sdk/src/modules/
git commit -m "feat(hub-sdk): add HubClient with module stubs"
```

---

## Task 7: A2A Module

**Files:**
- Modify: `vocaid-hub/packages/hub-sdk/src/modules/a2a.ts`
- Test: `vocaid-hub/packages/hub-sdk/src/modules/__tests__/a2a.test.ts`

**Step 1: Write the failing test**

```typescript
// src/modules/__tests__/a2a.test.ts
import { describe, expect, it, vi } from "vitest";
import { A2AModule } from "../a2a.js";
import type { AgentCard } from "../../types/index.js";

const config = {
  apiKey: "voc_test",
  hubUrl: "https://vocaid-hub.vercel.app",
  chains: {},
};

describe("A2AModule", () => {
  describe("createAgentCard", () => {
    it("creates a valid Agent Card with required fields", () => {
      const a2a = new A2AModule(config);
      const card = a2a.createAgentCard({
        name: "my-agent",
        description: "A test agent",
        url: "https://my-agent.example.com",
        skills: [
          {
            id: "analyze",
            name: "Analyze Data",
            description: "Analyzes hiring data",
          },
        ],
      });

      expect(card.name).toBe("my-agent");
      expect(card.version).toBe("0.1.0");
      expect(card.capabilities.streaming).toBe(false);
      expect(card.skills).toHaveLength(1);
      expect(card.defaultInputModes).toContain("application/json");
      expect(card.defaultOutputModes).toContain("application/json");
    });

    it("merges custom capabilities", () => {
      const a2a = new A2AModule(config);
      const card = a2a.createAgentCard({
        name: "streamer",
        description: "Streams data",
        url: "https://example.com",
        skills: [],
        capabilities: { streaming: true },
      });
      expect(card.capabilities.streaming).toBe(true);
      expect(card.capabilities.pushNotifications).toBe(false);
    });
  });

  describe("getHubAgentCard", () => {
    it("returns the hub's own Agent Card", () => {
      const a2a = new A2AModule(config);
      const card = a2a.getHubAgentCard();

      expect(card.name).toBe("vocaid-hub");
      expect(card.url).toBe("https://vocaid-hub.vercel.app");
      expect(card.skills.length).toBeGreaterThan(0);
      expect(card.skills.map((s) => s.id)).toContain("hiring-signals");
      expect(card.skills.map((s) => s.id)).toContain("prediction-markets");
      expect(card.skills.map((s) => s.id)).toContain("agent-marketplace");
    });
  });

  describe("discoverAgent", () => {
    it("fetches Agent Card from a remote URL", async () => {
      const a2a = new A2AModule(config);

      const mockCard: AgentCard = {
        name: "remote-agent",
        description: "Remote",
        url: "https://remote.example.com",
        version: "1.0.0",
        capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
        skills: [],
        defaultInputModes: ["application/json"],
        defaultOutputModes: ["application/json"],
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCard),
      }));

      const card = await a2a.discoverAgent("https://remote.example.com");
      expect(card.name).toBe("remote-agent");
      expect(fetch).toHaveBeenCalledWith(
        "https://remote.example.com/.well-known/agent.json",
        expect.any(Object),
      );

      vi.restoreAllMocks();
    });

    it("throws on failed discovery", async () => {
      const a2a = new A2AModule(config);

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }));

      await expect(a2a.discoverAgent("https://bad.example.com")).rejects.toThrow(
        "Agent discovery failed",
      );

      vi.restoreAllMocks();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/__tests__/a2a.test.ts`
Expected: FAIL

**Step 3: Implement A2A module**

```typescript
// src/modules/a2a.ts
import { HubConnectionError } from "../errors.js";
import type { AgentCard, AgentCapability, AgentSkill } from "../types/index.js";
import type { SharedConfig } from "./shared.js";

interface CreateAgentCardInput {
  name: string;
  description: string;
  url: string;
  skills: Array<{ id: string; name: string; description: string; tags?: string[] }>;
  capabilities?: Partial<AgentCapability>;
  authentication?: AgentCard["authentication"];
}

const HUB_SKILLS: AgentSkill[] = [
  {
    id: "hiring-signals",
    name: "Hiring Signals",
    description: "Get BULLISH/NEUTRAL/BEARISH hiring market signals by domain",
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    tags: ["hiring", "signals", "market"],
  },
  {
    id: "prediction-markets",
    name: "Prediction Markets",
    description: "Trade binary prediction markets on hiring outcomes",
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    tags: ["prediction", "trading", "markets"],
  },
  {
    id: "agent-marketplace",
    name: "Agent Marketplace",
    description: "Discover and hire third-party agents for hiring tasks",
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    tags: ["marketplace", "agents", "services"],
  },
  {
    id: "inference",
    name: "Inference",
    description: "Model-agnostic LLM inference routed through multi-provider backend",
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    tags: ["inference", "llm", "ai"],
  },
];

export class A2AModule {
  private readonly config: SharedConfig;

  constructor(config: SharedConfig) {
    this.config = config;
  }

  createAgentCard(input: CreateAgentCardInput): AgentCard {
    return {
      name: input.name,
      description: input.description,
      url: input.url,
      version: "0.1.0",
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
        ...input.capabilities,
      },
      skills: input.skills.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        inputModes: ["application/json"],
        outputModes: ["application/json"],
        tags: s.tags,
      })),
      defaultInputModes: ["application/json"],
      defaultOutputModes: ["application/json"],
      authentication: input.authentication,
    };
  }

  getHubAgentCard(): AgentCard {
    return {
      name: "vocaid-hub",
      description: "Vocaid Hub — hiring signal gateway, prediction markets, and agent marketplace",
      url: this.config.hubUrl,
      version: "0.1.0",
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      skills: HUB_SKILLS,
      defaultInputModes: ["application/json"],
      defaultOutputModes: ["application/json"],
      authentication: {
        schemes: ["bearer"],
        credentials: "erc8004",
      },
      provider: {
        organization: "Vocaid",
        url: "https://vocaid.ai",
      },
    };
  }

  async discoverAgent(baseUrl: string): Promise<AgentCard> {
    const url = `${baseUrl.replace(/\/$/, "")}/.well-known/agent.json`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new HubConnectionError(
        `Agent discovery failed: ${response.status} ${response.statusText} at ${url}`,
      );
    }

    return (await response.json()) as AgentCard;
  }
}
```

**Step 4: Run test**

Run: `npx vitest run src/modules/__tests__/a2a.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add vocaid-hub/packages/hub-sdk/src/modules/a2a.ts vocaid-hub/packages/hub-sdk/src/modules/__tests__/a2a.test.ts
git commit -m "feat(hub-sdk): implement A2A module — Agent Cards, discovery"
```

---

## Task 8: Identity Module (ERC-8004)

**Files:**
- Modify: `vocaid-hub/packages/hub-sdk/src/modules/identity.ts`
- Test: `vocaid-hub/packages/hub-sdk/src/modules/__tests__/identity.test.ts`

> Note: This task implements the **interface and local validation** for ERC-8004. Actual on-chain calls are mocked in tests and will connect to real contracts when deployed to testnet in Phase 2.

**Step 1: Write the failing test**

```typescript
// src/modules/__tests__/identity.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { IdentityModule } from "../identity.js";
import { HubIdentityError, HubConfigError } from "../../errors.js";

const config = {
  apiKey: "voc_test",
  hubUrl: "https://vocaid-hub.vercel.app",
  chains: {
    base: { rpcUrl: "https://base-sepolia.example.com", privateKey: "0xabc123" },
  },
};

describe("IdentityModule", () => {
  describe("validateRegistration", () => {
    it("validates a well-formed registration request", () => {
      const identity = new IdentityModule(config);
      const result = identity.validateRegistration({
        name: "my-trading-bot",
        description: "Trades hiring signals",
        capabilities: ["hiring-signals", "prediction-markets"],
        chain: "base",
      });
      expect(result.valid).toBe(true);
    });

    it("rejects empty name", () => {
      const identity = new IdentityModule(config);
      const result = identity.validateRegistration({
        name: "",
        description: "Test",
        capabilities: ["test"],
        chain: "base",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name is required");
    });

    it("rejects unconfigured chain", () => {
      const identity = new IdentityModule(config);
      const result = identity.validateRegistration({
        name: "test",
        description: "Test",
        capabilities: ["test"],
        chain: "arbitrum",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("chain 'arbitrum' is not configured");
    });

    it("rejects empty capabilities", () => {
      const identity = new IdentityModule(config);
      const result = identity.validateRegistration({
        name: "test",
        description: "Test",
        capabilities: [],
        chain: "base",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("at least one capability is required");
    });
  });

  describe("buildRegistrationMetadata", () => {
    it("produces ERC-8004 compatible metadata", () => {
      const identity = new IdentityModule(config);
      const meta = identity.buildRegistrationMetadata({
        name: "seer-agent",
        description: "Hiring signal oracle",
        capabilities: ["hiring-signals"],
        owner: "0x1234567890123456789012345678901234567890",
      });

      expect(meta.name).toBe("seer-agent");
      expect(meta.description).toBe("Hiring signal oracle");
      expect(meta.capabilities).toEqual(["hiring-signals"]);
      expect(meta.owner).toBe("0x1234567890123456789012345678901234567890");
      expect(meta.registeredAt).toBeDefined();
      expect(meta.version).toBe("0.1.0");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/__tests__/identity.test.ts`
Expected: FAIL

**Step 3: Implement Identity module**

```typescript
// src/modules/identity.ts
import type { SupportedChain } from "../types/index.js";
import type { SharedConfig } from "./shared.js";

interface RegistrationInput {
  name: string;
  description: string;
  capabilities: string[];
  chain: SupportedChain;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface RegistrationMetadata {
  name: string;
  description: string;
  capabilities: string[];
  owner: string;
  registeredAt: string;
  version: string;
}

interface MetadataInput {
  name: string;
  description: string;
  capabilities: string[];
  owner: string;
}

export class IdentityModule {
  private readonly config: SharedConfig;

  constructor(config: SharedConfig) {
    this.config = config;
  }

  validateRegistration(input: RegistrationInput): ValidationResult {
    const errors: string[] = [];

    if (!input.name || input.name.trim() === "") {
      errors.push("name is required");
    }

    if (!input.capabilities || input.capabilities.length === 0) {
      errors.push("at least one capability is required");
    }

    if (!this.config.chains[input.chain]) {
      errors.push(`chain '${input.chain}' is not configured`);
    }

    return { valid: errors.length === 0, errors };
  }

  buildRegistrationMetadata(input: MetadataInput): RegistrationMetadata {
    return {
      name: input.name,
      description: input.description,
      capabilities: input.capabilities,
      owner: input.owner,
      registeredAt: new Date().toISOString(),
      version: "0.1.0",
    };
  }
}
```

**Step 4: Run test**

Run: `npx vitest run src/modules/__tests__/identity.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add vocaid-hub/packages/hub-sdk/src/modules/identity.ts vocaid-hub/packages/hub-sdk/src/modules/__tests__/identity.test.ts
git commit -m "feat(hub-sdk): implement Identity module — ERC-8004 validation and metadata"
```

---

## Task 9: Vocaid Module (Wraps @vocaid/connect + Hiring Signals)

**Files:**
- Modify: `vocaid-hub/packages/hub-sdk/src/modules/vocaid.ts`
- Create: `vocaid-hub/packages/hub-sdk/src/utils/signals.ts`
- Test: `vocaid-hub/packages/hub-sdk/src/utils/__tests__/signals.test.ts`
- Test: `vocaid-hub/packages/hub-sdk/src/modules/__tests__/vocaid.test.ts`

**Step 1: Write the failing test for signal computation**

This is the core Python-to-TypeScript port. Test it thoroughly.

```typescript
// src/utils/__tests__/signals.test.ts
import { describe, expect, it } from "vitest";
import { computeHiringSignal } from "../signals.js";

describe("computeHiringSignal", () => {
  it("returns BULLISH when composite > 0.6", () => {
    const signal = computeHiringSignal({
      domain: "ai_engineer",
      timeWindow: "30d",
      jobs: Array.from({ length: 80 }, (_, i) => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: Array.from({ length: 400 }, () => ({
        score: 75,
        created_at: new Date().toISOString(),
      })),
    });

    expect(signal.interpretation).toBe("BULLISH");
    expect(signal.compositeScore).toBeGreaterThan(0.6);
    expect(signal.domain).toBe("ai_engineer");
  });

  it("returns BEARISH when composite < 0.3", () => {
    const signal = computeHiringSignal({
      domain: "design",
      timeWindow: "30d",
      jobs: [],
      interviews: [],
    });

    expect(signal.interpretation).toBe("BEARISH");
    expect(signal.compositeScore).toBeLessThan(0.3);
  });

  it("returns NEUTRAL in the middle range", () => {
    const signal = computeHiringSignal({
      domain: "backend",
      timeWindow: "30d",
      jobs: Array.from({ length: 40 }, () => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: Array.from({ length: 100 }, () => ({
        score: 50,
        created_at: new Date().toISOString(),
      })),
    });

    expect(signal.interpretation).toBe("NEUTRAL");
    expect(signal.compositeScore).toBeGreaterThanOrEqual(0.3);
    expect(signal.compositeScore).toBeLessThanOrEqual(0.6);
  });

  it("computes demand score capped at 1.0", () => {
    const signal = computeHiringSignal({
      domain: "frontend",
      timeWindow: "7d",
      jobs: Array.from({ length: 200 }, () => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: [],
    });

    expect(signal.demand.openPositions).toBe(200);
    // demand_score = min(1.0, 200/100) = 1.0
    // composite = 1.0*0.5 + 0*0.3 + 0*0.2 = 0.5
    expect(signal.compositeScore).toBeCloseTo(0.5, 1);
  });

  it("filters jobs by time window", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

    const signal = computeHiringSignal({
      domain: "devops",
      timeWindow: "30d",
      jobs: [
        { status: "active", created_at: new Date().toISOString() },
        { status: "active", created_at: oldDate.toISOString() },
      ],
      interviews: [],
    });

    // Both are active (counted in openPositions)
    expect(signal.demand.openPositions).toBe(2);
    // Only 1 is new (within 30d window)
    expect(signal.demand.newPostings).toBe(1);
  });

  it("matches Python weights: demand=0.5, supply=0.3, quality=0.2", () => {
    // 50 active jobs, all new → demand_score = 0.5
    // 250 interviews, avg score 60 → supply_score = 0.5, quality = 0.12
    const signal = computeHiringSignal({
      domain: "data_science",
      timeWindow: "30d",
      jobs: Array.from({ length: 50 }, () => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: Array.from({ length: 250 }, () => ({
        score: 60,
        created_at: new Date().toISOString(),
      })),
    });

    // demand: min(1, 50/100) = 0.5 → 0.5 * 0.5 = 0.25
    // supply: min(1, 250/500) = 0.5 → 0.5 * 0.3 = 0.15
    // quality: 60/100 = 0.6 → 0.6 * 0.2 = 0.12
    // composite = 0.25 + 0.15 + 0.12 = 0.52
    expect(signal.compositeScore).toBeCloseTo(0.52, 1);
    expect(signal.interpretation).toBe("NEUTRAL");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/signals.test.ts`
Expected: FAIL

**Step 3: Implement signal computation**

```typescript
// src/utils/signals.ts
import {
  SIGNAL_WEIGHTS,
  type HiringSignal,
  type SignalDomain,
  type SignalInterpretation,
  type TimeWindow,
} from "../types/index.js";

interface JobInput {
  status: string;
  created_at: string;
}

interface InterviewInput {
  score: number | null;
  created_at: string;
}

interface ComputeInput {
  domain: SignalDomain;
  timeWindow: TimeWindow;
  jobs: JobInput[];
  interviews: InterviewInput[];
}

function getWindowCutoff(window: TimeWindow): Date {
  const days = { "7d": 7, "30d": 30, "90d": 90 }[window];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

export function computeHiringSignal(input: ComputeInput): HiringSignal {
  const cutoff = getWindowCutoff(input.timeWindow);

  const activeJobs = input.jobs.filter((j) => j.status === "active");
  const openCount = activeJobs.length;
  const newPostings = activeJobs.filter((j) => new Date(j.created_at) >= cutoff).length;

  const recentInterviews = input.interviews.filter(
    (i) => new Date(i.created_at) >= cutoff,
  );
  const scores = recentInterviews
    .map((i) => i.score)
    .filter((s): s is number => s !== null && s !== undefined);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const demandScore = Math.min(1.0, openCount / 100);
  const supplyScore = Math.min(1.0, recentInterviews.length / 500);
  const qualityScore = avgScore / 100;

  const composite = Math.round(
    (demandScore * SIGNAL_WEIGHTS.demand +
      supplyScore * SIGNAL_WEIGHTS.supply +
      qualityScore * SIGNAL_WEIGHTS.quality) *
      100,
  ) / 100;

  const trend = newPostings > 0 ? "increasing" as const : "stable" as const;
  const trendPct =
    newPostings > 0
      ? Math.round((newPostings / Math.max(openCount, 1)) * 1000) / 10
      : 0;

  const interpretation: SignalInterpretation =
    composite > 0.6 ? "BULLISH" : composite < 0.3 ? "BEARISH" : "NEUTRAL";

  return {
    domain: input.domain,
    timeWindow: input.timeWindow,
    generatedAt: new Date().toISOString(),
    compositeScore: composite,
    interpretation,
    demand: {
      openPositions: openCount,
      newPostings,
      trend,
      trendPct,
    },
    supply: {
      totalInterviews: recentInterviews.length,
      avgScore: Math.round(avgScore * 10) / 10,
      passRate: avgScore > 0 ? Math.round((avgScore / 100) * 100) / 100 : 0,
    },
  };
}
```

**Step 4: Run signal test**

Run: `npx vitest run src/utils/__tests__/signals.test.ts`
Expected: PASS (6 tests)

**Step 5: Write the failing test for VocaidModule**

```typescript
// src/modules/__tests__/vocaid.test.ts
import { describe, expect, it, vi } from "vitest";
import { VocaidModule } from "../vocaid.js";

const config = {
  apiKey: "voc_test_key_12345678901234567890",
  hubUrl: "https://vocaid-hub.vercel.app",
  chains: {},
};

describe("VocaidModule", () => {
  it("exposes a VocaidClient from @vocaid/connect", () => {
    const vocaid = new VocaidModule(config);
    expect(vocaid.client).toBeDefined();
  });

  it("computes hiring signals from raw data", () => {
    const vocaid = new VocaidModule(config);
    const signal = vocaid.computeSignal({
      domain: "ai_engineer",
      timeWindow: "30d",
      jobs: Array.from({ length: 70 }, () => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: Array.from({ length: 300 }, () => ({
        score: 72,
        created_at: new Date().toISOString(),
      })),
    });

    expect(signal.domain).toBe("ai_engineer");
    expect(signal.interpretation).toBeDefined();
    expect(["BULLISH", "NEUTRAL", "BEARISH"]).toContain(signal.interpretation);
  });
});
```

**Step 6: Implement VocaidModule**

```typescript
// src/modules/vocaid.ts
import { VocaidClient } from "@vocaid/connect";
import { computeHiringSignal } from "../utils/signals.js";
import type { HiringSignal, SignalDomain, TimeWindow } from "../types/index.js";
import type { SharedConfig } from "./shared.js";

interface ComputeSignalInput {
  domain: SignalDomain;
  timeWindow: TimeWindow;
  jobs: Array<{ status: string; created_at: string }>;
  interviews: Array<{ score: number | null; created_at: string }>;
}

export class VocaidModule {
  readonly client: VocaidClient;
  private readonly config: SharedConfig;

  constructor(config: SharedConfig) {
    this.config = config;
    this.client = new VocaidClient({ apiKey: config.apiKey });
  }

  computeSignal(input: ComputeSignalInput): HiringSignal {
    return computeHiringSignal(input);
  }
}
```

**Step 7: Run all vocaid tests**

Run: `npx vitest run src/modules/__tests__/vocaid.test.ts`
Expected: PASS

**Step 8: Commit**

```bash
git add vocaid-hub/packages/hub-sdk/src/utils/ vocaid-hub/packages/hub-sdk/src/modules/vocaid.ts vocaid-hub/packages/hub-sdk/src/modules/__tests__/vocaid.test.ts
git commit -m "feat(hub-sdk): implement Vocaid module with hiring signal computation"
```

---

## Task 10: Wire Exports + Full Build Verification

**Files:**
- Modify: `vocaid-hub/packages/hub-sdk/src/index.ts`
- Create: `vocaid-hub/packages/hub-sdk/src/agents/index.ts`

**Step 1: Write the public API exports**

```typescript
// src/index.ts
export { HubClient } from "./client.js";

// Modules (re-exported for advanced usage)
export { A2AModule } from "./modules/a2a.js";
export { IdentityModule } from "./modules/identity.js";
export { VocaidModule } from "./modules/vocaid.js";

// Utils
export { computeHiringSignal } from "./utils/signals.js";

// Errors
export {
  HubError,
  HubConfigError,
  HubConnectionError,
  HubChainError,
  HubPaymentError,
  HubIdentityError,
} from "./errors.js";

// Types
export type { HubClientOptions } from "./types/index.js";
export type {
  SupportedChain,
  HederaChainConfig,
  EvmChainConfig,
  ChainConfig,
  ChainMap,
} from "./types/index.js";
export type {
  AgentCard,
  AgentCapability,
  AgentSkill,
  AgentAuthentication,
  AgentProvider,
} from "./types/index.js";
export type {
  SignalDomain,
  SignalInterpretation,
  TimeWindow,
  DemandSignal,
  SupplySignal,
  HiringSignal,
} from "./types/index.js";
export { VALID_DOMAINS, SIGNAL_WEIGHTS } from "./types/index.js";
```

```typescript
// src/agents/index.ts
// Agent functions ship in Phase 3. Stub for now.
export {};
```

**Step 2: Run full test suite**

Run: `cd vocaid-hub/packages/hub-sdk && npx vitest run`
Expected: All tests pass (types, errors, client, a2a, identity, vocaid, signals)

**Step 3: Run build**

Run: `npm run build`
Expected: `dist/` created with `index.js`, `index.d.ts`, `agents/index.js`, `agents/index.d.ts`

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add vocaid-hub/packages/hub-sdk/src/index.ts vocaid-hub/packages/hub-sdk/src/agents/index.ts
git commit -m "feat(hub-sdk): wire public exports, verify full build"
```

---

## Task 11: Integration Smoke Test

**Files:**
- Create: `vocaid-hub/packages/hub-sdk/src/__tests__/integration.test.ts`

**Step 1: Write the integration test**

```typescript
// src/__tests__/integration.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  HubClient,
  HubConfigError,
  computeHiringSignal,
  VALID_DOMAINS,
  SIGNAL_WEIGHTS,
} from "../index.js";

describe("Hub SDK integration", () => {
  const hub = new HubClient({
    vocaidApiKey: "voc_integration_test_key_1234567890",
    chains: {
      base: { rpcUrl: "https://base-sepolia.example.com", privateKey: "0xabc" },
    },
  });

  it("provides all three modules", () => {
    expect(hub.a2a).toBeDefined();
    expect(hub.identity).toBeDefined();
    expect(hub.vocaid).toBeDefined();
  });

  it("a2a: creates agent card and discovers hub card", () => {
    const myCard = hub.a2a.createAgentCard({
      name: "my-bot",
      description: "Test bot",
      url: "https://example.com",
      skills: [{ id: "test", name: "Test", description: "Testing" }],
    });
    expect(myCard.name).toBe("my-bot");

    const hubCard = hub.a2a.getHubAgentCard();
    expect(hubCard.skills.map((s) => s.id)).toContain("hiring-signals");
  });

  it("identity: validates registration against configured chains", () => {
    const valid = hub.identity.validateRegistration({
      name: "my-bot",
      description: "Test",
      capabilities: ["hiring-signals"],
      chain: "base",
    });
    expect(valid.valid).toBe(true);

    const invalid = hub.identity.validateRegistration({
      name: "my-bot",
      description: "Test",
      capabilities: ["hiring-signals"],
      chain: "arbitrum",
    });
    expect(invalid.valid).toBe(false);
  });

  it("vocaid: computes hiring signal with correct interpretation", () => {
    const signal = hub.vocaid.computeSignal({
      domain: "ai_engineer",
      timeWindow: "30d",
      jobs: Array.from({ length: 80 }, () => ({
        status: "active",
        created_at: new Date().toISOString(),
      })),
      interviews: Array.from({ length: 400 }, () => ({
        score: 75,
        created_at: new Date().toISOString(),
      })),
    });
    expect(signal.interpretation).toBe("BULLISH");
  });

  it("standalone computeHiringSignal works without HubClient", () => {
    const signal = computeHiringSignal({
      domain: "backend",
      timeWindow: "7d",
      jobs: [],
      interviews: [],
    });
    expect(signal.interpretation).toBe("BEARISH");
  });

  it("exports constants", () => {
    expect(VALID_DOMAINS).toContain("ai_engineer");
    expect(SIGNAL_WEIGHTS.demand + SIGNAL_WEIGHTS.supply + SIGNAL_WEIGHTS.quality).toBeCloseTo(1.0);
  });
});
```

**Step 2: Run it**

Run: `npx vitest run src/__tests__/integration.test.ts`
Expected: PASS (5 tests)

**Step 3: Run full suite one final time**

Run: `npx vitest run`
Expected: ALL tests pass

**Step 4: Final commit**

```bash
git add vocaid-hub/packages/hub-sdk/src/__tests__/integration.test.ts
git commit -m "test(hub-sdk): add integration smoke test — Phase 1 complete"
```

---

## Verification Checklist

After all 11 tasks complete, verify:

1. `npm run build` — clean build, no errors
2. `npm run typecheck` — zero TS errors
3. `npx vitest run` — all tests pass
4. `ls dist/` — contains `index.js`, `index.d.ts`, `agents/index.js`
5. Hub exports: `HubClient`, `A2AModule`, `IdentityModule`, `VocaidModule`, `computeHiringSignal`, all error classes, all types
6. Signal computation matches Python logic (weights 0.5/0.3/0.2, thresholds 0.6/0.3)

## What Ships Next (Phase 2)

- **Hedera module** (`hedera.ts`): HTS, HCS, Agent Kit, HIP-991 — requires `@hashgraph/sdk`
- **Payment module** (`payment.ts`): x402 multi-chain — requires Blocky402 integration
- **Vercel app scaffold**: Next.js pages + API routes wrapping SDK
