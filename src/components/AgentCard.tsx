'use client';

import { Bot, Shield, Eye, TrendingUp } from 'lucide-react';
import { ChainBadge } from './ChainBadge';
import { ReputationBar } from './ReputationBar';
import { VerificationStatus } from './VerificationStatus';

export type AgentRole = 'signal-analyst' | 'market-maker' | 'risk-manager' | 'discovery';

export interface AgentCardProps {
  name: string;
  role: AgentRole;
  agentId: string;
  operatorWorldId: string;
  reputation: number;
  verified: boolean;
  onSelect?: (agentId: string) => void;
}

const roleConfig: Record<AgentRole, { icon: typeof Bot; label: string; color: string }> = {
  'signal-analyst': { icon: Eye, label: 'Signal Analyst', color: 'text-primary-accent' },
  'market-maker': { icon: TrendingUp, label: 'Market Maker', color: 'text-chain-og' },
  'risk-manager': { icon: Shield, label: 'Risk Manager', color: 'text-chain-hedera' },
  'discovery': { icon: Bot, label: 'Discovery', color: 'text-primary-accent' },
};

export function AgentCard({
  name,
  role,
  agentId,
  operatorWorldId,
  reputation,
  verified,
  onSelect,
}: AgentCardProps) {
  const { icon: RoleIcon, label, color } = roleConfig[role] || roleConfig['discovery'];

  return (
    <button
      onClick={() => onSelect?.(agentId)}
      className="w-full rounded-xl border border-border-card bg-surface p-4 text-left transition-colors hover:border-primary-accent/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg bg-surface p-2 ${color}`}>
            <RoleIcon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">{name}</h3>
            <p className="text-sm text-secondary">{label}</p>
          </div>
        </div>
        <ChainBadge chain="0g" />
      </div>

      <div className="mt-3 space-y-2">
        <ReputationBar score={reputation} />
        <div className="flex items-center justify-between">
          <VerificationStatus
            verified={verified}
            type="world-id"
          />
          <span className="text-xs text-secondary">
            ERC-8004 #{agentId}
          </span>
        </div>
        {operatorWorldId && operatorWorldId !== 'pending-verification' && (
          <p className="truncate text-xs text-secondary">
            Operator: {operatorWorldId.slice(0, 10)}...
          </p>
        )}
      </div>
    </button>
  );
}
