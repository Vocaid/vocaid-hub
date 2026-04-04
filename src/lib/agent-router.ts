/**
 * Agent router — name validation, handler dispatch, rate limiting, shared types.
 * Used by both A2A and MCP dynamic routes.
 */

import { cacheGet, cacheSet } from "./cache";

// ---------------------------------------------------------------------------
// Valid agent names
// ---------------------------------------------------------------------------

export const AGENT_NAMES = ["seer", "edge", "shield", "lens"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

export function isValidAgent(name: string): name is AgentName {
  return AGENT_NAMES.includes(name as AgentName);
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface A2ARequest {
  method: string;
  params?: Record<string, unknown>;
  signature?: string;
  agentId?: string;
}

export interface A2AResponse {
  result?: unknown;
  error?: string;
  _demo?: boolean;
  _reason?: string;
}

export interface MCPToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export interface MCPRequest {
  tool: string;
  input?: Record<string, unknown>;
  signature?: string;
  agentId?: string;
}

export interface MCPResponse {
  output?: unknown;
  error?: string;
  _demo?: boolean;
  _reason?: string;
}

// ---------------------------------------------------------------------------
// Agent card loader (cached 300s)
// ---------------------------------------------------------------------------

const CARD_CACHE_TTL = 300_000;

export async function getAgentCard(name: AgentName): Promise<Record<string, unknown>> {
  const key = `agent-card:${name}`;
  const cached = cacheGet<Record<string, unknown>>(key);
  if (cached) return cached;

  // Read from public/agent-cards via fs (server-side only)
  const fs = await import("fs");
  const path = await import("path");
  const filePath = path.join(process.cwd(), "public", "agent-cards", `${name}.json`);
  const card = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;

  cacheSet(key, card, CARD_CACHE_TTL);
  return card;
}

// ---------------------------------------------------------------------------
// Rate limiter (in-memory, per-IP)
// ---------------------------------------------------------------------------

interface RateEntry {
  count: number;
  windowStart: number;
}

const rateLimits = new Map<string, RateEntry>();
const WINDOW_MS = 60_000;

const AGENT_RATE_LIMITS: Record<AgentName, number> = {
  seer: 30,
  edge: 5,
  shield: 30,
  lens: 10,
};

export function checkRateLimit(agent: AgentName, ip: string): boolean {
  const key = `${agent}:${ip}`;
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimits.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;
  return entry.count <= AGENT_RATE_LIMITS[agent];
}
