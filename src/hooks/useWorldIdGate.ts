'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Shared hook for World ID verification status.
 * Single source of truth — use instead of inline /api/world-id/check fetches.
 */
export function useWorldIdGate() {
  const { data: session } = useSession();
  const walletAddress = (session?.user as { walletAddress?: string } | undefined)?.walletAddress;

  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const recheckStatus = useCallback(async () => {
    if (!walletAddress) {
      setIsVerified(false);
      return;
    }
    setIsChecking(true);
    try {
      const res = await fetch(`/api/world-id/check?address=${walletAddress}`);
      const data = await res.json();
      setIsVerified(data.verified === true);
    } catch {
      setIsVerified(false);
    } finally {
      setIsChecking(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    recheckStatus();
  }, [recheckStatus]);

  return { isVerified, isChecking, recheckStatus };
}
