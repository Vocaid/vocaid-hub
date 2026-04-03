'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PredictionCard, type PredictionMarket } from '@/components/PredictionCard';
import { CreateMarketModal } from '@/components/CreateMarketModal';

interface PredictionsContentProps {
  initialMarkets: PredictionMarket[];
}

export function PredictionsContent({ initialMarkets }: PredictionsContentProps) {
  const [markets, setMarkets] = useState(initialMarkets);
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function refreshMarkets() {
    try {
      const res = await fetch('/api/predictions');
      if (res.ok) setMarkets(await res.json());
    } catch { /* ISR will catch up */ }
  }

  async function handleBet(marketId: number, side: 'yes' | 'no', amount: number) {
    const res = await fetch(`/api/predictions/${marketId}/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side, amount }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('Bet failed:', err.error);
      return;
    }

    // Optimistic UI: update pools locally
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== marketId) return m;
        const addWei = String(amount * 1e18);
        return {
          ...m,
          yesPool: side === 'yes' ? String(BigInt(m.yesPool) + BigInt(addWei)) : m.yesPool,
          noPool: side === 'no' ? String(BigInt(m.noPool) + BigInt(addWei)) : m.noPool,
        };
      })
    );
  }

  async function handleResolve(marketId: number, outcome: 'yes' | 'no') {
    const res = await fetch(`/api/predictions/${marketId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('Resolve failed:', err.error);
      return;
    }
    await refreshMarkets();
  }

  async function handleClaim(marketId: number) {
    const res = await fetch(`/api/predictions/${marketId}/claim`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('Claim failed:', err.error);
      return;
    }
    await refreshMarkets();
  }

  return (
    <>
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
            await refreshMarkets();
          }}
        />
      )}
    </>
  );
}
