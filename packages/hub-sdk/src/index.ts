export { HubClient } from "./client.js";

// Modules
export { A2AModule } from "./modules/a2a.js";
export { HederaModule } from "./modules/hedera.js";
export { IdentityModule } from "./modules/identity.js";
export { InferenceModule } from "./modules/inference.js";
export { MarketModule } from "./modules/market.js";
export { PaymentModule } from "./modules/payment.js";
export { VocaidModule } from "./modules/vocaid.js";

// Utils
export { computeHiringSignal } from "./utils/signals.js";
export { createX402Fetch } from "./utils/x402-fetch.js";

// Errors
export {
  HubError,
  HubConfigError,
  HubConnectionError,
  HubChainError,
  HubPaymentError,
  HubIdentityError,
} from "./errors.js";

// Types — config & chains
export type { HubClientOptions } from "./types/index.js";
export type {
  SupportedChain,
  HederaChainConfig,
  EvmChainConfig,
  ChainConfig,
  ChainMap,
} from "./types/index.js";

// Types — A2A
export type {
  AgentCard,
  AgentCapability,
  AgentSkill,
  AgentAuthentication,
  AgentProvider,
} from "./types/index.js";

// Types — signals
export type {
  SignalDomain,
  SignalInterpretation,
  TimeWindow,
  DemandSignal,
  SupplySignal,
  HiringSignal,
} from "./types/index.js";
export { VALID_DOMAINS, SIGNAL_WEIGHTS } from "./types/index.js";

// Types — payment
export type {
  X402PaymentRequest,
  X402PaymentReceipt,
  X402PaymentHeader,
} from "./modules/payment.js";

// Types — hedera
export type {
  AuditLogEntry,
  CredentialTokenConfig,
  MintCredentialInput,
} from "./modules/hedera.js";

// Types — inference
export type {
  InferenceProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  EmbedResponse,
  CostEstimate,
} from "./modules/inference.js";

// Types — market
export type {
  Market,
  MarketStatus,
  CreateMarketInput,
  PlaceBetInput,
  BetReceipt,
  MarketResolution,
} from "./modules/market.js";

// Types — x402 fetch
export type {
  X402FetchOptions,
  PaymentRequirements,
} from "./utils/x402-fetch.js";
