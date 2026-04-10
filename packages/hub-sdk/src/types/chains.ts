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
