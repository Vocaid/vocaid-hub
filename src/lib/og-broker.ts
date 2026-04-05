// CJS import — @0glabs/0g-serving-broker ESM bundle broken on Node 24
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const _require = createRequire(fileURLToPath(import.meta.url));
const { createZGComputeNetworkBroker } = _require('@0glabs/0g-serving-broker') as {
  createZGComputeNetworkBroker: (...args: unknown[]) => Promise<ZGComputeNetworkBroker>;
};
import { ethers } from 'ethers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZGComputeNetworkBroker = { inference: any };
import { fetchWithTimeout, TIMEOUT_BUDGETS } from '../../server/utils/fetch-with-timeout';

const OG_RPC_URL =
  process.env.NEXT_PUBLIC_OG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';

let _broker: ZGComputeNetworkBroker | null = null;

async function getBroker(): Promise<ZGComputeNetworkBroker> {
  if (_broker) return _broker;

  const pk = process.env.OG_BROKER_PRIVATE_KEY;
  if (!pk) throw new Error('OG_BROKER_PRIVATE_KEY not set');

  const provider = new ethers.JsonRpcProvider(OG_RPC_URL);
  const wallet = new ethers.Wallet(pk, provider);
  _broker = await createZGComputeNetworkBroker(wallet as never);
  return _broker;
}

export interface InferenceRequest {
  providerAddress: string;
  content: string;
}

export interface InferenceResult {
  response: string;
  chatID: string;
  verified: boolean | null;
  headers: Record<string, string>;
}

/**
 * Get billing headers for an inference request.
 * These headers serve as settlement proof in the 0G Serving system.
 */
export async function getRequestHeaders(
  providerAddress: string,
  content: string,
): Promise<Record<string, string>> {
  const broker = await getBroker();
  return broker.inference.getRequestHeaders(
    providerAddress,
    content,
  ) as unknown as Promise<Record<string, string>>;
}

/**
 * Process and verify a provider's inference response.
 * Settles the fee and optionally verifies the response signature.
 */
export async function processResponse(
  providerAddress: string,
  chatID?: string,
  content?: string,
): Promise<boolean | null> {
  const broker = await getBroker();
  return broker.inference.processResponse(providerAddress, chatID, content);
}

/**
 * Full inference call: get headers → call provider → process response.
 * Used by Seer agent for AI signal analysis.
 */
export async function callInference(
  providerAddress: string,
  prompt: string,
): Promise<InferenceResult> {
  const broker = await getBroker();

  const { endpoint, model } = await broker.inference.getServiceMetadata(
    providerAddress,
  );

  const headers = await broker.inference.getRequestHeaders(
    providerAddress,
    prompt,
  );

  // Call the provider's OpenAI-compatible endpoint
  const res = await fetchWithTimeout(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers as unknown as Record<string, string>),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
    timeout: TIMEOUT_BUDGETS.OG_INFERENCE,
  });

  if (!res.ok) {
    throw new Error(`Inference failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    id: string;
    choices: { message: { content: string } }[];
  };

  const responseText = data.choices?.[0]?.message?.content ?? '';
  const chatID = data.id ?? '';

  // Verify and settle
  const verified = await broker.inference.processResponse(
    providerAddress,
    chatID,
    responseText,
  );

  return {
    response: responseText,
    chatID,
    verified,
    headers: headers as unknown as Record<string, string>,
  };
}

/**
 * Check if a provider's TEE signer has been acknowledged.
 */
export async function checkProviderStatus(
  providerAddress: string,
): Promise<{ isAcknowledged: boolean; teeSignerAddress: string }> {
  const broker = await getBroker();
  return broker.inference.checkProviderSignerStatus(providerAddress);
}
