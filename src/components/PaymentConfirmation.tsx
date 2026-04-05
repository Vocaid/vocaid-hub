'use client';

import { CheckCircle, ExternalLink, CircleDollarSign, Globe } from 'lucide-react';

export interface PaymentConfirmationProps {
  amount: string;
  txHash: string;
  hederaTxHash?: string;
  resourceName: string;
  onClose: () => void;
}

function hashscanUrl(txHash: string): string {
  const encoded = txHash.replace('@', '-');
  return `https://hashscan.io/testnet/transaction/${encoded}`;
}

function worldscanUrl(txHash: string): string {
  return `https://worldchain-sepolia.explorer.alchemy.com/tx/${txHash}`;
}

function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 12)}...${hash.slice(-6)}`;
}

export function PaymentConfirmation({
  amount,
  txHash,
  hederaTxHash,
  resourceName,
  onClose,
}: PaymentConfirmationProps) {
  const hasWorldTx = txHash && !txHash.startsWith('hedera');
  const hasHederaTx = !!hederaTxHash;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-[428px] rounded-t-2xl bg-white p-6 pb-10 flex flex-col gap-5 animate-slide-up">
        {/* Success icon */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-status-verified/10">
            <CheckCircle className="w-8 h-8 text-status-verified" />
          </div>
          <h2 className="text-xl font-bold text-primary">Payment Sent</h2>
          <p className="text-sm text-secondary">
            {resourceName} hired successfully
          </p>
        </div>

        {/* Details card */}
        <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary">Amount</span>
            <span className="text-sm font-semibold text-primary">{amount} USDC</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary">Gas</span>
            <span className="text-sm font-semibold text-status-verified">$0.00</span>
          </div>

          <div className="h-px bg-border-card" />

          {/* World Chain tx (MiniKit.pay) */}
          {hasWorldTx && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">World Chain</span>
              <span className="text-xs font-mono text-primary">{truncateHash(txHash)}</span>
            </div>
          )}

          {/* Hedera tx (x402 settlement) */}
          {hasHederaTx && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Hedera</span>
              <span className="text-xs font-mono text-primary">{truncateHash(hederaTxHash)}</span>
            </div>
          )}

          {/* If no World tx, show the single tx hash */}
          {!hasWorldTx && !hasHederaTx && txHash && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Tx Hash</span>
              <span className="text-xs font-mono text-primary">{truncateHash(txHash)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary">Settlement</span>
            <div className="flex gap-1.5">
              {hasWorldTx && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-chain-world/10 text-chain-world">
                  <Globe className="w-3 h-3" />
                  World
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-chain-hedera/10 text-chain-hedera">
                <CircleDollarSign className="w-3.5 h-3.5" />
                x402 Hedera
              </span>
            </div>
          </div>
        </div>

        {/* Explorer links */}
        <div className="flex flex-col gap-2">
          {hasWorldTx && (
            <a
              href={worldscanUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-border-card text-sm font-medium text-primary active:scale-95 transition-transform cursor-pointer"
            >
              View on World Explorer
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {hasHederaTx && (
            <a
              href={hashscanUrl(hederaTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-border-card text-sm font-medium text-primary active:scale-95 transition-transform cursor-pointer"
            >
              View on HashScan
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {!hasWorldTx && !hasHederaTx && txHash && (
            <a
              href={hashscanUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-border-card text-sm font-medium text-primary active:scale-95 transition-transform cursor-pointer"
            >
              View on HashScan
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        <button
          onClick={onClose}
          className="min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold active:scale-95 transition-transform"
        >
          Done
        </button>
      </div>
    </div>
  );
}
