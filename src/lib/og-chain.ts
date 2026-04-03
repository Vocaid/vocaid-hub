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

  if (clients.length === 0) return { count: 0n, summaryValue: 0n, decimals: 0 };

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
