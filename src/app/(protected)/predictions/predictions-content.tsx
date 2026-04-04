'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { PredictionCard, type PredictionMarket } from '@/components/PredictionCard';
import { CreateMarketModal } from '@/components/CreateMarketModal';
import { SignalTicker } from '@/components/SignalTicker';
import { ActivityFeed, type ActivityItem } from '@/components/ActivityFeed';

interface PredictionsContentProps {
  initialMarkets: PredictionMarket[];
}

export function PredictionsContent({ initialMarkets }: PredictionsContentProps) {
  const [markets, setMarkets] = useState(initialMarkets);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  const refreshMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions');
      if (res.ok) setMarkets(await res.json());
    } catch { /* ISR will catch up */ }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/activity');
      if (res.ok) {
        const data = await res.json();
        setActivityItems(data.activities || []);
      }
    } catch { /* fallback handled by ActivityFeed */ }
  }, []);

  // Refresh markets + activity on mount and periodically
  useEffect(() => {
    refreshMarkets();
    fetchActivity();
    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, [refreshMarkets, fetchActivity]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Ticker gets top 8 items
  const tickerItems = activityItems.slice(0, 8);

  async function handleBet(marketId: number, side: 'yes' | 'no', amount: number) {
    const res = await fetch(`/api/predictions/${marketId}/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side, amount }),
    });

    if (!res.ok) {
      const err = await res.json();
      setToast({ message: err.error || 'Bet failed', type: 'error' });
      return;
    }

    setToast({ message: `Bet placed: ${amount} A0GI on ${side.toUpperCase()}`, type: 'success' });
    await refreshMarkets();
  }

  async function handleResolve(marketId: number, outcome: 'yes' | 'no') {
    const res = await fetch(`/api/predictions/${marketId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    });
    if (!res.ok) {
      const err = await res.json();
      setToast({ message: err.error || 'Resolve failed', type: 'error' });
      return;
    }
    setToast({ message: `Market resolved: ${outcome.toUpperCase()} wins`, type: 'success' });
    await refreshMarkets();
  }

  async function handleClaim(marketId: number) {
    const res = await fetch(`/api/predictions/${marketId}/claim`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      setToast({ message: err.error || 'Claim failed', type: 'error' });
      return;
    }
    setToast({ message: 'Winnings claimed!', type: 'success' });
    await refreshMarkets();
  }

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-fade-in ${
            toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-status-verified text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Signal Ticker (2-row marquee) */}
      <SignalTicker items={tickerItems} />

      {/* Live Activity Feed */}
      <ActivityFeed items={activityItems} maxItems={6} />

      {/* Prediction Cards */}
      {markets.length > 0 ? (
        <div className="flex flex-col gap-3 stagger-children">
          {markets.map((market) => (
            <PredictionCard
              key={market.id}
              market={market}
              onBet={handleBet}
              onResolve={handleResolve}
              onClaim={handleClaim}
              isOracle={true}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-secondary">No prediction markets yet</p>
          <p className="text-xs text-secondary/60 mt-1">
            Markets will appear once created on-chain
          </p>
        </div>
      )}

      {/* Create Market CTA */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-chain-hedera text-white text-sm font-semibold active:scale-95 transition-transform"
      >
        <Plus className="w-4 h-4" />
        Create Market
      </button>

      {showCreateModal && (
        <CreateMarketModal
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            setShowCreateModal(false);
            setToast({ message: 'Market created on-chain!', type: 'success' });
            await refreshMarkets();
          }}
        />
      )}
    </>
  );
}
