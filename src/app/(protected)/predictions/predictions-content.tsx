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
import { sendTransaction } from '@worldcoin/minikit-js/commands';
import { encodeFunctionData, parseUnits } from 'viem';

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

const WORLD_USDC = '0x79a02482a880bce3f13e09da970dc34db4cd24d1' as const;
const DEPLOYER = (process.env.NEXT_PUBLIC_PAYMENT_RECEIVER ?? '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE') as `0x${string}`;
const WORLD_RPC = 'https://worldchain-mainnet.g.alchemy.com/public';

async function checkWorldUsdcBalance(userAddress: string, requiredAmount: bigint): Promise<boolean> {
  try {
    const balanceData = encodeFunctionData({
      abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }] as const,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`],
    });
    const res = await fetch(WORLD_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: WORLD_USDC, data: balanceData }, 'latest'] }),
    });
    const { result } = await res.json();
    return BigInt(result || '0x0') >= requiredAmount;
  } catch {
    return false;
  }
}

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

    // Step 1: World Chain USDC transfer (only if user has balance)
    const usdcAmount = Math.max(0.10, amount);
    const requiredUsdc = parseUnits(usdcAmount.toFixed(2), 6);

    let userWallet: string | undefined;
    try {
      const sessRes = await fetch('/api/auth/session');
      if (sessRes.ok) {
        const sess = await sessRes.json();
        userWallet = sess?.user?.walletAddress || sess?.user?.address;
      }
    } catch { /* skip */ }

    if (userWallet) {
      const hasBalance = await checkWorldUsdcBalance(userWallet, requiredUsdc);
      if (hasBalance) {
        try {
          const transferData = encodeFunctionData({
            abi: [{ name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }] as const,
            functionName: 'transfer',
            args: [DEPLOYER, requiredUsdc],
          });

          const txResult = await sendTransaction({
            chainId: 480,
            transactions: [{ to: WORLD_USDC, data: transferData, value: '0x0' }],
          });

          if (txResult.data?.userOpHash) {
            console.log('[bet] World Chain USDC transfer:', txResult.data.userOpHash);
          }
        } catch (txErr) {
          console.log('[bet] sendTransaction failed, continuing with server settlement:', txErr);
        }
      } else {
        console.log('[bet] Insufficient USDC on World Chain — using server settlement only');
      }
    }

    // Step 2: Server places bet on 0G Chain with deployer wallet
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

    const data = await res.json();
    setTxConfirm({
      title: 'Bet Placed',
      subtitle: `${side.toUpperCase()} on Market #${marketId}`,
      amount: `$${amount.toFixed(2)} USDC`,
      chain: '0g',
      txHash: data.txHash ?? '',
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
    if (!res.ok) {
      const err = await res.json();
      setToast({ message: err.error || 'Resolve failed', type: 'error' });
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
    if (!res.ok) {
      const err = await res.json();
      setToast({ message: err.error || 'Claim failed', type: 'error' });
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
