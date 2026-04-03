'use client';

import { Bot, Cpu, User } from 'lucide-react';
import { ChainBadge, type Chain } from './ChainBadge';
import { ReputationBar } from './ReputationBar';
import { VerificationStatus, type VerificationType } from './VerificationStatus';

export type ResourceType = 'human' | 'gpu' | 'agent';

export interface ResourceCardProps {
  type: ResourceType;
  name: string;
  reputation: number;
  verified: boolean;
  chain: Chain;
  price: string;
  verificationType?: VerificationType;
  subtitle?: string;
  onHire?: (resource: { name: string; price: string; type: ResourceType }) => void;
}

const typeConfig: Record<ResourceType, { icon: typeof Cpu; label: string }> = {
  gpu: { icon: Cpu, label: 'GPU' },
  agent: { icon: Bot, label: 'Agent' },
  human: { icon: User, label: 'Human' },
};

export function ResourceCard({
  type,
  name,
  reputation,
  verified,
  chain,
  price,
  verificationType,
  subtitle,
  onHire,
}: ResourceCardProps) {
  const { icon: TypeIcon, label } = typeConfig[type];

  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/5 shrink-0">
            <TypeIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-primary truncate">{name}</h3>
            {subtitle && (
              <p className="text-xs text-secondary truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <ChainBadge chain={chain} />
      </div>

      {/* Reputation */}
      <ReputationBar score={reputation} />

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary capitalize">{label}</span>
          <VerificationStatus verified={verified} type={verificationType} />
        </div>
        <button
          onClick={() => onHire?.({ name, price, type })}
          className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg bg-primary-accent text-white text-sm font-semibold active:scale-95 transition-transform"
        >
          Hire {price}
        </button>
      </div>
    </div>
  );
}
