'use client';

import { useState, useEffect, useCallback } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useSession } from 'next-auth/react';

/**
 * Checks World ID verification via MiniKit.user.verificationStatus.
 * Falls back to /api/world-id/check for on-chain status.
 */
export function useWorldIdGate() {
  const { data: session } = useSession();
  const walletAddress = (session?.user as { walletAddress?: string } | undefined)?.walletAddress;

  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const recheckStatus = useCallback(async () => {
    if (!walletAddress) {
      setIsVerified(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    // Primary: MiniKit native verification status (instant, no network)
    const miniKitStatus = MiniKit.user?.verificationStatus?.isOrbVerified;
    if (miniKitStatus === true) {
      setIsVerified(true);
      setIsChecking(false);
      return;
    }

    // Fallback: on-chain check (for cases where MiniKit user data isn't populated)
    try {
      const res = await fetch(`/api/world-id/check?address=${walletAddress}`);
      const data = await res.json();
      setIsVerified(data.verified === true);
    } catch {
      // If both fail, treat MiniKit status as authoritative
      setIsVerified(miniKitStatus ?? false);
    } finally {
      setIsChecking(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    recheckStatus();
  }, [recheckStatus]);

  return { isVerified, isChecking, recheckStatus };
}
