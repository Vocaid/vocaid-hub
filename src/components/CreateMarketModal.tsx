'use client';

import { useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';

interface CreateMarketModalProps {
  onClose: () => void;
  onCreated: (marketId: number) => void;
}

const DATE_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

const AMOUNT_PRESETS = [1, 5, 10];

export function CreateMarketModal({ onClose, onCreated }: CreateMarketModalProps) {
  const [question, setQuestion] = useState('');
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [initialSide, setInitialSide] = useState<'yes' | 'no' | null>(null);
  const [initialAmount, setInitialAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = question.trim().length > 0 && selectedDays !== null && !loading;

  async function handleSubmit() {
    if (!canSubmit || selectedDays === null) return;
    setLoading(true);
    setError(null);

    const resolutionTime = Math.floor(Date.now() / 1000) + selectedDays * 86400;

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          resolutionTime,
          initialSide: initialSide ?? undefined,
          initialAmount: initialAmount ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create market');
      }

      const data = await res.json();
      onCreated(data.marketId);
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
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-chain-hedera/10">
            <TrendingUp className="w-8 h-8 text-chain-hedera" />
          </div>
          <h2 className="text-xl font-bold text-primary">New Prediction</h2>
          <p className="text-sm text-secondary mt-1">Create a resource prediction market</p>
        </div>

        {/* Question */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="market-question" className="text-sm font-medium text-primary">
            What will happen?
          </label>
          <textarea
            id="market-question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Will H100 spot price drop 20% by June?"
            className="rounded-xl border border-border-card bg-surface px-4 p-3 text-sm text-primary placeholder:text-secondary/50 resize-none focus:outline-none focus:ring-2 focus:ring-chain-hedera/30"
          />
        </div>

        {/* Resolution Date */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-primary">Resolution Date</span>
          <div className="flex gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.days}
                onClick={() => setSelectedDays(preset.days)}
                className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                  selectedDays === preset.days
                    ? 'bg-chain-hedera text-white'
                    : 'bg-surface border border-border-card text-secondary'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Initial Position (optional) */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-secondary uppercase tracking-wide">
            Initial Position (optional)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setInitialSide(initialSide === 'yes' ? null : 'yes')}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                initialSide === 'yes'
                  ? 'bg-status-verified/10 text-status-verified border border-status-verified/30'
                  : 'bg-surface border border-border-card text-secondary'
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setInitialSide(initialSide === 'no' ? null : 'no')}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                initialSide === 'no'
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-surface border border-border-card text-secondary'
              }`}
            >
              NO
            </button>
          </div>

          {initialSide && (
            <div className="flex gap-2 animate-fade-in">
              {AMOUNT_PRESETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setInitialAmount(initialAmount === amt ? null : amt)}
                  className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                    initialAmount === amt
                      ? 'bg-chain-hedera text-white'
                      : 'bg-surface border border-border-card text-secondary'
                  }`}
                >
                  {amt} A0GI
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm text-primary">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="min-h-[44px] rounded-lg bg-chain-hedera text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Market'
          )}
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="min-h-[44px] rounded-lg border border-border-card text-primary text-sm font-medium active:scale-95 transition-transform"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
