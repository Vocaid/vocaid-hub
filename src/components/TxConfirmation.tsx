'use client';

import { CheckCircle, ExternalLink, CircleDollarSign, Globe, Cpu } from 'lucide-react';

export interface TxConfirmationProps {
  title: string;
  subtitle: string;
  amount?: string;
  chain: 'world' | '0g' | 'hedera';
  txHash: string;
  worldTxHash?: string;
  onClose: () => void;
}

const EXPLORERS: Record<string, { name: string; url: (hash: string) => string }> = {
  '0g': {
    name: '0G Explorer',
    url: (hash) => `https://chainscan-galileo.0g.ai/tx/${hash}`,
  },
  hedera: {
    name: 'HashScan',
    url: (hash) => `https://hashscan.io/testnet/transaction/${hash.replace('@', '-')}`,
  },
  world: {
    name: 'Worldscan',
    url: (hash) => `https://worldscan.org/tx/${hash}`,
  },
};

const CHAIN_LABELS: Record<string, { label: string; color: string; Icon: typeof Cpu }> = {
  '0g':     { label: '0G Galileo',  color: 'chain-og',     Icon: Cpu },
  hedera:   { label: 'Hedera',      color: 'chain-hedera', Icon: CircleDollarSign },
  world:    { label: 'World Chain', color: 'chain-world',  Icon: Globe },
};

function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 12)}...${hash.slice(-6)}`;
}

/** Returns true only for hashes that came from a real on-chain tx */
function isRealTxHash(hash: string | undefined): hash is string {
  if (!hash || hash.length < 10) return false;
  // Filter out mock IDs like "lease-1234", payment UUIDs, and empty strings
  if (/^(lease-|hire-|bet-)/.test(hash)) return false;
  // Must look like an EVM 0x hash or a Hedera timestamp (0.0.xxx@...)
  return hash.startsWith('0x') || hash.includes('@') || hash.includes('0.0.');
}

export function TxConfirmation({
  title,
  subtitle,
  amount,
  chain,
  txHash,
  worldTxHash,
  onClose,
}: TxConfirmationProps) {
  const explorer = EXPLORERS[chain];
  const chainInfo = CHAIN_LABELS[chain];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[428px] rounded-2xl bg-white p-6 flex flex-col gap-5 animate-scale-in">
        {/* Success icon */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-status-verified/10">
            <CheckCircle className="w-8 h-8 text-status-verified" />
          </div>
          <h2 className="text-xl font-bold text-primary">{title}</h2>
          <p className="text-sm text-secondary">{subtitle}</p>
        </div>

        {/* Details card */}
        <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
          {amount && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Amount</span>
              <span className="text-sm font-semibold text-primary">{amount}</span>
            </div>
          )}

          {/* World Chain tx (if USDC transfer happened — skip when settlement IS World) */}
          {worldTxHash && chain !== 'world' && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">World Chain</span>
              <span className="text-xs font-mono text-primary">{truncateHash(worldTxHash)}</span>
            </div>
          )}

          {/* Settlement chain tx */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary">{chainInfo?.label ?? chain}</span>
            <span className="text-xs font-mono text-primary">{truncateHash(txHash)}</span>
          </div>

          <div className="h-px bg-border-card" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary">Settlement</span>
            <div className="flex gap-1.5">
              {worldTxHash && chain !== 'world' && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-chain-world/10 text-chain-world">
                  <Globe className="w-3 h-3" />
                  World
                </span>
              )}
              {chainInfo && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-${chainInfo.color}/10 text-${chainInfo.color}`}>
                  <chainInfo.Icon className="w-3 h-3" />
                  {chainInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Explorer links — only for real on-chain hashes */}
        <div className="flex flex-col gap-2">
          {isRealTxHash(worldTxHash) && chain !== 'world' && (
            <a
              href={EXPLORERS.world.url(worldTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 min-h-11 rounded-lg border border-border-card text-sm font-medium text-primary active:scale-95 transition-transform"
            >
              View on Worldscan
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {explorer && isRealTxHash(txHash) && (
            <a
              href={explorer.url(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 min-h-11 rounded-lg border border-border-card text-sm font-medium text-primary active:scale-95 transition-transform"
            >
              View on {explorer.name}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        <button
          onClick={onClose}
          className="min-h-11 rounded-lg bg-primary-accent text-white text-sm font-semibold active:scale-95 transition-transform"
        >
          Done
        </button>
      </div>
    </div>
  );
}
