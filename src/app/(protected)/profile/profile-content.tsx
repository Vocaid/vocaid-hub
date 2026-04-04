'use client';

import { useState } from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
import { AgentCard, type AgentRole } from '@/components/AgentCard';
import { ChainBadge } from '@/components/ChainBadge';
import { RegisterAgentModal } from '@/components/RegisterAgentModal';

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

const ROLE_NAMES: Record<string, string> = {
  'signal-analyst': 'Seer',
  'market-maker': 'Edge',
  'risk-manager': 'Shield',
  'discovery': 'Lens',
};

function truncateAddress(addr?: string): string {
  if (!addr) return '—';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ProfileContent({ username, walletAddress, agents }: ProfileContentProps) {
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  return (
    <>
      {/* Identity card */}
      <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-accent/5">
            <ChainBadge chain="world" />
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
        {agents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-card bg-surface p-6 text-center">
            <p className="text-sm text-secondary">No agents registered yet.</p>
            <p className="mt-1 text-xs text-secondary">
              Register your first agent to start building your fleet.
            </p>
          </div>
        ) : (
          agents.map((agent) => (
            <AgentCard
              key={agent.agentId}
              name={ROLE_NAMES[agent.role] ?? agent.role}
              role={(agent.role as AgentRole) ?? 'discovery'}
              agentId={agent.agentId}
              operatorWorldId={agent.operatorWorldId}
              reputation={75}
              verified={agent.operatorWorldId === 'verified' || agent.operatorWorldId === 'pending-verification'}
            />
          ))
        )}
      </div>

      {/* Register Agent CTA */}
      <button
        onClick={() => setShowRegisterModal(true)}
        className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold w-full active:scale-95 transition-transform cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Register New Agent
      </button>

      {showRegisterModal && (
        <RegisterAgentModal
          walletAddress={walletAddress ?? ''}
          onClose={() => setShowRegisterModal(false)}
          onRegistered={() => setShowRegisterModal(false)}
        />
      )}
    </>
  );
}
