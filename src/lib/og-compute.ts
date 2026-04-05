// CJS import — @0glabs/0g-serving-broker ESM bundle broken on Node 24
// (dynamic import() bypasses tsx transform, hits native ESM loader which fails)
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const _require = createRequire(fileURLToPath(import.meta.url));
const { createZGComputeNetworkBroker } = _require('@0glabs/0g-serving-broker') as {
  createZGComputeNetworkBroker: (...args: unknown[]) => Promise<ZGComputeNetworkBroker>;
};
import { ethers } from 'ethers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZGComputeNetworkBroker = { inference: any };

// 0G testnet RPC
const OG_RPC_URL =
  process.env.NEXT_PUBLIC_OG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';

// Singleton broker instance (lazy-init)
let _broker: ZGComputeNetworkBroker | null = null;

export interface OGServiceInfo {
  provider: string;
  model: string;
  url: string;
  inputPrice: bigint;
  outputPrice: bigint;
  verifiability: string;
  teeSignerAcknowledged: boolean;
}

export interface OGServiceMetadata {
  endpoint: string;
  model: string;
}

export interface OGVerificationResult {
  success: boolean;
  teeVerifier: string;
  targetSeparated: boolean;
  verifierURL?: string;
  reportsGenerated: string[];
  outputDirectory: string;
}

/**
 * Initialize the 0G broker with a server-side wallet.
 * Uses NEXT_PUBLIC_OG_RPC_URL and OG_BROKER_PRIVATE_KEY env vars.
 */
async function getBroker(): Promise<ZGComputeNetworkBroker> {
  if (_broker) return _broker;

  const pk = process.env.OG_BROKER_PRIVATE_KEY;
  if (!pk) {
    throw new Error('OG_BROKER_PRIVATE_KEY not set');
  }

  const provider = new ethers.JsonRpcProvider(OG_RPC_URL);
  const wallet = new ethers.Wallet(pk, provider);

  _broker = await createZGComputeNetworkBroker(wallet as never);
  return _broker;
}

/**
 * List all available inference services on the 0G compute network.
 */
export async function listProviders(
  offset = 0,
  limit = 50,
): Promise<OGServiceInfo[]> {
  const broker = await getBroker();
  const services = await broker.inference.listService(offset, limit, true);

  return services.map((s) => ({
    provider: s.provider,
    model: s.model,
    url: s.url,
    inputPrice: s.inputPrice,
    outputPrice: s.outputPrice,
    verifiability: s.verifiability,
    teeSignerAcknowledged: s.teeSignerAcknowledged,
  }));
}

/**
 * Get metadata (endpoint + model) for a specific provider.
 */
export async function getProviderMetadata(
  providerAddress: string,
): Promise<OGServiceMetadata> {
  const broker = await getBroker();
  return broker.inference.getServiceMetadata(providerAddress);
}

/**
 * Verify a provider's TEE attestation via the 0G broker.
 * Returns attestation result including whether TEE is validated.
 */
export async function verifyProvider(
  providerAddress: string,
): Promise<OGVerificationResult> {
  const broker = await getBroker();
  const result = await broker.inference.verifyService(providerAddress);

  if (!result) {
    return {
      success: false,
      teeVerifier: 'unknown',
      targetSeparated: false,
      reportsGenerated: [],
      outputDirectory: '',
    };
  }

  return {
    success: result.success,
    teeVerifier: result.teeVerifier,
    targetSeparated: result.targetSeparated,
    verifierURL: result.verifierURL,
    reportsGenerated: result.reportsGenerated,
    outputDirectory: result.outputDirectory,
  };
}
