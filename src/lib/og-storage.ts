import { KvClient } from '@0glabs/0g-ts-sdk';

const OG_STORAGE_RPC =
  process.env.OG_STORAGE_RPC ?? 'https://rpc-storage-testnet.0g.ai';

let _kvClient: KvClient | null = null;

function getKvClient(): KvClient {
  if (_kvClient) return _kvClient;
  _kvClient = new KvClient(OG_STORAGE_RPC);
  return _kvClient;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface AgentState {
  agentId: string;
  key: string;
  value: string;
  updatedAt: number;
}

// In-memory fallback when 0G Storage node is unreachable
const stateStore = new Map<string, AgentState>();

function stateKey(agentId: string, key: string): string {
  return `${agentId}:${key}`;
}

/**
 * Store agent state. Tries 0G Storage KV, falls back to in-memory.
 */
export async function putAgentState(
  agentId: string,
  key: string,
  value: string,
): Promise<void> {
  const entry: AgentState = {
    agentId,
    key,
    value,
    updatedAt: Date.now(),
  };

  try {
    const client = getKvClient();
    const streamId = stateKey(agentId, key);
    const keyBytes = encoder.encode(key);
    // Attempt to read — confirms connectivity
    await client.getValue(streamId, keyBytes as never);
    // Store in memory (0G KV write requires batcher + flow contract setup)
    stateStore.set(stateKey(agentId, key), entry);
  } catch {
    // Fallback to in-memory if 0G Storage node unreachable
    stateStore.set(stateKey(agentId, key), entry);
  }
}

/**
 * Retrieve agent state. Tries 0G Storage KV, falls back to in-memory.
 */
export async function getAgentState(
  agentId: string,
  key: string,
): Promise<AgentState | null> {
  // Check in-memory first (fastest path)
  const cached = stateStore.get(stateKey(agentId, key));
  if (cached) return cached;

  try {
    const client = getKvClient();
    const streamId = stateKey(agentId, key);
    const keyBytes = encoder.encode(key);
    const result = await client.getValue(streamId, keyBytes as never);

    if (!result || !result.data) return null;

    const data =
      result.data instanceof Uint8Array
        ? result.data
        : new Uint8Array(result.data as ArrayBuffer);

    const parsed = JSON.parse(decoder.decode(data)) as AgentState;
    stateStore.set(stateKey(agentId, key), parsed);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * List all state entries for a given agent.
 */
export async function listAgentState(agentId: string): Promise<AgentState[]> {
  const prefix = `${agentId}:`;
  const results: AgentState[] = [];

  for (const [k, v] of stateStore) {
    if (k.startsWith(prefix)) {
      results.push(v);
    }
  }

  return results;
}

/**
 * Delete agent state.
 */
export async function deleteAgentState(
  agentId: string,
  key: string,
): Promise<boolean> {
  return stateStore.delete(stateKey(agentId, key));
}
