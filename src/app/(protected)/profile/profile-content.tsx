'use client';

import { useState } from 'react'; // used by DeployFleetSection
import { ShieldCheck, Bot, Loader2, Check, ArrowRight } from 'lucide-react';
import { AgentCard, type AgentRole } from '@/components/AgentCard';
import { ChainBadge } from '@/components/ChainBadge';
import { WorldIdGateModal } from '@/components/WorldIdGateModal';
import { useWorldIdGate } from '@/hooks/useWorldIdGate';
import Link from 'next/link';
import { ConnectAgentSection } from '@/components/ConnectAgentSection';

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
  // Only fleet agents shown on Profile — resource agents are managed on the Resources page
  const fleetAgents = agents.filter((a) => FLEET_ROLES.has(a.role));
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

      {/* ── Connect Your Agent ────────────────────────── */}
      <ConnectAgentSection />

      {/* ── OpenClaw Trading Fleet ─────────────────────── */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">Trading Fleet</h2>
          <span className="text-xs text-secondary">{fleetAgents.length}/4 deployed</span>
        </div>
        <p className="text-xs text-secondary mt-0.5">Your private AI agents — not listed on the marketplace</p>
      </div>

      <DeployFleetSection deployedRoles={deployedRoles} />

      {/* ── Link to Resources page for marketplace registration ── */}
      <Link
        href="/gpu-verify"
        className="flex items-center justify-between rounded-xl border border-dashed border-border-card p-4 hover:border-primary-accent/50 transition-colors cursor-pointer"
      >
        <div>
          <p className="text-sm font-medium text-primary">Register resources for the marketplace</p>
          <p className="text-xs text-secondary mt-0.5">GPUs, agents, skills, and DePIN devices available for hire</p>
        </div>
        <ArrowRight className="w-4 h-4 text-secondary shrink-0" />
      </Link>
    </>
  );
}

/* ─── Deploy Fleet Section ───────────────────────────── */

function DeployFleetSection({ deployedRoles }: { deployedRoles: Set<string> }) {
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<Set<string>>(new Set());
  const { isVerified, recheckStatus } = useWorldIdGate();
  const [showGateModal, setShowGateModal] = useState(false);
  const [pendingDeploy, setPendingDeploy] = useState<{ roleId: string; label: string } | null>(null);

  async function handleDeploy(roleId: string, label: string) {
    if (!isVerified) {
      setPendingDeploy({ roleId, label });
      setShowGateModal(true);
      return;
    }
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
    <>
    {isVerified === false && (
      <button
        onClick={() => setShowGateModal(true)}
        className="flex items-center gap-3 w-full p-3 rounded-xl border border-amber-200 bg-amber-50 text-left animate-fade-in mb-2"
      >
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">Verify your World ID</p>
          <p className="text-xs text-amber-600">Required to deploy fleet agents. Tap to verify.</p>
        </div>
      </button>
    )}
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
    <WorldIdGateModal
      open={showGateModal}
      onClose={() => { setShowGateModal(false); recheckStatus(); }}
      onVerified={async () => {
        setShowGateModal(false);
        await recheckStatus();
        if (pendingDeploy) {
          const { roleId, label } = pendingDeploy;
          setPendingDeploy(null);
          handleDeploy(roleId, label);
        }
      }}
    />
    </>
  );
}
