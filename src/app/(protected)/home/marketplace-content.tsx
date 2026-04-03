'use client';

import { useState, useMemo } from 'react';
import { ResourceCard, type ResourceCardProps, type ResourceType } from '@/components/ResourceCard';
import { PaymentConfirmation } from '@/components/PaymentConfirmation';

type FilterTab = 'all' | ResourceType;

interface PaymentResult {
  amount: string;
  txHash: string;
  resourceName: string;
}

const tabs: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'gpu', label: 'GPU' },
  { value: 'agent', label: 'Agent' },
  { value: 'human', label: 'Human' },
];

function parsePrice(price: string): string {
  const match = price.match(/\$?([\d.]+)/);
  return match?.[1] ?? '0';
}

export function MarketplaceContent({ resources }: { resources: ResourceCardProps[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paying, setPaying] = useState(false);

  const filtered = useMemo(
    () => activeTab === 'all' ? resources : resources.filter((r) => r.type === activeTab),
    [activeTab, resources],
  );

  async function handleHire(resource: { name: string; price: string; type: ResourceType }) {
    if (paying) return;
    setPaying(true);

    try {
      const amount = parsePrice(resource.price);

      // x402 flow: first request without payment header gets 402 + payment requirements
      // Then re-request with X-PAYMENT header containing signed payment
      // For demo: we send a mock X-PAYMENT header to trigger the full flow
      const mockPaymentPayload = btoa(JSON.stringify({
        network: 'hedera-testnet',
        amount,
        resource: resource.name,
        timestamp: Date.now(),
      }));

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': mockPaymentPayload,
        },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPaymentResult({
          amount: data.payment?.amount ?? amount,
          txHash: data.payment?.txHash ?? 'pending',
          resourceName: resource.name,
        });
      } else {
        console.error('Payment failed:', data.error);
      }
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
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

      {/* Resource cards */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((resource) => (
            <ResourceCard
              key={`${resource.type}-${resource.name}`}
              {...resource}
              onHire={handleHire}
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
        <PaymentConfirmation
          amount={paymentResult.amount}
          txHash={paymentResult.txHash}
          resourceName={paymentResult.resourceName}
          onClose={() => setPaymentResult(null)}
        />
      )}
    </>
  );
}
