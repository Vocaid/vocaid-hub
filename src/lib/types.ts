import type { Address } from "viem";

// --- Agent types ---

export type AgentRole = "signal-analyst" | "market-maker" | "risk-manager" | "discovery";

export interface RegisteredAgent {
  agentId: string;
  owner: Address;
  agentURI: string;
  wallet: Address;
  operatorWorldId: string;
  role: AgentRole | string;
  type: string;
}

// --- Resource types ---

export type ResourceType = "human" | "gpu" | "agent";
export type Chain = "0g" | "world" | "hedera";
export type VerificationType = "tee" | "world-id" | "mock" | "none";

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  description?: string;
  chain: Chain;
  reputation: number;
  verified: boolean;
  verificationType: VerificationType;
  price: string;
  agentId?: string;
}

// --- Reputation types ---

export type ReputationTag = "starred" | "uptime" | "successRate" | "responseTime";

export interface ReputationScore {
  agentId: string;
  tag: ReputationTag;
  count: number;
  averageValue: number;
  decimals: number;
}

// --- GPU Provider types ---

export interface GPUProvider {
  address: Address;
  model: string;
  endpoint: string;
  inputPrice: string;
  outputPrice: string;
  teeVerified: boolean;
  agentId?: string;
}

// --- Prediction Market types ---

export interface PredictionMarket {
  marketId: string;
  question: string;
  endTime: number;
  yesPool: string;
  noPool: string;
  resolved: boolean;
  outcome?: boolean;
}
