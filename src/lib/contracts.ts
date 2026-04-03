import { type Address } from "viem";

/**
 * Centralized contract address loader for all deployed 0G Galileo contracts.
 * Sources addresses from environment variables (populated from deployments/0g-galileo.json).
 */

export const OG_CHAIN_ID = 16602;
export const OG_RPC_URL = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";

// --- Contract addresses ---

export function getAddress(envVar: string, name: string): Address {
  const addr = process.env[envVar];
  if (!addr) throw new Error(`${envVar} env not set — run deploy-0g.ts and update .env`);
  return addr as Address;
}

export const addresses = {
  identityRegistry: () => getAddress("IDENTITY_REGISTRY", "IdentityRegistry"),
  reputationRegistry: () => getAddress("REPUTATION_REGISTRY", "ReputationRegistry"),
  validationRegistry: () => getAddress("VALIDATION_REGISTRY", "ValidationRegistry"),
  gpuProviderRegistry: () => getAddress("GPU_PROVIDER_REGISTRY", "GPUProviderRegistry"),
  mockTEEValidator: () => getAddress("MOCK_TEE_VALIDATOR", "MockTEEValidator"),
  resourcePrediction: () => getAddress("RESOURCE_PREDICTION", "ResourcePrediction"),
} as const;

// --- External 0G contracts (read-only) ---

export const externalContracts = {
  inferenceServing: (process.env.OG_INFERENCE_SERVING || "0xa79F4c8311FF93C06b8CfB403690cc987c93F91E") as Address,
  ledger: (process.env.OG_LEDGER || "0xE70830508dAc0A97e6c087c75f402f9Be669E406") as Address,
} as const;

// --- ABIs (minimal subsets for app-layer reads/writes) ---

export const REPUTATION_REGISTRY_ABI = [
  {
    name: "giveFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "getSummary",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
  },
  {
    name: "getClients",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "getLastIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
    ],
    outputs: [{ name: "", type: "uint64" }],
  },
] as const;

export const VALIDATION_REGISTRY_ABI = [
  {
    name: "validationRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "validatorAddress", type: "address" },
      { name: "agentId", type: "uint256" },
      { name: "requestURI", type: "string" },
      { name: "requestHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "validationResponse",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestHash", type: "bytes32" },
      { name: "response", type: "uint8" },
      { name: "responseURI", type: "string" },
      { name: "responseHash", type: "bytes32" },
      { name: "tag", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "getValidationStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "requestHash", type: "bytes32" }],
    outputs: [
      { name: "validatorAddress", type: "address" },
      { name: "agentId", type: "uint256" },
      { name: "response", type: "uint8" },
      { name: "responseHash", type: "bytes32" },
      { name: "tag", type: "string" },
      { name: "lastUpdate", type: "uint256" },
    ],
  },
  {
    name: "getSummary",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "validatorAddresses", type: "address[]" },
      { name: "tag", type: "string" },
    ],
    outputs: [
      { name: "count", type: "uint64" },
      { name: "avgResponse", type: "uint8" },
    ],
  },
  {
    name: "getAgentValidations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
] as const;

export const MOCK_TEE_VALIDATOR_ABI = [
  {
    name: "validate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestHash", type: "bytes32" },
      { name: "response", type: "uint8" },
      { name: "responseURI", type: "string" },
      { name: "responseHash", type: "bytes32" },
      { name: "tag", type: "string" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "trustedSigner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
