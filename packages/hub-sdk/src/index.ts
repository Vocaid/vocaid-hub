export { HubClient } from "./client.js";

export { A2AModule } from "./modules/a2a.js";
export { IdentityModule } from "./modules/identity.js";
export { VocaidModule } from "./modules/vocaid.js";

export { computeHiringSignal } from "./utils/signals.js";

export {
  HubError,
  HubConfigError,
  HubConnectionError,
  HubChainError,
  HubPaymentError,
  HubIdentityError,
} from "./errors.js";

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
