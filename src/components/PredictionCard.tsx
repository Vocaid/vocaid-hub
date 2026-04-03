'use client';

import { useState } from 'react';
import { TrendingUp, Clock } from 'lucide-react';

export interface PredictionMarket {
  id: number;
  question: string;
  yesPool: string;
  noPool: string;
  resolutionTime: number;
  state: number; // 0=Active, 1=Resolved, 2=Cancelled
}

const BET_PRESETS = [1, 5, 10] as const;

interface PredictionCardProps {
  market: PredictionMarket;
  onBet: (marketId: number, side: 'yes' | 'no', amount: number) => Promise<void>;
}

function formatPool(wei: string): string {
  // Convert wei (18 decimals) to display value
  const val = Number(wei) / 1e18;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toFixed(2);
}

function yesPercent(yesPool: string, noPool: string): number {
  const y = Number(yesPool);
  const n = Number(noPool);
  if (y + n === 0) return 50;
  return Math.round((y / (y + n)) * 100);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function PredictionCard({ market, onBet }: PredictionCardProps) {
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [loading, setLoading] = useState(false);
  const yes = yesPercent(market.yesPool, market.noPool);
  const no = 100 - yes;
  const totalPool = formatPool(
    String(Number(market.yesPool) + Number(market.noPool))
  );
  const isActive = market.state === 0;

  async function handleBet(amount: number) {
    if (!selectedSide || !isActive) return;
    setLoading(true);
    try {
      await onBet(market.id, selectedSide, amount);
    } finally {
      setLoading(false);
      setSelectedSide(null);
    }
  }

  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-chain-hedera/10 shrink-0">
          <TrendingUp className="w-5 h-5 text-chain-hedera" />
        </div>
        <h3 className="text-sm font-semibold text-primary leading-snug">
          {market.question}
        </h3>
      </div>

      {/* Pool bars */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-status-verified w-7">YES</span>
          <div className="flex-1 h-3 rounded-full bg-border-card overflow-hidden">
            <div
              className="h-full rounded-full bg-status-verified transition-all duration-500"
              style={{ width: `${yes}%` }}
            />
          </div>
          <span className="text-xs font-medium text-primary tabular-nums w-9 text-right">
            {yes}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-status-failed w-7">NO</span>
          <div className="flex-1 h-3 rounded-full bg-border-card overflow-hidden">
            <div
              className="h-full rounded-full bg-status-failed transition-all duration-500"
              style={{ width: `${no}%` }}
            />
          </div>
          <span className="text-xs font-medium text-primary tabular-nums w-9 text-right">
            {no}%
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-secondary">
        <span>Pool: {totalPool} A0GI</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Ends {formatDate(market.resolutionTime)}
        </span>
      </div>

      {/* Bet controls */}
      {isActive && (
        <div className="flex flex-col gap-2">
          {/* Side selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedSide('yes')}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                selectedSide === 'yes'
                  ? 'bg-status-verified text-white'
                  : 'border border-status-verified text-status-verified'
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setSelectedSide('no')}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                selectedSide === 'no'
                  ? 'bg-status-failed text-white'
                  : 'border border-status-failed text-status-failed'
              }`}
            >
              NO
            </button>
          </div>

          {/* Amount presets */}
          {selectedSide && (
            <div className="flex gap-2">
              {BET_PRESETS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleBet(amount)}
                  disabled={loading}
                  className="flex-1 min-h-[44px] rounded-lg border border-border-card text-sm font-medium text-primary active:scale-95 transition-transform disabled:opacity-50"
                >
                  {loading ? '...' : `${amount} A0GI`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
