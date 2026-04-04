'use client';

import { Bot, Cpu, Loader2, User, Zap } from 'lucide-react';
import { ChainBadge, type Chain } from './ChainBadge';
import { ReputationBar } from './ReputationBar';
import { VerificationStatus, type VerificationType } from './VerificationStatus';
import type { ResourceSignals } from './ReputationSignals';

export type ResourceType = 'human' | 'gpu' | 'agent' | 'depin';

export interface ResourceCardProps {
  type: ResourceType;
  name: string;
  reputation: number;
  verified: boolean;
  chain: Chain;
  price: string;
  verificationType?: VerificationType;
  subtitle?: string;
  signals?: ResourceSignals;
  onHire?: (resource: { name: string; price: string; type: ResourceType }) => void;
  hiring?: boolean;
}

const typeConfig: Record<ResourceType, { icon: typeof Cpu; label: string }> = {
  gpu: { icon: Cpu, label: 'GPU' },
  agent: { icon: Bot, label: 'Agent' },
  human: { icon: User, label: 'Human' },
  depin: { icon: Zap, label: 'DePIN' },
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
  hiring,
}: ResourceCardProps) {
  const { icon: TypeIcon, label } = typeConfig[type];

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 shadow-sm ${
      verified
        ? 'border-border-card bg-surface'
        : 'border-status-inactive/30 bg-surface/80 opacity-75'
    }`}>
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
        {verified ? (
          <button
            onClick={() => onHire?.({ name, price, type })}
            disabled={hiring}
            className={`min-h-11 min-w-11 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              hiring
                ? 'bg-primary/60 text-white/80 cursor-wait'
                : 'bg-primary text-white cursor-pointer active:scale-95'
            }`}
          >
            {hiring ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                Paying...
              </span>
            ) : (
              `Lease ${price}`
            )}
          </button>
        ) : (
          <span
            className="min-h-11 min-w-11 px-4 py-2 rounded-full bg-status-inactive/20 text-status-inactive text-sm font-semibold flex items-center"
            title="Provider has not passed Shield verification"
          >
            Unverified
          </span>
        )}
      </div>
    </div>
  );
}
