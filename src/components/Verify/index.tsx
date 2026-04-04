'use client';
import { IDKit, orbLegacy, type RpContext } from '@worldcoin/idkit';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export const Verify = () => {
  const { data: session } = useSession();
  const walletAddress = (session?.user as { walletAddress?: string } | undefined)?.walletAddress ?? '';
  const [buttonState, setButtonState] = useState<
    'pending' | 'success' | 'failed' | undefined
  >(undefined);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const onClickVerify = async () => {
    setButtonState('pending');
    setDebugInfo(null);

    try {
      // Step 1: Get RP signature
      console.log('[verify] Step 1: Fetching RP signature...');
      const rpRes = await fetch('/api/rp-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-human' }),
      });

      if (!rpRes.ok) {
        const errBody = await rpRes.text();
        console.error('[verify] Step 1 FAILED:', rpRes.status, errBody);
        setDebugInfo(`RP signature failed: ${rpRes.status} — ${errBody}`);
        setButtonState('failed');
        setTimeout(() => setButtonState(undefined), 5000);
        return;
      }

      const rpSig = await rpRes.json();
      console.log('[verify] Step 1 OK: rp_id =', rpSig.rp_id);

      const rpContext: RpContext = {
        rp_id: rpSig.rp_id,
        nonce: rpSig.nonce,
        created_at: rpSig.created_at,
        expires_at: rpSig.expires_at,
        signature: rpSig.sig,
      };

      // Step 2: IDKit request
      console.log('[verify] Step 2: Creating IDKit request...', {
        app_id: process.env.NEXT_PUBLIC_APP_ID,
        action: 'verify-human',
        signal: walletAddress ? `${walletAddress.slice(0, 8)}...` : 'EMPTY',
      });

      const request = await IDKit.request({
        app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
        action: 'verify-human',
        rp_context: rpContext,
        allow_legacy_proofs: true,
      }).preset(orbLegacy({ signal: walletAddress }));

      console.log('[verify] Step 2 OK: IDKit request created');

      // Step 3: Poll for completion
      console.log('[verify] Step 3: Polling for World App completion...');
      const completion = await request.pollUntilCompletion();
      if (!completion.success) {
        console.error('[verify] Step 3 FAILED:', completion.error);
        setDebugInfo(`World App rejected: ${completion.error}`);
        setButtonState('failed');
        setTimeout(() => setButtonState(undefined), 5000);
        return;
      }

      console.log('[verify] Step 3 OK: proof received, keys:', Object.keys(completion.result));

      // Step 4: Server-side proof verification
      console.log('[verify] Step 4: Sending proof to /api/verify-proof...');
      const response = await fetch('/api/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: completion.result,
          action: 'verify-human',
          signal: walletAddress,
        }),
      });

      const data = await response.json();
      console.log('[verify] Step 4 response:', JSON.stringify({
        status: response.status,
        success: data.verifyRes?.success,
        error: data.verifyRes?.error || data.error,
        code: data.verifyRes?.code,
      }));

      if (data.verifyRes?.success) {
        console.log('[verify] SUCCESS — World ID verified on-chain');
        setButtonState('success');
        setDebugInfo(null);
      } else {
        const reason = data.verifyRes?.code || data.verifyRes?.detail || data.error || 'Unknown';
        console.error('[verify] Step 4 FAILED:', reason);
        setDebugInfo(`Proof rejected: ${reason}`);
        setButtonState('failed');
        setTimeout(() => setButtonState(undefined), 5000);
      }
    } catch (err) {
      console.error('[verify] CAUGHT ERROR:', err);
      const message = err instanceof Error ? err.message : String(err);
      setDebugInfo(`Error: ${message}`);
      setButtonState('failed');
      setTimeout(() => setButtonState(undefined), 5000);
    }
  };

  return (
    <div className="grid w-full gap-4">
      <p className="text-lg font-semibold">Verify</p>
      <LiveFeedback
        label={{
          failed: 'Failed to verify',
          pending: 'Verifying',
          success: 'Verified',
        }}
        state={buttonState}
        className="w-full"
      >
        <Button
          onClick={onClickVerify}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="primary"
          className="w-full"
        >
          Verify with World ID
        </Button>
      </LiveFeedback>
      {debugInfo && (
        <p className="text-xs text-status-failed bg-status-failed/5 rounded-lg px-3 py-2 font-mono break-all">
          {debugInfo}
        </p>
      )}
    </div>
  );
};
