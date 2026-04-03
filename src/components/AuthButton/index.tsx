'use client';
import { walletAuth } from '@/auth/wallet';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback, useEffect, useRef, useState } from 'react';

type FeedbackState = 'pending' | 'success' | 'failed' | undefined;

/**
 * This component is an example of how to authenticate a user
 * We will use Next Auth for this example, but you can use any auth provider
 * Read More: https://docs.world.org/mini-apps/commands/wallet-auth
 */
export const AuthButton = () => {
  console.log('AuthButton render');
  const [isPending, setIsPending] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isInstalled } = useMiniKit();
  const hasAttemptedAuth = useRef(false);

  console.log('AuthButton state:', { isPending, isInstalled });

  const onClick = useCallback(async () => {
    if (!isInstalled || isPending) {
      return;
    }
    setIsPending(true);
    setFeedbackState('pending');
    setErrorMessage(null);
    try {
      await walletAuth();
      setFeedbackState('success');
    } catch (error) {
      console.error('Wallet authentication button error', error);
      setFeedbackState('failed');
      setErrorMessage(
        error instanceof Error ? error.message : 'Authentication failed'
      );
    } finally {
      setIsPending(false);
    }
  }, [isInstalled, isPending]);

  // Auto-authenticate on load when MiniKit is ready
  useEffect(() => {
    console.log('AuthButton effect:', {
      isInstalled,
      hasAttemptedAuth: hasAttemptedAuth.current,
    });
    if (isInstalled === true && !hasAttemptedAuth.current) {
      console.log('Firing walletAuth automatically');
      hasAttemptedAuth.current = true;
      setIsPending(true);
      setFeedbackState('pending');
      walletAuth()
        .then(() => {
          setFeedbackState('success');
        })
        .catch((error) => {
          console.error('Auto wallet authentication error', error);
          setFeedbackState('failed');
          setErrorMessage(
            error instanceof Error ? error.message : 'Authentication failed'
          );
        })
        .finally(() => {
          setIsPending(false);
        });
    }
  }, [isInstalled]);

  // When MiniKit is not installed, show guidance instead of a dead button
  if (isInstalled === false) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Button disabled size="lg" variant="primary">
          Login with Wallet
        </Button>
        <p className="text-xs text-secondary text-center max-w-65">
          This app runs inside{' '}
          <span className="font-semibold">World App</span>. Open it as a
          Mini App to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <LiveFeedback
        label={{
          failed: errorMessage || 'Failed to login',
          pending: 'Logging in',
          success: 'Logged in',
        }}
        state={feedbackState}
      >
        <Button
          onClick={onClick}
          disabled={isPending}
          size="lg"
          variant="primary"
        >
          Login with Wallet
        </Button>
      </LiveFeedback>
      {feedbackState === 'failed' && errorMessage && (
        <p className="text-xs text-red-400 text-center max-w-65">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
