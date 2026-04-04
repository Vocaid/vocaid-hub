'use client';

import { useState } from 'react';
import { Bot, Loader2, Eye, TrendingUp, ShieldCheck, Search } from 'lucide-react';

interface RegisterAgentModalProps {
  onClose: () => void;
  onRegistered: () => void;
  walletAddress: string;
}

const ROLES = [
  { id: 'signal-analyst', label: 'Seer', icon: Eye, description: 'Signal Analysis', uri: 'seer' },
  { id: 'market-maker', label: 'Edge', icon: TrendingUp, description: 'Market Pricing', uri: 'edge' },
  { id: 'risk-manager', label: 'Shield', icon: ShieldCheck, description: 'Risk Management', uri: 'shield' },
  { id: 'discovery', label: 'Lens', icon: Search, description: 'Discovery', uri: 'lens' },
];

export function RegisterAgentModal({ onClose, onRegistered, walletAddress }: RegisterAgentModalProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = ROLES.find((r) => r.id === selectedRole);

  async function handleSubmit() {
    if (!selectedRole || !role) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentURI: `https://vocaid-hub.vercel.app/agent-cards/${role.uri}.json`,
          operatorWorldId: walletAddress,
          operatorAddress: walletAddress,
          role: selectedRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-[428px] rounded-t-2xl bg-white p-6 pb-10 flex flex-col gap-5 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary-accent/10">
            <Bot className="w-8 h-8 text-primary-accent" />
          </div>
          <h2 className="text-xl font-bold text-primary">Register Agent</h2>
          <p className="text-sm text-secondary">Choose a role for your new agent</p>
        </div>

        {/* Role selector */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-primary">Agent Role</span>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => {
              const RoleIcon = r.icon;
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg min-h-[44px] transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary-accent/10 border border-primary-accent/30 text-primary-accent'
                      : 'bg-surface border border-border-card text-secondary'
                  }`}
                >
                  <RoleIcon className="w-5 h-5 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold">{r.label}</p>
                    <p className="text-xs opacity-70">{r.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected info */}
        {role && (
          <div className="rounded-lg bg-surface border border-border-card p-3 animate-fade-in">
            <p className="text-xs text-secondary">Agent URI</p>
            <p className="text-xs font-mono text-primary truncate mt-0.5">
              vocaid-hub.vercel.app/agent-cards/{role.uri}.json
            </p>
            <p className="text-xs text-secondary mt-2">Operator</p>
            <p className="text-xs font-mono text-primary truncate mt-0.5">
              {walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-status-failed/10 border border-status-failed/30 p-3 text-sm text-status-failed">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selectedRole || loading}
          className="min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Registering on 0G Chain...
            </>
          ) : (
            'Register Agent'
          )}
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="min-h-[44px] rounded-lg border border-border-card text-primary text-sm font-medium active:scale-95 transition-transform cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
