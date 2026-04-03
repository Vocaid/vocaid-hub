import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// 0G Galileo testnet chain definition
const ogGalileo = {
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Explorer", url: "https://chainscan-galileo.0g.ai" },
  },
} as const;

// IdentityRegistry ABI — subset matching IIdentityRegistry.sol
const IDENTITY_REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentURI", type: "string" },
      {
        name: "metadata",
        type: "tuple[]",
        components: [
          { name: "metadataKey", type: "string" },
          { name: "metadataValue", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    name: "getMetadata",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "string" },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "getAgentWallet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "Registered",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const;

function getRegistryAddress(): Address {
  const addr = process.env.IDENTITY_REGISTRY;
  if (!addr) throw new Error("IDENTITY_REGISTRY env not set");
  return addr as Address;
}

export function getOGPublicClient() {
  return createPublicClient({
    chain: ogGalileo,
    transport: http(process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai"),
  });
}

function getOGWalletClient() {
  if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY not set");
  const account = privateKeyToAccount(
    `0x${process.env.PRIVATE_KEY.replace(/^0x/, "")}`,
  );
  return createWalletClient({
    account,
    chain: ogGalileo,
    transport: http(process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai"),
  });
}

function encodeStringToBytes(value: string): Hex {
  return `0x${Buffer.from(value, "utf-8").toString("hex")}` as Hex;
}

function decodeBytesToString(hex: Hex): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(clean, "hex").toString("utf-8");
}

export interface AgentRegistrationParams {
  agentURI: string;
  operatorWorldId: string; // nullifierHash from World ID verification
  role: string;
  agentkitId?: string;
}

export interface RegisteredAgent {
  agentId: bigint;
  owner: Address;
  agentURI: string;
  wallet: Address;
  operatorWorldId: string;
  role: string;
  type: string;
}

/**
 * Register an AI agent on 0G Chain via IdentityRegistry with ERC-8004 metadata.
 *
 * Every agent's metadata includes `operator_world_id` linking it back to the
 * verified human operator — this is what makes the World AgentKit track work.
 */
export async function registerAgent(
  params: AgentRegistrationParams,
): Promise<{ agentId: bigint; txHash: Hex }> {
  const { agentURI, operatorWorldId, role, agentkitId } = params;

  const metadata: Array<{ metadataKey: string; metadataValue: Hex }> = [
    {
      metadataKey: "operator_world_id",
      metadataValue: encodeStringToBytes(operatorWorldId),
    },
    { metadataKey: "role", metadataValue: encodeStringToBytes(role) },
    {
      metadataKey: "type",
      metadataValue: encodeStringToBytes("ai-agent"),
    },
  ];

  if (agentkitId) {
    metadata.push({
      metadataKey: "agentkit_id",
      metadataValue: encodeStringToBytes(agentkitId),
    });
  }

  const wallet = getOGWalletClient();
  const registry = getRegistryAddress();

  const txHash = await wallet.writeContract({
    address: registry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [agentURI, metadata],
  });

  const publicClient = getOGPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  // Extract agentId from the Registered event
  const registeredLog = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() === registry.toLowerCase() &&
      log.topics.length >= 2,
  );

  const agentId = registeredLog
    ? BigInt(registeredLog.topics[1]!)
    : BigInt(0);

  return { agentId, txHash };
}

/**
 * Read a single agent's details from the IdentityRegistry.
 */
export async function getAgent(agentId: bigint): Promise<RegisteredAgent> {
  const client = getOGPublicClient();
  const registry = getRegistryAddress();

  const [owner, agentURI, wallet, operatorWorldIdBytes, roleBytes, typeBytes] =
    await Promise.all([
      client.readContract({
        address: registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "ownerOf",
        args: [agentId],
      }),
      client.readContract({
        address: registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "tokenURI",
        args: [agentId],
      }),
      client.readContract({
        address: registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "getAgentWallet",
        args: [agentId],
      }),
      client.readContract({
        address: registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "getMetadata",
        args: [agentId, "operator_world_id"],
      }),
      client.readContract({
        address: registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "getMetadata",
        args: [agentId, "role"],
      }),
      client.readContract({
        address: registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "getMetadata",
        args: [agentId, "type"],
      }),
    ]);

  return {
    agentId,
    owner: owner as Address,
    agentURI: agentURI as string,
    wallet: wallet as Address,
    operatorWorldId: decodeBytesToString(operatorWorldIdBytes as Hex),
    role: decodeBytesToString(roleBytes as Hex),
    type: decodeBytesToString(typeBytes as Hex),
  };
}

/**
 * List all registered agents by scanning Registered events from the IdentityRegistry.
 */
export async function listRegisteredAgents(): Promise<RegisteredAgent[]> {
  const client = getOGPublicClient();
  const registry = getRegistryAddress();

  const logs = await client.getContractEvents({
    address: registry,
    abi: IDENTITY_REGISTRY_ABI,
    eventName: "Registered",
    fromBlock: BigInt(0),
    toBlock: "latest",
  });

  const agents: RegisteredAgent[] = [];

  for (const log of logs) {
    const agentId = (log as { args: { agentId: bigint } }).args.agentId;
    try {
      const agent = await getAgent(agentId);
      agents.push(agent);
    } catch {
      // Skip agents that may have been burned or are unreadable
    }
  }

  return agents;
}
