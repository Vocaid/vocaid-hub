/**
 * Chain-agnostic settlement resolver.
 *
 * Users always pay USDC via MiniKit on World Chain.
 * This middleware resolves settlement to the destination chain:
 * - Hedera: x402 USDC via Blocky402 (leases, resource payments)
 * - 0G: deployer wallet places native A0GI tx (prediction bets)
 * - World: direct USDC transfer (future)
 *
 * Deployer wallet funds native token operations — no bridges.
 */

import { ethers } from 'ethers';
import { verifyPayment, settlePayment } from '@/lib/blocky402';
import { logAuditMessage } from '@/lib/hedera';
import { getOgSigner } from '../clients.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SettlementChain = '0g' | 'hedera' | 'world';

export interface SettlementRequest {
  chain: SettlementChain;
  action: 'bet' | 'lease' | 'register';
  usdcAmount: string;
  metadata: Record<string, unknown>;
}

export interface SettlementResult {
  txHash: string;
  chain: SettlementChain;
  settledAmount: string;
  settledCurrency: string;
}

// ---------------------------------------------------------------------------
// Chain-specific settlers
// ---------------------------------------------------------------------------

/** Hedera: verify + settle via x402/Blocky402 */
async function settleHedera(req: SettlementRequest): Promise<SettlementResult> {
  const paymentHeader = req.metadata.paymentHeader as string;
  if (!paymentHeader) throw new Error('Missing x-payment header for Hedera settlement');

  const verification = await verifyPayment(paymentHeader);
  if (!verification.valid) throw new Error('Hedera payment verification failed');

  const settlement = await settlePayment(paymentHeader);

  return {
    txHash: settlement.txHash,
    chain: 'hedera',
    settledAmount: verification.amount,
    settledCurrency: 'USDC',
  };
}

/** 0G: deployer wallet places tx with native A0GI */
async function settle0G(req: SettlementRequest): Promise<SettlementResult> {
  const { contractAddress, abi, functionName, args, value } = req.metadata as {
    contractAddress: string;
    abi: ethers.InterfaceAbi;
    functionName: string;
    args: unknown[];
    value?: string; // ETH/A0GI in ether units
  };

  const signer = getOgSigner();
  const contract = new ethers.Contract(contractAddress, abi, signer);

  const txOptions = value ? { value: ethers.parseEther(value) } : {};
  const tx = await contract[functionName](...args, txOptions);

  const receipt = await Promise.race([
    tx.wait(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('0G tx confirmation timed out')), 60_000),
    ),
  ]);

  return {
    txHash: receipt!.hash,
    chain: '0g',
    settledAmount: value ?? '0',
    settledCurrency: 'A0GI',
  };
}

/** World: placeholder for future direct World Chain settlement */
async function settleWorld(_req: SettlementRequest): Promise<SettlementResult> {
  throw new Error('World Chain settlement not yet implemented');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function settle(req: SettlementRequest): Promise<SettlementResult> {
  switch (req.chain) {
    case 'hedera': return settleHedera(req);
    case '0g':     return settle0G(req);
    case 'world':  return settleWorld(req);
  }
}

// ---------------------------------------------------------------------------
// HCS audit helper (shared by all chains)
// ---------------------------------------------------------------------------

export async function logSettlement(
  result: SettlementResult,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const topicId = process.env.HEDERA_AUDIT_TOPIC;
  if (!topicId) return;

  try {
    await logAuditMessage(topicId, JSON.stringify({
      event: 'settlement_completed',
      chain: result.chain,
      txHash: result.txHash,
      amount: result.settledAmount,
      currency: result.settledCurrency,
      ...extra,
      timestamp: new Date().toISOString(),
    }));
  } catch { /* non-blocking */ }
}
