'use client';

import { useState, useMemo } from 'react';
import {
  Clock,
  Loader2,
  Check,
  X,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import {
  simulateBet,
  formatOdds,
  formatMultiplier,
  isHighImpact,
  isBlockedImpact,
  formatPool,
} from '@/lib/prediction-math';

export interface PredictionMarket {
  id: number;
  question: string;
  yesPool: string;
  noPool: string;
  resolutionTime: number;
  state: number; // 0=Active, 1=Resolved, 2=Cancelled
  winningOutcome?: number; // 1=Yes, 2=No
}

interface PredictionCardProps {
  market: PredictionMarket;
  onBet: (marketId: number, side: 'yes' | 'no', amount: number) => Promise<void>;
  onResolve?: (marketId: number, outcome: 'yes' | 'no') => Promise<void>;
  onClaim?: (marketId: number) => Promise<void>;
  isOracle?: boolean;
}

const BET_PRESETS = [0.10, 0.50, 1.00];

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function PredictionCard({
  market,
  onBet,
  onResolve,
  onClaim,
  isOracle = false,
}: PredictionCardProps) {
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState<'yes' | 'no' | null>(null);

  const yesPoolBig = BigInt(market.yesPool || '0');
  const noPoolBig = BigInt(market.noPool || '0');
  const total = yesPoolBig + noPoolBig;
  const yesPercent = total > 0n ? Number(yesPoolBig * 100n / total) : 50;
  const isActive = market.state === 0;
  const isResolved = market.state === 1;
  const isCancelled = market.state === 2;
  const wonYes = market.winningOutcome === 1;

  // Price impact simulation
  const simulation = useMemo(() => {
    if (!selectedSide || !selectedAmount || !isActive) return null;
    const amountWei = BigInt(Math.floor(selectedAmount * 1e18));
    return simulateBet(yesPoolBig, noPoolBig, selectedSide, amountWei);
  }, [selectedSide, selectedAmount, yesPoolBig, noPoolBig, isActive]);

  const blocked = simulation ? isBlockedImpact(simulation.priceImpact) : false;
  const highImpact = simulation ? isHighImpact(simulation.priceImpact) : false;

  async function handleConfirmBet() {
    if (!selectedSide || !selectedAmount || blocked) return;
    setLoading(true);
    try {
      await onBet(market.id, selectedSide, selectedAmount);
      setSelectedSide(null);
      setSelectedAmount(null);
      setCustomAmount('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(outcome: 'yes' | 'no') {
    if (!onResolve) return;
    setResolveLoading(outcome);
    try {
      await onResolve(market.id, outcome);
    } finally {
      setResolveLoading(null);
    }
  }

  async function handleClaim() {
    if (!onClaim) return;
    setClaimLoading(true);
    try {
      await onClaim(market.id);
    } finally {
      setClaimLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary leading-snug">
            {market.question}
          </p>
        </div>
        {isCancelled && (
          <span className="text-xs font-medium text-status-inactive">Cancelled</span>
        )}
        {isResolved && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-chain-hedera">
            <Check className="w-3.5 h-3.5" />
            {wonYes ? 'YES' : 'NO'} Won
          </span>
        )}
      </div>

      {/* Pool bars */}
      {!isCancelled && (
        <>
          <div className="flex gap-1 h-3 rounded-full bg-border-card overflow-hidden">
            <div
              className={`rounded-full transition-all duration-500 ${
                isResolved ? 'bg-chain-hedera' : 'bg-status-verified'
              }`}
              style={{ width: `${yesPercent}%` }}
            />
            {!isResolved && (
              <div
                className="bg-primary rounded-full transition-all duration-500"
                style={{ width: `${100 - yesPercent}%` }}
              />
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between text-xs">
            <span>
              <span className="font-medium text-status-verified">YES {yesPercent}%</span>
              <span className="text-secondary mx-1">/</span>
              <span className="font-medium text-primary">NO {100 - yesPercent}%</span>
            </span>
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="tabular-nums">${formatPool(String(total))} pool</span>
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(market.resolutionTime)}</span>
            </div>
          </div>
        </>
      )}

      {/* === ACTIVE STATE: Bet UI === */}
      {isActive && (
        <>
          {/* Side selection */}
          <div className="flex gap-2">
            <button
              onClick={() => { setSelectedSide('yes'); setSelectedAmount(null); }}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                selectedSide === 'yes'
                  ? 'bg-status-verified/10 text-status-verified border border-status-verified/30'
                  : 'bg-white border border-border-card text-secondary'
              }`}
            >
              YES
            </button>
            <button
              onClick={() => { setSelectedSide('no'); setSelectedAmount(null); }}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                selectedSide === 'no'
                  ? 'bg-primary/10 text-primary border border-status-failed/30'
                  : 'bg-white border border-border-card text-secondary'
              }`}
            >
              NO
            </button>
          </div>

          {/* Amount presets */}
          {selectedSide && (
            <div className="flex gap-2 animate-fade-in">
              {BET_PRESETS.map((amt) => (
                <button
                  key={amt}
                  disabled={loading}
                  onClick={() => setSelectedAmount(selectedAmount === amt ? null : amt)}
                  className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                    selectedAmount === amt
                      ? 'bg-chain-hedera text-white'
                      : 'bg-white border border-border-card text-secondary'
                  }`}
                >
                  ${amt.toFixed(2)}
                </button>
              ))}
              <input
                type="number"
                step="0.001"
                min="0.001"
                max="1"
                placeholder="Custom"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) setSelectedAmount(val);
                }}
                className="w-full mt-2 min-h-11 rounded-lg border border-border-card bg-surface px-4 text-sm text-primary placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
              />
            </div>
          )}

          {/* Price Impact Preview */}
          {simulation && selectedAmount && (
            <div className="border-t border-border-card pt-3 mt-1 animate-fade-in flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">Est. Payout</span>
                <span className="text-sm font-semibold text-primary tabular-nums">
                  ${formatPool(simulation.estimatedPayout.toString())}
                  <span className="text-chain-hedera font-bold ml-2">
                    {formatMultiplier(simulation.estimatedMultiplier)}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">New Odds</span>
                <span className="text-sm font-semibold text-primary tabular-nums">
                  YES {formatOdds(simulation.newYesOdds)} / NO {formatOdds(simulation.newNoOdds)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">Price Impact</span>
                <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                  {(simulation.priceImpact * 100).toFixed(1)}%
                  <span
                    className={`w-2 h-2 rounded-full ${
                      blocked
                        ? 'bg-primary'
                        : highImpact
                          ? 'bg-status-pending'
                          : 'bg-status-verified'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      blocked
                        ? 'text-primary'
                        : highImpact
                          ? 'text-status-pending'
                          : 'text-status-verified'
                    }`}
                  >
                    {blocked ? 'Too High' : highImpact ? 'Medium' : 'Low'}
                  </span>
                </span>
              </div>

              {highImpact && !blocked && (
                <div className="rounded-lg bg-status-pending/10 border border-status-pending/30 p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-pending shrink-0" />
                  <span className="text-sm text-status-pending">High impact on pool odds</span>
                </div>
              )}

              {blocked && (
                <div className="rounded-lg bg-primary/10 border border-status-failed/30 p-3 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary">Bet too large for this pool</p>
                    <p className="text-xs text-primary/70">Try a smaller amount</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirmBet}
                disabled={loading || blocked}
                className={`min-h-[44px] rounded-lg text-sm font-semibold w-full flex items-center justify-center gap-2 active:scale-95 transition-transform ${
                  blocked
                    ? 'bg-chain-hedera/50 text-white/50 cursor-not-allowed'
                    : 'bg-chain-hedera text-white'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing bet...
                  </>
                ) : blocked ? (
                  'Bet Blocked'
                ) : (
                  `Confirm Bet — $${selectedAmount?.toFixed(2)}`
                )}
              </button>
            </div>
          )}

          {/* Oracle controls */}
          {isOracle && onResolve && (() => {
            const canResolve = Math.floor(Date.now() / 1000) >= market.resolutionTime;
            return (
              <div className="border-t border-border-card pt-3 mt-1 animate-scale-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary uppercase tracking-wide">
                    Oracle Controls
                  </span>
                  {!canResolve && (
                    <span className="text-[10px] text-secondary/60">
                      Resolves {formatDate(market.resolutionTime)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleResolve('yes')}
                    disabled={!canResolve || resolveLoading !== null}
                    className={`flex-1 min-h-[44px] rounded-lg border font-semibold text-sm flex items-center justify-center gap-2 ${
                      canResolve
                        ? 'bg-status-verified/10 text-status-verified border-status-verified/30'
                        : 'bg-surface text-secondary/40 border-border-card cursor-not-allowed'
                    }`}
                  >
                    {resolveLoading === 'yes' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Resolve YES
                  </button>
                  <button
                    onClick={() => handleResolve('no')}
                    disabled={!canResolve || resolveLoading !== null}
                    className={`flex-1 min-h-[44px] rounded-lg border font-semibold text-sm flex items-center justify-center gap-2 ${
                      canResolve
                        ? 'bg-primary/10 text-primary border-status-failed/30'
                        : 'bg-surface text-secondary/40 border-border-card cursor-not-allowed'
                    }`}
                  >
                    {resolveLoading === 'no' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    Resolve NO
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* === RESOLVED STATE === */}
      {isResolved && onClaim && (
        <button
          onClick={handleClaim}
          disabled={claimLoading}
          className="min-h-[44px] rounded-lg bg-status-verified text-white font-semibold text-sm w-full flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {claimLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Claim Winnings
            </>
          )}
        </button>
      )}

      {isResolved && !onClaim && (
        <div className="rounded-lg bg-primary/10 p-3 text-center">
          <span className="text-sm text-primary">
            You bet {wonYes ? 'NO' : 'YES'} — Lost
          </span>
        </div>
      )}

      {/* === CANCELLED STATE === */}
      {isCancelled && onClaim && (
        <button
          onClick={handleClaim}
          disabled={claimLoading}
          className="min-h-[44px] rounded-lg border border-border-card text-primary font-medium text-sm w-full flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {claimLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Claiming...
            </>
          ) : (
            'Claim Refund'
          )}
        </button>
      )}
    </div>
  );
}
