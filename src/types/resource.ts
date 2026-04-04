/** Shared resource types used by both frontend components and backend routes. */

export type ResourceType = 'human' | 'gpu' | 'agent' | 'depin';

export type Chain = 'world' | '0g' | 'hedera';

export type VerificationType = 'tee' | 'world-id' | 'agentkit';

export interface SignalData {
  value: number;
  unit: string;
  rank?: number;
  total?: number;
  tag2?: string;
}

export interface ResourceSignals {
  cost?: SignalData;
  latency?: SignalData;
  uptime?: SignalData;
  compute?: SignalData;
  region?: SignalData;
  quality?: SignalData;
  availability?: SignalData;
}

export interface ResourceCardProps {
  type: ResourceType;
  name: string;
  reputation: number;
  verified: boolean;
  chain: Chain;
  price: string;
  verificationType?: VerificationType;
  subtitle?: string;
  signals?: ResourceSignals;
  onHire?: (resource: { name: string; price: string; type: ResourceType }) => void;
  hiring?: boolean;
}
