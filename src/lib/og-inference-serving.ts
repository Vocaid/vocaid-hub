import { ethers } from 'ethers';

const INFERENCE_SERVING_ADDRESS = '0xa79F4c8311FF93C06b8CfB403690cc987c93F91E';
const OG_RPC = process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai';

const EVENTS_ABI = [
  'event BalanceUpdated(address indexed user, address indexed provider, uint256 amount, uint256 pendingRefund)',
  'event RefundRequested(address indexed user, address indexed provider, uint256 indexed index, uint256 timestamp)',
  'event ServiceUpdated(address indexed service, string serviceType, string url, uint256 inputPrice, uint256 outputPrice, uint256 updatedAt, string model, string verifiability)',
];

const SERVICE_ABI = [
  'function getService(address) view returns (tuple(address provider, string serviceType, string url, uint256 inputPrice, uint256 outputPrice, uint256 updatedAt, string model, string verifiability, string additionalInfo))',
];

export interface ProviderActivity {
  address: string;
  txCount: number;
  uniqueClients: number;
  totalVolume: bigint;
  refundCount: number;
  firstSeenBlock: number | null;
}

export interface ProviderService {
  provider: string;
  model: string;
  url: string;
  inputPrice: bigint;
  outputPrice: bigint;
  verifiability: string;
  updatedAt: number;
}

function getProvider() {
  return new ethers.JsonRpcProvider(OG_RPC);
}

/**
 * Scan BalanceUpdated + RefundRequested + ServiceUpdated events
 * across `blockRange` blocks to build provider activity profiles.
 */
export async function scanProviderActivity(blockRange = 2_000_000): Promise<Map<string, ProviderActivity>> {
  const provider = getProvider();
  const iface = new ethers.Interface(EVENTS_ABI);
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - blockRange);

  const providers = new Map<string, ProviderActivity & { _clients: Set<string> }>();
  const CHUNK = 500_000;

  for (let from = fromBlock; from < currentBlock; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, currentBlock);

    // BalanceUpdated events
    const balLogs = await provider.getLogs({
      address: INFERENCE_SERVING_ADDRESS,
      topics: [iface.getEvent('BalanceUpdated')!.topicHash],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of balLogs) {
      const parsed = iface.parseLog(log)!;
      const addr = parsed.args.provider as string;
      if (!providers.has(addr)) {
        providers.set(addr, {
          address: addr, txCount: 0, uniqueClients: 0,
          totalVolume: 0n, refundCount: 0, firstSeenBlock: null,
          _clients: new Set(),
        });
      }
      const entry = providers.get(addr)!;
      entry.txCount++;
      entry.totalVolume += parsed.args.amount as bigint;
      entry._clients.add(parsed.args.user as string);
    }

    // RefundRequested events
    const refLogs = await provider.getLogs({
      address: INFERENCE_SERVING_ADDRESS,
      topics: [iface.getEvent('RefundRequested')!.topicHash],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of refLogs) {
      const parsed = iface.parseLog(log)!;
      const addr = parsed.args.provider as string;
      if (providers.has(addr)) {
        providers.get(addr)!.refundCount++;
      }
    }

    // ServiceUpdated events (for firstSeenBlock)
    const svcLogs = await provider.getLogs({
      address: INFERENCE_SERVING_ADDRESS,
      topics: [iface.getEvent('ServiceUpdated')!.topicHash],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of svcLogs) {
      const parsed = iface.parseLog(log)!;
      const addr = parsed.args.service as string;
      if (providers.has(addr) && !providers.get(addr)!.firstSeenBlock) {
        providers.get(addr)!.firstSeenBlock = log.blockNumber;
      }
    }
  }

  // Finalize: convert Set sizes and strip internal field
  const result = new Map<string, ProviderActivity>();
  for (const [addr, entry] of providers) {
    result.set(addr, {
      address: entry.address,
      txCount: entry.txCount,
      uniqueClients: entry._clients.size,
      totalVolume: entry.totalVolume,
      refundCount: entry.refundCount,
      firstSeenBlock: entry.firstSeenBlock,
    });
  }

  return result;
}

/**
 * Get service metadata for a provider (model, pricing, TEE).
 * Returns null if provider has no active service.
 */
export async function getProviderService(address: string): Promise<ProviderService | null> {
  const provider = getProvider();
  const contract = new ethers.Contract(INFERENCE_SERVING_ADDRESS, SERVICE_ABI, provider);
  try {
    const s = await contract.getService(address);
    return {
      provider: s.provider,
      model: s.model,
      url: s.url,
      inputPrice: s.inputPrice,
      outputPrice: s.outputPrice,
      verifiability: s.verifiability,
      updatedAt: Number(s.updatedAt),
    };
  } catch {
    return null;
  }
}

/**
 * List currently active services via broker SDK.
 */
export async function listActiveServices(): Promise<ProviderService[]> {
  const provider = getProvider();
  const { createZGComputeNetworkBroker } = await import('@0glabs/0g-serving-broker');
  const signer = new ethers.Wallet(
    '0x0000000000000000000000000000000000000000000000000000000000000001',
    provider,
  );
  const broker = await createZGComputeNetworkBroker(signer);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const services = await broker.inference.listService() as any[];
  return services.map((s) => ({
    provider: s.provider,
    model: s.model || '',
    url: s.url || '',
    inputPrice: s.inputPrice ?? 0n,
    outputPrice: s.outputPrice ?? 0n,
    verifiability: s.verifiability || '',
    updatedAt: 0,
  }));
}
