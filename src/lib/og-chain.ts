import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  OG_RPC_URL,
  addresses,
  REPUTATION_REGISTRY_ABI,
  VALIDATION_REGISTRY_ABI,
  MOCK_TEE_VALIDATOR_ABI,
} from "./contracts";

/**
 * 0G Galileo chain definition + client factories.
 * Shared across all 0G-facing lib modules (agentkit, reputation, validation).
 */

export const ogGalileo = {
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: { default: { http: [OG_RPC_URL] } },
  blockExplorers: { default: { name: "0G Explorer", url: "https://chainscan-galileo.0g.ai" } },
} as const;

export function getPublicClient() {
  return createPublicClient({
    chain: ogGalileo,
    transport: http(OG_RPC_URL),
  });
}

export function getWalletClient() {
  if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${process.env.PRIVATE_KEY.replace(/^0x/, "")}` as Hex,
  );
  return createWalletClient({
    account,
    chain: ogGalileo,
    transport: http(OG_RPC_URL),
  });
}

// --- Reputation reads ---

export async function getReputationSummary(agentId: bigint, tag1 = "", tag2 = "") {
  const client = getPublicClient();
  const clients = await client.readContract({
    address: addresses.reputationRegistry(),
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "getClients",
    args: [agentId],
  }) as Address[];

  if (clients.length === 0) return { count: BigInt(0), summaryValue: BigInt(0), decimals: 0 };

  const [count, summaryValue, decimals] = await client.readContract({
    address: addresses.reputationRegistry(),
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "getSummary",
    args: [agentId, clients, tag1, tag2],
  }) as [bigint, bigint, number];

  return { count, summaryValue, decimals };
}

// --- Validation reads ---

export async function getValidationSummary(agentId: bigint, tag = "") {
  const client = getPublicClient();
  const [count, avgResponse] = await client.readContract({
    address: addresses.validationRegistry(),
    abi: VALIDATION_REGISTRY_ABI,
    functionName: "getSummary",
    args: [agentId, [], tag],
  }) as [bigint, number];

  return { count, avgResponse };
}

export async function getAgentValidations(agentId: bigint) {
  const client = getPublicClient();
  return client.readContract({
    address: addresses.validationRegistry(),
    abi: VALIDATION_REGISTRY_ABI,
    functionName: "getAgentValidations",
    args: [agentId],
  }) as Promise<Hex[]>;
}

// --- GPU Provider Registry reads ---

const GPU_PROVIDER_REGISTRY_ABI = [
  {
    name: "getActiveProviders",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "active", type: "address[]" }],
  },
  {
    name: "getProvider",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [
      {
        components: [
          { name: "agentId", type: "uint256" },
          { name: "gpuModel", type: "string" },
          { name: "teeType", type: "string" },
          { name: "attestationHash", type: "bytes32" },
          { name: "registeredAt", type: "uint256" },
          { name: "active", type: "bool" },
        ],
        type: "tuple",
      },
    ],
  },
] as const;

export interface OnChainGPUProvider {
  address: string;
  agentId: string;
  gpuModel: string;
  teeType: string;
  registeredAt: number;
  active: boolean;
}

export async function getRegisteredProviders(): Promise<OnChainGPUProvider[]> {
  const client = getPublicClient();
  const registryAddr = addresses.gpuProviderRegistry();

  const activeAddrs = (await client.readContract({
    address: registryAddr,
    abi: GPU_PROVIDER_REGISTRY_ABI,
    functionName: "getActiveProviders",
  })) as readonly Address[];

  const providers = await Promise.all(
    activeAddrs.map(async (addr) => {
      const data = (await client.readContract({
        address: registryAddr,
        abi: GPU_PROVIDER_REGISTRY_ABI,
        functionName: "getProvider",
        args: [addr],
      })) as {
        agentId: bigint;
        gpuModel: string;
        teeType: string;
        attestationHash: string;
        registeredAt: bigint;
        active: boolean;
      };

      return {
        address: addr,
        agentId: data.agentId.toString(),
        gpuModel: data.gpuModel,
        teeType: data.teeType,
        registeredAt: Number(data.registeredAt),
        active: data.active,
      };
    }),
  );

  return providers;
}

// --- MockTEE validation submit ---

export async function submitMockTEEValidation(
  requestHash: Hex,
  response: number,
  responseURI: string,
  responseHash: Hex,
  tag: string,
  signature: Hex,
) {
  const wallet = getWalletClient();
  return wallet.writeContract({
    address: addresses.mockTEEValidator(),
    abi: MOCK_TEE_VALIDATOR_ABI,
    functionName: "validate",
    args: [requestHash, response, responseURI, responseHash, tag, signature],
  });
}
