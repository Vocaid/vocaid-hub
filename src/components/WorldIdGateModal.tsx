'use client';

import { useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { MiniKit } from '@worldcoin/minikit-js';

interface WorldIdGateModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

/**
 * Informational modal shown when World ID verification is required.
 * Checks MiniKit.user.verificationStatus and auto-resolves if verified.
 */
export function WorldIdGateModal({ open, onClose, onVerified }: WorldIdGateModalProps) {
  // Auto-detect if user became verified (e.g. after switching back from World App settings)
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      if (MiniKit.user?.verificationStatus?.isOrbVerified) {
        clearInterval(interval);
        onVerified();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, onVerified]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[428px] rounded-2xl bg-white p-6 flex flex-col gap-5 animate-scale-in">
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

        <p className="text-sm text-secondary leading-relaxed">
          To use this feature, you need to verify your identity with World ID.
          Open <strong>World App &rarr; Settings &rarr; Verify</strong> to complete Orb verification.
        </p>

        <p className="text-xs text-secondary/70">
          Once verified, come back and this screen will update automatically.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
