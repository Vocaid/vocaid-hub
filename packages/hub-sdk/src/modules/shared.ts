import type { ChainMap } from "../types/index.js";

export interface SharedConfig {
  apiKey: string;
  hubUrl: string;
  chains: ChainMap;
}
