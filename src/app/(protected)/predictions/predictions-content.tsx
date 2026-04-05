'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { PredictionCard, type PredictionMarket } from '@/components/PredictionCard';
import { CreateMarketModal } from '@/components/CreateMarketModal';
import { SignalTicker } from '@/components/SignalTicker';
import { ActivityFeed, type ActivityItem } from '@/components/ActivityFeed';
import { WorldIdGateModal } from '@/components/WorldIdGateModal';
import { useWorldIdGate } from '@/hooks/useWorldIdGate';
import { pay, Tokens } from '@worldcoin/minikit-js/commands';

interface PredictionsContentProps {
  initialMarkets: PredictionMarket[];
}

export function PredictionsContent({ initialMarkets }: PredictionsContentProps) {
  const [markets, setMarkets] = useState(initialMarkets);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const { isVerified, recheckStatus } = useWorldIdGate();
  const [showGateModal, setShowGateModal] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const refreshMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions');
      if (!res.ok) return; // keep current state on failure
      const data = await res.json();
      // Handle both { markets: [...] } and plain array responses
      const list = Array.isArray(data) ? data : data.markets ?? [];
      if (list.length > 0) setMarkets(list);
    } catch { /* keep current state — ISR will catch up */ }
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
    const activityInterval = setInterval(fetchActivity, 15_000);
    const marketInterval = setInterval(refreshMarkets, 30_000);
    return () => {
      clearInterval(activityInterval);
      clearInterval(marketInterval);
    };
  }, [refreshMarkets, fetchActivity]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Ticker gets top 8 items
  const tickerItems = activityItems.slice(0, 8);

  function requireVerified(action: () => void) {
    if (!isVerified) {
      pendingActionRef.current = action;
      setShowGateModal(true);
      return;
    }
    action();
  }

  async function handleBet(marketId: number, side: 'yes' | 'no', amount: number) {
    if (!isVerified) {
      requireVerified(() => handleBet(marketId, side, amount));
      return;
    }

    // Step 1: MiniKit.pay() — fire and forget, crash-safe
    // Wraps in nested try-catch so World App webview crash doesn't block settlement
    const usdcAmount = Math.max(0.10, amount).toFixed(2);
    try {
      await pay({
        reference: `bet-${marketId}-${side}-${Date.now()}`,
        to: process.env.NEXT_PUBLIC_PAYMENT_RECEIVER ?? '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE',
        tokens: [{ symbol: Tokens.USDC, token_amount: usdcAmount }],
        description: `Predict ${side.toUpperCase()} — Market #${marketId}`,
      });
    } catch (payErr) {
      console.log('[bet] MiniKit.pay() unavailable, proceeding with server settlement:', payErr);
    }

    // Step 2: Server places bet on 0G Chain with deployer wallet (user's chosen amount)
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
    if (!isVerified) {
      requireVerified(() => handleResolve(marketId, outcome));
      return;
    }
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
    if (!isVerified) {
      requireVerified(() => handleClaim(marketId));
      return;
    }
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

      {/* World ID verification banner */}
      {isVerified === false && (
        <button
          onClick={() => setShowGateModal(true)}
          className="flex items-center gap-3 w-full p-3 rounded-xl border border-amber-200 bg-amber-50 text-left animate-fade-in"
        >
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Verify your World ID</p>
            <p className="text-xs text-amber-600">Required to place bets and create markets. Tap to verify.</p>
          </div>
        </button>
      )}

      {/* Create Market CTA */}
      <button
        onClick={() => requireVerified(() => setShowCreateModal(true))}
        className="flex items-center justify-center gap-2 min-h-11 rounded-lg bg-chain-hedera text-white text-sm font-semibold active:scale-95 transition-transform"
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

      {/* World ID verification modal */}
      <WorldIdGateModal
        open={showGateModal}
        onClose={() => { setShowGateModal(false); recheckStatus(); }}
        onVerified={async () => {
          setShowGateModal(false);
          await recheckStatus();
          if (pendingActionRef.current) {
            const action = pendingActionRef.current;
            pendingActionRef.current = null;
            action();
          }
        }}
      />
    </>
  );
}
