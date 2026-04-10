import type { ChainMap } from "./chains.js";

export interface HubClientOptions {
  vocaidApiKey: string;
  chains: ChainMap;
  hubUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
