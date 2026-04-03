'use client';

import { CheckCircle, ExternalLink, CircleDollarSign } from 'lucide-react';

export interface PaymentConfirmationProps {
  amount: string;
  txHash: string;
  resourceName: string;
  onClose: () => void;
}

function hashscanUrl(txHash: string): string {
  // Hedera tx format: 0.0.X@timestamp → hashscan uses 0.0.X-timestamp (dash-delimited)
  const encoded = txHash.replace('@', '-');
  return `https://hashscan.io/testnet/transaction/${encoded}`;
}

function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 12)}...${hash.slice(-6)}`;
}

export function PaymentConfirmation({
  amount,
  txHash,
  resourceName,
  onClose,
}: PaymentConfirmationProps) {
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

          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary">Tx Hash</span>
            <span className="text-xs font-mono text-primary">{truncateHash(txHash)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary">Settlement</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-chain-hedera/10 text-chain-hedera">
              <CircleDollarSign className="w-3.5 h-3.5" />
              x402 on Hedera
            </span>
          </div>
        </div>

        {/* Actions */}
        <a
          href={hashscanUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-border-card text-sm font-medium text-primary active:scale-95 transition-transform"
        >
          View on HashScan
          <ExternalLink className="w-4 h-4" />
        </a>

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
