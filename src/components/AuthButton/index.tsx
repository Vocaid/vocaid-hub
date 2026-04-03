'use client';
import { walletAuth } from '@/auth/wallet';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback, useState } from 'react';

type FeedbackState = 'pending' | 'success' | 'failed' | undefined;

export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isInstalled } = useMiniKit();

  const onClick = useCallback(async () => {
    if (!isInstalled || isPending) return;
    setIsPending(true);
    setFeedbackState('pending');
    setErrorMessage(null);
    try {
      await walletAuth();
      setFeedbackState('success');
    } catch (error) {
      setFeedbackState('failed');
      setErrorMessage(
        error instanceof Error ? error.message : 'Authentication failed'
      );
    } finally {
      setIsPending(false);
    }
  }, [isInstalled, isPending]);

  if (isInstalled === false) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Button disabled size="lg" variant="primary">
          Login with Wallet
        </Button>
        <p className="text-xs text-secondary text-center max-w-[260px]">
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
        <p className="text-xs text-status-failed text-center max-w-[260px]">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
