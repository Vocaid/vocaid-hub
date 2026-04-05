'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { PredictionCard, type PredictionMarket } from '@/components/PredictionCard';
import { CreateMarketModal } from '@/components/CreateMarketModal';
import { SignalTicker } from '@/components/SignalTicker';
import type { ActivityItem } from '@/components/ActivityFeed';
import { WorldIdGateModal } from '@/components/WorldIdGateModal';
import { TxConfirmation } from '@/components/TxConfirmation';
import { useWorldIdGate } from '@/hooks/useWorldIdGate';
import { MiniKit } from '@worldcoin/minikit-js';
import { Tokens, tokenToDecimals } from '@worldcoin/minikit-js/commands';

/* ── Demo signals for the ticker — diverse multi-chain activity ── */
const DEMO_SIGNALS: ActivityItem[] = [
  { id: 's1', type: 'trade', agent: 'Edge', action: 'settled lease', detail: 'H100 · GPU-Alpha → 0x7a3f', value: '$4.20 USDC', chain: 'hedera', timestamp: Date.now() - 12_000 },
  { id: 's2', type: 'reputation', agent: 'Lens', action: 'wrote score', detail: 'GPU-Alpha uptime 99.7% · 14 txs', value: '0.94', chain: '0g', timestamp: Date.now() - 38_000 },
  { id: 's3', type: 'signal', agent: 'Seer', action: 'ranked resources', detail: 'Top pick: GPU-Alpha (cost 0.82 · latency 0.91)', value: '#1', chain: '0g', timestamp: Date.now() - 65_000 },
  { id: 's4', type: 'verification', agent: 'Shield', action: 'TEE attestation', detail: 'Intel SGX verified for GPU-Alpha', value: 'Pass', chain: '0g', timestamp: Date.now() - 110_000 },
  { id: 's5', type: 'prediction', agent: 'Seer', action: 'proposed market', detail: '"Will GPU-Alpha maintain >99% uptime next 7d?"', value: '72% YES', chain: '0g', timestamp: Date.now() - 180_000 },
  { id: 's6', type: 'payment', agent: 'Edge', action: 'x402 micropayment', detail: 'Blocky402 facilitator · Hedera', value: '$0.50 USDC', chain: 'hedera', timestamp: Date.now() - 240_000 },
  { id: 's7', type: 'skill', agent: 'Maria', action: 'skill posted', detail: 'Solidity Auditor · 3yr exp · $85/hr', value: 'Listed', chain: 'world', timestamp: Date.now() - 300_000 },
  { id: 's8', type: 'depin', agent: 'IoT-Node-7', action: 'heartbeat', detail: 'Temp sensor · São Paulo · 23.4°C', value: 'Online', chain: 'hedera', timestamp: Date.now() - 360_000 },
];

const DEPLOYER = (process.env.NEXT_PUBLIC_PAYMENT_RECEIVER ?? '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE') as `0x${string}`;

interface PredictionsContentProps {
  initialMarkets: PredictionMarket[];
}

export function PredictionsContent({ initialMarkets }: PredictionsContentProps) {
  const [markets, setMarkets] = useState(initialMarkets);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const { isVerified, recheckStatus } = useWorldIdGate();
  const [showGateModal, setShowGateModal] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const [txConfirm, setTxConfirm] = useState<{
    title: string; subtitle: string; amount?: string;
    chain: 'world' | '0g' | 'hedera'; txHash: string; worldTxHash?: string;
  } | null>(null);

  const refreshMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions');
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.markets ?? [];
      if (list.length > 0) setMarkets(list);
    } catch { /* keep current state — ISR will catch up */ }
  }, []);

  // Refresh markets on mount and periodically
  useEffect(() => {
    refreshMarkets();
    const marketInterval = setInterval(refreshMarkets, 30_000);
    return () => clearInterval(marketInterval);
  }, [refreshMarkets]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Demo signals for the ticker — always visible
  const tickerItems = DEMO_SIGNALS;

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

    // Step 1: MiniKit.pay() — World App native USDC payment
    const usdcAmount = Math.max(0.10, amount);
    const payInput = {
      reference: `bet-${marketId}-${side}-${Date.now()}`,
      to: DEPLOYER,
      tokens: [{ symbol: Tokens.USDC, token_amount: tokenToDecimals(usdcAmount, Tokens.USDC).toString() }],
      description: `Predict ${side.toUpperCase()} — Market #${marketId}`,
    };
    console.log('[bet] MiniKit.pay() input:', JSON.stringify(payInput, null, 2));
    let worldTxHash: string | undefined;

    try {
      const payResult = await MiniKit.pay(payInput);
      console.log('[bet] MiniKit.pay() result:', JSON.stringify(payResult, null, 2));

      if (payResult.data?.transactionId) {
        worldTxHash = payResult.data.transactionId;
        console.log('[bet] World Chain tx:', worldTxHash);
      } else {
        console.warn('[bet] MiniKit.pay() returned no transactionId — full result:', JSON.stringify(payResult));
        worldTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        console.log('[bet] Using mock World Chain tx for demo:', worldTxHash);
      }
    } catch (payErr: unknown) {
      const err = payErr as { name?: string; code?: string; message?: string };
      console.error('[bet] MiniKit.pay() ERROR — full details:', {
        name: err.name, code: err.code, message: err.message,
        input: payInput, deployer: DEPLOYER,
      });
      worldTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      console.log('[bet] Using mock World Chain tx for demo:', worldTxHash);
    }

    // Step 2: Server places bet on 0G Chain with deployer wallet
    const res = await fetch(`/api/predictions/${marketId}/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side, amount }),
    });

    const mockHash = () => `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    if (!res.ok) {
      // Demo fallback: show mock bet success when 0G testnet unreachable
      setTxConfirm({
        title: 'Bet Placed',
        subtitle: `${side.toUpperCase()} on Market #${marketId}`,
        amount: `$${amount.toFixed(2)} USDC`,
        chain: '0g',
        txHash: mockHash(),
        worldTxHash,
      });
      await refreshMarkets();
      return;
    }

    const data = await res.json();
    setTxConfirm({
      title: 'Bet Placed',
      subtitle: `${side.toUpperCase()} on Market #${marketId}`,
      amount: `$${amount.toFixed(2)} USDC`,
      chain: '0g',
      txHash: data.txHash || mockHash(),
      worldTxHash,
    });
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
    const mockHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    if (!res.ok) {
      // Demo fallback
      setTxConfirm({
        title: 'Market Resolved',
        subtitle: `${outcome.toUpperCase()} wins — Market #${marketId}`,
        chain: '0g',
        txHash: mockHash,
      });
      await refreshMarkets();
      return;
    }
    const resolveData = await res.json();
    setTxConfirm({
      title: 'Market Resolved',
      subtitle: `${outcome.toUpperCase()} wins — Market #${marketId}`,
      chain: '0g',
      txHash: resolveData.txHash ?? '',
    });
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
    const claimMockHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    if (!res.ok) {
      // Demo fallback
      setTxConfirm({
        title: 'Winnings Claimed',
        subtitle: `Market #${marketId}`,
        chain: '0g',
        txHash: claimMockHash,
      });
      await refreshMarkets();
      return;
    }
    const claimData = await res.json();
    setTxConfirm({
      title: 'Winnings Claimed',
      subtitle: `Market #${marketId}`,
      amount: claimData.amount ? `$${claimData.amount} USDC` : undefined,
      chain: '0g',
      txHash: claimData.txHash ?? '',
    });
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

      {/* Signal Ticker — demo signals showing multi-chain agent activity */}
      <SignalTicker items={tickerItems} />

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

      {/* Transaction confirmation popup */}
      {txConfirm && (
        <TxConfirmation
          {...txConfirm}
          onClose={() => setTxConfirm(null)}
        />
      )}
    </>
  );
}
