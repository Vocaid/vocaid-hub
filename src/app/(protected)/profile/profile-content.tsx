'use client';

import { Globe, ShieldCheck, Zap, Eye, TrendingUp, Search, Bot } from 'lucide-react';
import { ChainBadge } from '@/components/ChainBadge';

interface AgentData {
  agentId: string;
  role: string;
  type: string;
  operatorWorldId: string;
}

interface ProfileContentProps {
  username: string;
  walletAddress?: string;
  agents: AgentData[];
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Eye; description: string }> = {
  'signal-analyst': { label: 'Seer', icon: Eye, description: 'Signal Analysis' },
  'market-maker': { label: 'Edge', icon: TrendingUp, description: 'Market Pricing' },
  'risk-manager': { label: 'Shield', icon: ShieldCheck, description: 'Risk Management' },
  'discovery': { label: 'Lens', icon: Search, description: 'Monitoring' },
};

function truncateAddress(addr?: string): string {
  if (!addr) return '—';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ProfileContent({ username, walletAddress, agents }: ProfileContentProps) {
  return (
    <>
      {/* Identity card */}
      <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-chain-world/10">
            <Globe className="w-5 h-5 text-chain-world" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary capitalize">{username}</p>
            <p className="text-xs font-mono text-secondary">{truncateAddress(walletAddress)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-status-verified/10 text-status-verified">
            <ShieldCheck className="w-3.5 h-3.5" />
            World ID Verified
          </span>
          <span className="text-xs text-secondary">ERC-8004 ID: #1</span>
        </div>
      </div>

      {/* Agent fleet header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary">My Agent Fleet</h2>
        <span className="text-xs text-secondary">{agents.length} agents</span>
      </div>

      {/* Agent cards */}
      <div className="flex flex-col gap-3">
        {agents.map((agent) => {
          const config = ROLE_CONFIG[agent.role] ?? {
            label: agent.role,
            icon: Bot,
            description: agent.type,
          };
          const RoleIcon = config.icon;

          return (
            <div
              key={agent.agentId}
              className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-2.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-chain-og/10 shrink-0">
                    <RoleIcon className="w-5 h-5 text-chain-og" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-primary">{config.label}</h3>
                    <p className="text-xs text-secondary">{config.description}</p>
                  </div>
                </div>
                <ChainBadge chain="0g" />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-secondary">
                  ERC-8004 #{agent.agentId}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-chain-og/10 text-chain-og">
                  <Zap className="w-3 h-3" />
                  0G Verified
                </span>
                {agent.operatorWorldId && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-chain-world/10 text-chain-world">
                    <Globe className="w-3 h-3" />
                    World ID
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
