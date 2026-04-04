'use client';

import { useState, useEffect, useCallback } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useIsUserVerified } from '@worldcoin/minikit-react';
import { useSession } from 'next-auth/react';

/**
 * Checks World ID orb verification status using three sources:
 * 1. useIsUserVerified — queries World ID address book on Worldchain mainnet (authoritative)
 * 2. MiniKit.user.verificationStatus — native World App data (instant if available)
 * 3. /api/world-id/check — custom CredentialGate on Sepolia (legacy fallback)
 */
export function useWorldIdGate() {
  const { data: session } = useSession();
  const walletAddress = (session?.user as { walletAddress?: string } | undefined)?.walletAddress ?? '';

  // Primary: World ID address book contract on mainnet
  const { isUserVerified, isLoading: isWorldIdLoading } = useIsUserVerified(walletAddress);

  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const recheckStatus = useCallback(async () => {
    if (!walletAddress) {
      setIsVerified(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    // Check MiniKit native status (instant, no network)
    const miniKitStatus = MiniKit.user?.verificationStatus?.isOrbVerified;
    if (miniKitStatus === true) {
      console.log('[world-id-gate] Verified via MiniKit.user.verificationStatus');
      setIsVerified(true);
      setIsChecking(false);
      return;
    }

    // Fall back to on-chain check via our backend
    try {
      const res = await fetch(`/api/world-id/check?address=${walletAddress}`);
      const data = await res.json();
      if (data.verified === true) {
        console.log('[world-id-gate] Verified via /api/world-id/check');
        setIsVerified(true);
        setIsChecking(false);
        return;
      }
    } catch {
      // Network error — continue to next check
    }

    // Neither source confirmed — mark as not verified
    setIsVerified(false);
    setIsChecking(false);
  }, [walletAddress]);

  // When useIsUserVerified resolves, use it as authoritative
  useEffect(() => {
    if (isWorldIdLoading) return;

    if (isUserVerified === true) {
      console.log('[world-id-gate] Verified via World ID address book (mainnet)');
      setIsVerified(true);
      setIsChecking(false);
    } else {
      // World ID mainnet didn't confirm — try secondary sources
      recheckStatus();
    }
  }, [isUserVerified, isWorldIdLoading, recheckStatus]);

  return { isVerified, isChecking, recheckStatus };
}
