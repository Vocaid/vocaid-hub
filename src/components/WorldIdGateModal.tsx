'use client';

import { useEffect, useRef } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Verify } from '@/components/Verify';

interface WorldIdGateModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

/**
 * Bottom-sheet modal for World ID verification.
 * Matches PaymentConfirmation.tsx pattern (fixed overlay + slide-up sheet).
 * Listens for verification success inside <Verify /> and auto-triggers onVerified.
 */
export function WorldIdGateModal({ open, onClose, onVerified }: WorldIdGateModalProps) {
  const observerRef = useRef<MutationObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Watch for the Verify component's success state (LiveFeedback shows "Verified" text)
  useEffect(() => {
    if (!open || !containerRef.current) return;

    observerRef.current = new MutationObserver(() => {
      const successEl = containerRef.current?.querySelector('[data-state="success"]');
      if (successEl) {
        // Brief delay so user sees the success state
        setTimeout(() => onVerified(), 1200);
        observerRef.current?.disconnect();
      }
    });

    observerRef.current.observe(containerRef.current, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });

    return () => observerRef.current?.disconnect();
  }, [open, onVerified]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-[428px] rounded-t-2xl bg-white p-6 pb-10 flex flex-col gap-5 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-accent" />
            <h2 className="text-lg font-bold text-primary">World ID Required</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        <p className="text-sm text-secondary">
          Verify your identity to continue. This is a one-time process.
        </p>

        {/* Verify component */}
        <div ref={containerRef}>
          <Verify />
        </div>
      </div>
    </div>
  );
}
