/**
 * Singleton chain client factories with RPC fallback.
 * Initialize once at server startup, reuse across all request handlers.
 *
 * RPC priority: dRPC (fastest ~124ms) → Official 0G → ThirdWeb (backup)
 * Configurable via OG_RPC_URL, OG_RPC_FALLBACK_1, OG_RPC_FALLBACK_2 env vars.
 */

import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, fallback, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ── RPC endpoints (ordered by priority) ──

const OG_RPC_PRIMARY = process.env.OG_RPC_URL ?? 'https://0g-galileo-testnet.drpc.org';
const OG_RPC_FALLBACK_1 = process.env.OG_RPC_FALLBACK_1 ?? 'https://evmrpc-testnet.0g.ai';
const OG_RPC_FALLBACK_2 = process.env.OG_RPC_FALLBACK_2 ?? 'https://16602.rpc.thirdweb.com';

const OG_RPC_URLS = [OG_RPC_PRIMARY, OG_RPC_FALLBACK_1, OG_RPC_FALLBACK_2];

// 0G Galileo chain definition
export const ogGalileo = {
  id: 16602,
  name: '0G Galileo Testnet',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: { default: { http: OG_RPC_URLS } },
  blockExplorers: { default: { name: '0G Explorer', url: 'https://chainscan-galileo.0g.ai' } },
} as const;

// ── ethers (for prediction markets, GPU registry, proposals) ──

let _ogProvider: ethers.FallbackProvider | null = null;

/**
 * Singleton ethers FallbackProvider for 0G Galileo.
 * Tries dRPC first (priority 1), falls back to official then ThirdWeb.
 * stallTimeout = how long to wait before trying next provider.
 */
export function getOgProvider(): ethers.FallbackProvider {
  if (!_ogProvider) {
    _ogProvider = new ethers.FallbackProvider(
      OG_RPC_URLS.map((url, i) => ({
        provider: new ethers.JsonRpcProvider(url),
        priority: i + 1,
        stallTimeout: 3000 + i * 2000, // 3s, 5s, 7s
        weight: 1,
      })),
      16602,
      { quorum: 1 }, // Accept first successful response (no consensus needed for testnet)
    );
  }
  return _ogProvider;
}

/** Create ethers signer (wallet) using the primary RPC (writes go to fastest). */
export function getOgSigner(): ethers.Wallet {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY not set');
  // Signer uses primary RPC directly — FallbackProvider doesn't support signing
  return new ethers.Wallet(pk, new ethers.JsonRpcProvider(OG_RPC_PRIMARY));
}

// ── viem (for ERC-8004 registries, reputation, validation) ──

let _viemPublicClient: ReturnType<typeof createPublicClient> | null = null;

/**
 * Singleton viem PublicClient with fallback transport.
 * Tries RPCs in order, auto-switches on failure.
 */
export function getViemPublicClient() {
  if (!_viemPublicClient) {
    _viemPublicClient = createPublicClient({
      chain: ogGalileo,
      transport: fallback(
        OG_RPC_URLS.map((url) => http(url, { timeout: 10_000 })),
      ),
    });
  }
  return _viemPublicClient;
}

/** Create viem WalletClient with PRIVATE_KEY + fallback transport. */
export function getViemWalletClient() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY not set');
  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, '')}` as Hex);
  return createWalletClient({
    account,
    chain: ogGalileo,
    transport: fallback(
      OG_RPC_URLS.map((url) => http(url, { timeout: 10_000 })),
    ),
  });
}
