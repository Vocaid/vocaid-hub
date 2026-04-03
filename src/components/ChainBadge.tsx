'use client';

import { CircleDollarSign, Globe, Zap } from 'lucide-react';

export type Chain = 'world' | '0g' | 'hedera';

const chainConfig: Record<Chain, { label: string; icon: typeof Globe; colorClass: string }> = {
  world: { label: 'World', icon: Globe, colorClass: 'bg-chain-world/10 text-chain-world' },
  '0g': { label: '0G', icon: Zap, colorClass: 'bg-chain-og/10 text-chain-og' },
  hedera: { label: 'Hedera', icon: CircleDollarSign, colorClass: 'bg-chain-hedera/10 text-chain-hedera' },
};

export function ChainBadge({ chain }: { chain: Chain }) {
  const { label, icon: Icon, colorClass } = chainConfig[chain];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
