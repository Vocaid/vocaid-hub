'use client';

import { useState } from 'react';
import { ShieldCheck, Plus, Bot, Loader2, Check } from 'lucide-react';
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

const FLEET_ROLES = new Set(['signal-analyst', 'market-maker', 'risk-manager', 'discovery']);

const FLEET_AGENTS = [
  { id: 'signal-analyst', label: 'Seer', desc: 'Watches signals, ranks resources by reputation' },
  { id: 'risk-manager', label: 'Shield', desc: 'TEE validation, risk gates, reputation thresholds' },
  { id: 'discovery', label: 'Lens', desc: 'Indexes resources, writes reputation feedback' },
  { id: 'market-maker', label: 'Edge', desc: 'Settles leases via x402 USDC on Hedera' },
];

function truncateAddress(addr?: string): string {
  if (!addr) return '—';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function getSessionAddress(): Promise<{ address: string; worldId: string } | null> {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.user?.walletAddress || data?.user?.address;
    if (!addr) return null;
    return { address: addr, worldId: addr };
  } catch {
    return null;
  }
}

export function ProfileContent({ username, walletAddress, agents }: ProfileContentProps) {
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Split agents into fleet (operational) vs resource (marketplace)
  const fleetAgents = agents.filter((a) => FLEET_ROLES.has(a.role));
  const resourceAgents = agents.filter((a) => !FLEET_ROLES.has(a.role));
  const deployedRoles = new Set(fleetAgents.map((a) => a.role));

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

      {/* ── OpenClaw Trading Fleet ────���──────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary">Trading Fleet</h2>
        <span className="text-xs text-secondary">{fleetAgents.length}/4 deployed</span>
      </div>

      <DeployFleetSection deployedRoles={deployedRoles} />

      {fleetAgents.length > 0 && (
        <div className="flex flex-col gap-3">
          {fleetAgents.map((agent) => (
            <AgentCard
              key={agent.agentId}
              name={ROLE_NAMES[agent.role] ?? agent.role}
              role={(agent.role as AgentRole) ?? 'discovery'}
              agentId={agent.agentId}
              operatorWorldId={agent.operatorWorldId}
              reputation={75}
              verified={!!agent.operatorWorldId}
            />
          ))}
        </div>
      )}

      {/* ── Resource Agents (marketplace listings) ──────── */}
      {resourceAgents.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-base font-semibold text-primary">My Resource Agents</h2>
            <span className="text-xs text-secondary">{resourceAgents.length} listed</span>
          </div>
          <div className="flex flex-col gap-3">
            {resourceAgents.map((agent) => (
              <AgentCard
                key={agent.agentId}
                name={agent.role}
                role={(agent.role as AgentRole) ?? 'discovery'}
                agentId={agent.agentId}
                operatorWorldId={agent.operatorWorldId}
                reputation={75}
                verified={!!agent.operatorWorldId}
              />
            ))}
          </div>
        </>
      )}

      {/* Register Agent CTA (legacy modal for custom agents) */}
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

/* ─── Deploy Fleet Section ───────────────────────────── */

function DeployFleetSection({ deployedRoles }: { deployedRoles: Set<string> }) {
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<Set<string>>(new Set());

  async function handleDeploy(roleId: string, label: string) {
    setDeploying(roleId);
    try {
      const session = await getSessionAddress();
      if (!session) { setDeploying(null); return; }

      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentURI: `https://vocaid-hub.vercel.app/agent-cards/${label.toLowerCase()}.json`,
          role: roleId,
          operatorWorldId: session.worldId,
          operatorAddress: session.address,
        }),
      });
      if (res.ok) {
        setDeployed((prev) => new Set([...prev, roleId]));
      }
    } catch { /* ignore */ }
    setDeploying(null);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {FLEET_AGENTS.map((agent) => {
        const alreadyDeployed = deployedRoles.has(agent.id) || deployed.has(agent.id);
        const isDeploying = deploying === agent.id;
        return (
          <button
            key={agent.id}
            onClick={() => !alreadyDeployed && !isDeploying && handleDeploy(agent.id, agent.label)}
            disabled={alreadyDeployed || isDeploying}
            className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
              alreadyDeployed
                ? 'border-status-verified/30 bg-status-verified/5'
                : 'border-border hover:border-primary-accent/50'
            }`}
          >
            <div className="flex items-center gap-1.5 w-full">
              {alreadyDeployed ? (
                <Check className="h-3.5 w-3.5 text-status-verified" />
              ) : isDeploying ? (
                <Loader2 className="h-3.5 w-3.5 text-primary-accent animate-spin" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-primary-accent" />
              )}
              <span className="text-sm font-semibold text-primary">{agent.label}</span>
            </div>
            <span className="text-[10px] leading-tight text-secondary">{agent.desc}</span>
            {!alreadyDeployed && !isDeploying && (
              <span className="text-[9px] font-medium text-primary-accent mt-1">Deploy →</span>
            )}
            {alreadyDeployed && (
              <span className="text-[9px] font-medium text-status-verified mt-1">Deployed</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
