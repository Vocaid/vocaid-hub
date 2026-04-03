'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PredictionCard, type PredictionMarket } from '@/components/PredictionCard';

interface PredictionsContentProps {
  initialMarkets: PredictionMarket[];
}

export function PredictionsContent({ initialMarkets }: PredictionsContentProps) {
  const [markets, setMarkets] = useState(initialMarkets);

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

  return (
    <>
      {markets.length > 0 ? (
        <div className="flex flex-col gap-3">
          {markets.map((market) => (
            <PredictionCard key={market.id} market={market} onBet={handleBet} />
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
      <button className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-chain-hedera text-white text-sm font-semibold active:scale-95 transition-transform">
        <Plus className="w-4 h-4" />
        Create Market
      </button>
    </>
  );
}
