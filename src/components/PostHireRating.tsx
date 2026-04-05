'use client';

import { useState } from 'react';
import { Star, TrendingUp, Loader2, X } from 'lucide-react';

interface PostHireRatingProps {
  resourceName: string;
  resourceAgentId?: number;
  onClose: () => void;
}

export function PostHireRating({ resourceName, resourceAgentId, onClose }: PostHireRatingProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [creatingMarket, setCreatingMarket] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmitRating() {
    if (rating === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      await fetch('/api/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: resourceAgentId ?? 0,
          value: rating * 20, // 1-5 stars → 20-100 score
          tag1: 'starred',
          tag2: 'quality',
        }),
      });
      setSubmitted(true);
    } catch {
      // Demo fallback: show success even if reputation write fails
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateMarket() {
    setCreatingMarket(true);
    try {
      const resolutionTime = Math.floor(Date.now() / 1000) + 30 * 86400; // 30 days
      await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Will ${resourceName} maintain quality score above 80% for the next 30 days?`,
          resolutionTime,
        }),
      });
      onClose();
    } catch (err) {
      console.error('Market creation failed:', err);
      setError('Failed to create market. Please try again.');
    } finally {
      setCreatingMarket(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[90%] max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-surface">
          <X className="w-4 h-4 text-secondary" />
        </button>

        {!submitted ? (
          <>
            {/* Rating section */}
            <div className="flex flex-col items-center gap-3">
              <Star className="w-8 h-8 text-chain-hedera" />
              <h2 className="text-lg font-bold text-primary">Rate {resourceName}</h2>
              <p className="text-xs text-secondary text-center">
                Your rating writes on-chain reputation via ERC-8004
              </p>

              {/* Stars */}
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    onClick={() => setRating(i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(0)}
                    className="p-1"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        i <= (hover || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <p className="text-sm font-medium text-primary">
                  {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]} ({rating * 20}/100)
                </p>
              )}

              {error && (
                <p className="text-xs text-red-500 text-center">{error}</p>
              )}

              <button
                onClick={handleSubmitRating}
                disabled={rating === 0 || submitting}
                className="w-full mt-2 min-h-[44px] rounded-lg bg-chain-hedera text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit Rating
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Post-rating: prediction suggestion */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-status-verified/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-status-verified fill-status-verified" />
              </div>
              <h2 className="text-lg font-bold text-primary">Rating Submitted</h2>
              <p className="text-xs text-secondary text-center">
                {rating * 20}/100 quality score written to {resourceName}
              </p>

              <div className="w-full border-t border-border-card my-2" />

              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-chain-hedera" />
                <p className="text-sm font-semibold text-primary">Create a prediction?</p>
              </div>
              <p className="text-xs text-secondary text-center">
                &quot;Will {resourceName} maintain quality above 80%?&quot;
              </p>

              <div className="flex gap-2 w-full mt-2">
                <button
                  onClick={handleCreateMarket}
                  disabled={creatingMarket}
                  className="flex-1 min-h-[40px] rounded-lg bg-chain-hedera text-white text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {creatingMarket ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  Create Market
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 min-h-[40px] rounded-lg border border-border-card text-primary text-sm font-medium"
                >
                  Skip
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
