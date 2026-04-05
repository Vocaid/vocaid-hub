'use client';

import { useState, useMemo, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ResourceCard, type ResourceCardProps, type ResourceType } from '@/components/ResourceCard';
import { TxConfirmation } from '@/components/TxConfirmation';
import { PostHireRating } from '@/components/PostHireRating';
import { WorldIdGateModal } from '@/components/WorldIdGateModal';
import { useWorldIdGate } from '@/hooks/useWorldIdGate';
import { MiniKit } from '@worldcoin/minikit-js';
import { Tokens, tokenToDecimals } from '@worldcoin/minikit-js/commands';

const DEPLOYER = (process.env.NEXT_PUBLIC_PAYMENT_RECEIVER ?? '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE') as `0x${string}`;

type FilterTab = 'all' | ResourceType;

interface PaymentResult {
  amount: string;
  txHash: string;
  hederaTxHash?: string;
  resourceName: string;
}

const tabs: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'gpu', label: 'GPU' },
  { value: 'agent', label: 'Agent' },
  { value: 'human', label: 'Human' },
  { value: 'depin', label: 'DePIN' },
];

function parsePrice(price: string): string {
  const match = price.match(/\$?([\d.]+)/);
  return match?.[1] ?? '0';
}

export function MarketplaceContent({ resources }: { resources: ResourceCardProps[] }) {
  const { isVerified, recheckStatus } = useWorldIdGate();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [showRating, setShowRating] = useState<{ name: string; agentId?: number } | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payingResource, setPayingResource] = useState<string | null>(null);
  const [showGateModal, setShowGateModal] = useState(false);
  const pendingHireRef = useRef<{ name: string; price: string; type: ResourceType } | null>(null);

  const filtered = useMemo(
    () => activeTab === 'all' ? resources : resources.filter((r) => r.type === activeTab),
    [activeTab, resources],
  );

  async function handleHire(resource: { name: string; price: string; type: ResourceType }) {
    if (paying) return;

    // Gate: require World ID verification before lease
    if (!isVerified) {
      pendingHireRef.current = resource;
      setShowGateModal(true);
      return;
    }

    setPaying(true);
    setPayError(null);
    setPayingResource(resource.name);

    try {
      // Step 1: MiniKit.pay() — World App native USDC payment
      const leaseAmount = Math.max(0.10, Number(parsePrice(resource.price)) || 0.10);
      // Reference must be ≤ 36 chars per MiniKit validation
      const reference = `hire-${Date.now()}`;
      let worldTxHash: string | undefined;

      const payInput = {
        reference,
        to: DEPLOYER,
        tokens: [{ symbol: Tokens.USDC, token_amount: tokenToDecimals(leaseAmount, Tokens.USDC).toString() }],
        description: `Lease ${resource.name}`,
      };
      console.log('[hire] MiniKit.pay() input:', JSON.stringify(payInput, null, 2));

      try {
        const payResult = await MiniKit.pay(payInput);
        console.log('[hire] MiniKit.pay() result:', JSON.stringify(payResult, null, 2));

        if (payResult.data?.transactionId) {
          worldTxHash = payResult.data.transactionId;
          console.log('[hire] World Chain tx:', worldTxHash);
        } else {
          console.warn('[hire] MiniKit.pay() returned no transactionId:', payResult);
        }
      } catch (payErr: unknown) {
        const err = payErr as { name?: string; code?: string; message?: string };
        console.error('[hire] MiniKit.pay() FAILED:', { name: err.name, code: err.code, message: err.message });
      }

      // Step 2: Record payment on server
      console.log('[hire] Recording payment on server...');
      const confirmRes = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceName: resource.name,
          resourceType: resource.type,
          amount: leaseAmount,
          worldTxHash: worldTxHash ?? null,
        }),
      });
      const confirmData = await confirmRes.json();
      console.log('[hire] Server response:', { status: confirmRes.status, paymentId: confirmData.paymentId, worldTxHash });

      setPaymentResult({
        amount: leaseAmount.toFixed(2),
        txHash: worldTxHash ?? confirmData.paymentId ?? `lease-${Date.now()}`,
        resourceName: resource.name,
      });
    } finally {
      setPaying(false);
      setPayingResource(null);
    }
  }

  return (
    <>
      {/* World ID verification banner */}
      {isVerified === false && (
        <button
          onClick={() => setShowGateModal(true)}
          className="flex items-center gap-3 w-full p-3 rounded-xl border border-amber-200 bg-amber-50 text-left animate-fade-in"
        >
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Verify your World ID</p>
            <p className="text-xs text-amber-600">Required to lease resources. Tap to verify.</p>
          </div>
        </button>
      )}

      {/* World ID verification modal */}
      <WorldIdGateModal
        open={showGateModal}
        onClose={() => { setShowGateModal(false); recheckStatus(); }}
        onVerified={async () => {
          setShowGateModal(false);
          await recheckStatus();
          // Auto-retry the pending hire action
          if (pendingHireRef.current) {
            const resource = pendingHireRef.current;
            pendingHireRef.current = null;
            handleHire(resource);
          }
        }}
      />

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-surface border border-border-card" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-1 min-h-[44px] rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payment error feedback */}
      {payError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-status-failed/30 bg-status-failed/5 px-4 py-3 text-sm text-status-failed animate-fade-in"
        >
          <span>{payError}</span>
          <button
            onClick={() => setPayError(null)}
            className="ml-2 text-status-failed/60 hover:text-status-failed text-lg leading-none"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Resource cards */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3 stagger-children">
          {filtered.map((resource) => (
            <ResourceCard
              key={`${resource.type}-${resource.name}`}
              {...resource}
              onHire={handleHire}
              hiring={paying && payingResource === resource.name}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-secondary">No resources found</p>
          <p className="text-xs text-secondary/60 mt-1">
            Resources will appear once providers register on-chain
          </p>
        </div>
      )}

      {/* Payment confirmation modal */}
      {paymentResult && (
        <TxConfirmation
          title="Resource Leased"
          subtitle={paymentResult.resourceName}
          amount={`$${paymentResult.amount} USDC`}
          chain="hedera"
          txHash={paymentResult.hederaTxHash ?? paymentResult.txHash}
          worldTxHash={paymentResult.hederaTxHash ? paymentResult.txHash : undefined}
          onClose={() => {
            const name = paymentResult.resourceName;
            setPaymentResult(null);
            setShowRating({ name });
          }}
        />
      )}

      {showRating && (
        <PostHireRating
          resourceName={showRating.name}
          resourceAgentId={showRating.agentId}
          onClose={() => setShowRating(null)}
        />
      )}
    </>
  );
}

