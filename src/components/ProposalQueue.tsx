'use client';

import { useEffect, useState } from 'react';
import { Bot, Check, X, Loader2, Clock, TrendingUp, Plus } from 'lucide-react';

interface DecodedBet {
  marketId: number;
  side: string;
  amount: string;
  question: string;
}

interface DecodedMarket {
  question: string;
  resolutionTime: number;
}

interface Proposal {
  id: number;
  agentId: number;
  type: 'bet' | 'create_market';
  status: string;
  createdAt: number;
  expiresAt: number;
  decoded: DecodedBet | DecodedMarket;
}

function timeRemaining(expiresAt: number): string {
  const diff = expiresAt - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'expired';
  const hours = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function ProposalQueue({ agentIds }: { agentIds: number[] }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetchProposals();
    const interval = setInterval(fetchProposals, 30000);
    return () => clearInterval(interval);
  }, [agentIds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function fetchProposals() {
    try {
      const all: Proposal[] = [];
      for (const agentId of agentIds) {
        const res = await fetch(`/api/proposals?agentId=${agentId}`);
        if (res.ok) {
          const data = await res.json();
          all.push(...(data.proposals || []));
        }
      }
      setProposals(all);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(proposalId: number, action: 'approve' | 'reject', value?: string) {
    setActionLoading(proposalId);
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, proposalId, value }),
      });
      if (!res.ok) throw new Error('Failed');
      setToast({ msg: action === 'approve' ? 'Proposal approved and executed' : 'Proposal rejected', ok: action === 'approve' });
      await fetchProposals();
    } catch {
      setToast({ msg: `Failed to ${action} proposal`, ok: false });
    } finally {
      setActionLoading(null);
    }
  }

  const pending = proposals.filter((p) => p.status === 'pending');

  if (loading) {
    return (
      <div className="rounded-xl border border-border-card bg-surface p-4">
        <div className="h-10 animate-pulse rounded-lg bg-white" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-medium shadow-lg animate-fade-in ${toast.ok ? 'bg-status-verified text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-primary-accent" />
        <span className="text-sm font-semibold text-primary">Agent Proposals</span>
        {pending.length > 0 && (
          <span className="ml-auto rounded-full bg-chain-hedera px-2 py-0.5 text-[10px] font-bold text-white">
            {pending.length}
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <p className="text-xs text-secondary text-center py-4">No pending proposals</p>
      ) : (
        pending.map((p) => {
          const isBet = p.type === 'bet';
          const decoded = p.decoded as DecodedBet & DecodedMarket;
          const isActing = actionLoading === p.id;

          return (
            <div key={p.id} className="rounded-lg border border-border-card bg-white p-3 flex flex-col gap-2">
              {/* Type + summary */}
              <div className="flex items-start gap-2">
                {isBet ? (
                  <TrendingUp className="w-4 h-4 text-chain-hedera shrink-0 mt-0.5" />
                ) : (
                  <Plus className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary">
                    Agent #{p.agentId} proposes: {isBet ? 'Place Bet' : 'Create Market'}
                  </p>
                  {isBet ? (
                    <p className="text-xs text-secondary mt-0.5">
                      Bet <span className="font-semibold text-primary">${decoded.amount} USDC</span> on{' '}
                      <span className="font-semibold">{decoded.side}</span> — {decoded.question}
                    </p>
                  ) : (
                    <p className="text-xs text-secondary mt-0.5">
                      &quot;{decoded.question}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Expiry + actions */}
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-secondary" />
                <span className="text-[10px] text-secondary">expires {timeRemaining(p.expiresAt)}</span>
                <div className="ml-auto flex gap-1.5">
                  <button
                    onClick={() => handleAction(p.id, 'approve', isBet ? decoded.amount : undefined)}
                    disabled={isActing}
                    className="flex items-center gap-1 rounded-lg bg-status-verified/10 text-status-verified border border-status-verified/30 px-3 py-1.5 text-xs font-semibold"
                  >
                    {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(p.id, 'reject')}
                    disabled={isActing}
                    className="flex items-center gap-1 rounded-lg bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 text-xs font-semibold"
                  >
                    <X className="w-3 h-3" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
