import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { worldchainSepolia } from "viem/chains";

// ABI subset for CredentialGate
const CREDENTIAL_GATE_ABI = [
  {
    name: "verifyAndRegister",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "signal", type: "address" },
      { name: "root", type: "uint256" },
      { name: "nullifierHash", type: "uint256" },
      { name: "proof", type: "uint256[8]" },
    ],
    outputs: [],
  },
  {
    name: "isVerified",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_addr", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "nullifierHashes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function getGateAddress(): Address {
  const addr = process.env.CREDENTIAL_GATE?.trim();
  if (!addr) throw new Error("CREDENTIAL_GATE env not set");
  return addr as Address;
}

export function getPublicClient() {
  return createPublicClient({
    chain: worldchainSepolia,
    transport: http(process.env.WORLD_RPC_URL),
  });
}

function getWalletClient() {
  if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY not set");
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY.replace(/^0x/, "")}`);
  return createWalletClient({
    account,
    chain: worldchainSepolia,
    transport: http(process.env.WORLD_RPC_URL),
  });
}

/** Call verifyAndRegister on CredentialGate after World API verification */
export async function registerOnChain(
  signal: Address,
  root: bigint,
  nullifierHash: bigint,
  proof: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint],
) {
  const wallet = getWalletClient();
  const hash = await wallet.writeContract({
    address: getGateAddress(),
    abi: CREDENTIAL_GATE_ABI,
    functionName: "verifyAndRegister",
    args: [signal, root, nullifierHash, proof],
  });
  const publicClient = getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: hash, blockNumber: receipt.blockNumber };
}

// --- In-memory verification cache (15s TTL) ---
const verificationCache = new Map<string, { verified: boolean; expires: number }>();
const CACHE_TTL = 15_000;

/** Clear a specific address from the verification cache */
export function clearVerificationCache(address: string) {
  verificationCache.delete(address.toLowerCase());
}

/** Check if an address is verified on-chain (cached) */
export async function isVerifiedOnChain(address: Address): Promise<boolean> {
  const key = address.toLowerCase();
  const cached = verificationCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.verified;

  const client = getPublicClient();
  const verified = await client.readContract({
    address: getGateAddress(),
    abi: CREDENTIAL_GATE_ABI,
    functionName: "isVerified",
    args: [address],
  });

  verificationCache.set(key, { verified, expires: Date.now() + CACHE_TTL });
  return verified;
}

