/**
 * Singleton chain client factories.
 * Initialize once at server startup, reuse across all request handlers.
 * Eliminates per-request provider creation overhead.
 */

import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// 0G Galileo chain definition
export const ogGalileo = {
  id: 16602,
  name: '0G Galileo Testnet',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: { default: { http: [process.env.OG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai'] } },
  blockExplorers: { default: { name: '0G Explorer', url: 'https://chainscan-galileo.0g.ai' } },
} as const;

const OG_RPC_URL = process.env.OG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';

// ── ethers (for prediction markets, GPU registry, proposals) ──

let _ogProvider: ethers.JsonRpcProvider | null = null;

/** Singleton ethers JsonRpcProvider for 0G Galileo. */
export function getOgProvider(): ethers.JsonRpcProvider {
  if (!_ogProvider) {
    _ogProvider = new ethers.JsonRpcProvider(OG_RPC_URL);
  }
  return _ogProvider;
}

/** Create ethers signer (wallet) using the shared provider. */
export function getOgSigner(): ethers.Wallet {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY not set');
  return new ethers.Wallet(pk, getOgProvider());
}

// ── viem (for ERC-8004 registries, reputation, validation) ──

let _viemPublicClient: ReturnType<typeof createPublicClient> | null = null;

/** Singleton viem PublicClient for 0G Galileo reads. */
export function getViemPublicClient() {
  if (!_viemPublicClient) {
    _viemPublicClient = createPublicClient({
      chain: ogGalileo,
      transport: http(OG_RPC_URL),
    });
  }
  return _viemPublicClient;
}

/** Create viem WalletClient with PRIVATE_KEY. */
export function getViemWalletClient() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY not set');
  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, '')}` as Hex);
  return createWalletClient({
    account,
    chain: ogGalileo,
    transport: http(OG_RPC_URL),
  });
}
