// TODO: Wire to @0glabs/0g-ts-sdk when available
// import { ethers } from "ethers";

const _OG_RPC_URL = // eslint-disable-line @typescript-eslint/no-unused-vars
  process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai";

/**
 * Minimal 0G Storage KV wrapper for agent state persistence.
 * Uses 0G's decentralized storage network for off-chain agent state
 * that's too large or too ephemeral for on-chain storage.
 */

export interface AgentState {
  agentId: string;
  key: string;
  value: string;
  updatedAt: number;
}

// In-memory fallback when 0G Storage SDK isn't available
const stateStore = new Map<string, AgentState>();

function stateKey(agentId: string, key: string): string {
  return `${agentId}:${key}`;
}

/**
 * Store agent state in 0G Storage.
 * Falls back to in-memory store if 0G Storage SDK unavailable.
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

  // TODO: Wire to @0glabs/0g-ts-sdk KV store when SDK is configured
  // const client = await getZGStorageClient();
  // await client.kv.put(stateKey(agentId, key), JSON.stringify(entry));

  stateStore.set(stateKey(agentId, key), entry);
}

/**
 * Retrieve agent state from 0G Storage.
 */
export async function getAgentState(
  agentId: string,
  key: string,
): Promise<AgentState | null> {
  // TODO: Wire to @0glabs/0g-ts-sdk KV store
  // const client = await getZGStorageClient();
  // const raw = await client.kv.get(stateKey(agentId, key));
  // return raw ? JSON.parse(raw) : null;

  return stateStore.get(stateKey(agentId, key)) ?? null;
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
