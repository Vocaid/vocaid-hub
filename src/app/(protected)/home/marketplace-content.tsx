'use client';

import { useState, useMemo } from 'react';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { ResourceCard, type ResourceCardProps, type ResourceType } from '@/components/ResourceCard';
import { PaymentConfirmation } from '@/components/PaymentConfirmation';
import { AgentDecisionContent, type DecisionData } from '@/app/(protected)/agent-decision/agent-decision-content';
import { pay, Tokens } from '@worldcoin/minikit-js/commands';

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
  { value: 'depin', label: 'DePIN' },
];

function parsePrice(price: string): string {
  const match = price.match(/\$?([\d.]+)/);
  return match?.[1] ?? '0';
}

export function MarketplaceContent({ resources, decision }: { resources: ResourceCardProps[]; decision?: DecisionData | null }) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payingResource, setPayingResource] = useState<string | null>(null);

  const filtered = useMemo(
    () => activeTab === 'all' ? resources : resources.filter((r) => r.type === activeTab),
    [activeTab, resources],
  );

  async function handleHire(resource: { name: string; price: string; type: ResourceType }) {
    if (paying) return;
    setPaying(true);
    setPayError(null);
    setPayingResource(resource.name);

    try {
      // Step 1: Get payment requirements from server
      const initRes = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceName: resource.name,
          resourceType: resource.type,
          amount: parsePrice(resource.price),
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        setPayError(initData.error ?? 'Payment initiation failed');
        return;
      }

      // Step 2: Try MiniKit.pay() (native World App payment)
      let miniKitSuccess = false;
      let miniKitTxHash = '';

      try {
        const payResult = await pay({
          reference: initData.paymentId,
          to: process.env.NEXT_PUBLIC_PAYMENT_RECEIVER ?? '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE',
          tokens: [{ symbol: Tokens.USDC, token_amount: initData.requirements.amount }],
          description: `Hire ${resource.name}`,
          fallback: () => null,
        });

        if (payResult.executedWith === 'minikit' && payResult.data) {
          miniKitSuccess = true;
          miniKitTxHash = (payResult.data as { transactionId?: string }).transactionId ?? '';
        }
      } catch {
        // Not in World App or pay failed — fall through to x402
      }

      if (miniKitSuccess) {
        setPaymentResult({
          amount: initData.requirements.amount,
          txHash: miniKitTxHash,
          resourceName: resource.name,
        });
        return;
      }

      // Step 3: Fallback — x402 payment via server
      const paymentPayload = btoa(JSON.stringify({
        paymentId: initData.paymentId,
        network: initData.requirements.network,
        token: initData.requirements.token,
        amount: initData.requirements.amount,
        payer: 'world-app-user',
        resource: resource.name,
        timestamp: Date.now(),
      }));

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': paymentPayload,
        },
        body: JSON.stringify({ resourceName: resource.name }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPaymentResult({
          amount: data.payment?.amount ?? initData.requirements.amount,
          txHash: data.payment?.txHash ?? 'pending',
          resourceName: resource.name,
        });
      } else {
        setPayError(data.error ?? 'Payment failed');
      }
    } catch {
      setPayError('Network error — please try again');
    } finally {
      setPaying(false);
      setPayingResource(null);
    }
  }

  return (
    <>
      {/* Seer Agent Decision Engine — top of marketplace */}
      <SeerRankingPanel decision={decision ?? null} />

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

/* ─── Seer Ranking Panel ─────────────────────────── */

const RESOURCE_TYPES = ['all', 'gpu', 'agent', 'human', 'depin'] as const;
const SIGNAL_OPTIONS = [
  { id: 'quality', label: 'Quality' },
  { id: 'cost', label: 'Cost' },
  { id: 'latency', label: 'Latency' },
  { id: 'uptime', label: 'Uptime' },
  { id: 'trust', label: 'Trust' },
  { id: 'successRate', label: 'Success Rate' },
  { id: 'responseTime', label: 'Response' },
  { id: 'accountability', label: 'Accountability' },
  { id: 'region', label: 'Region' },
] as const;

function SeerRankingPanel({ decision }: { decision: DecisionData | null }) {
  const [expanded, setExpanded] = useState(false);
  const [resourceType, setResourceType] = useState<string>('all');
  const [signal, setSignal] = useState<string>('quality');

  return (
    <div className="rounded-xl border border-border-card bg-white overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3"
      >
        <div className="w-9 h-9 rounded-full bg-primary-accent/10 flex items-center justify-center shrink-0">
          <Eye className="w-4.5 h-4.5 text-primary-accent" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-primary">Seer Agent</p>
          <p className="text-[11px] text-secondary">
            {expanded ? 'Ranking resources by reputation signals' : 'Tap to rank resources by signal'}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-secondary" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 animate-fade-in">
          {/* Resource type selector */}
          <div>
            <p className="text-[10px] font-medium text-secondary uppercase tracking-wider mb-1.5">Resource Type</p>
            <div className="flex gap-1">
              {RESOURCE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setResourceType(t)}
                  className={`flex-1 rounded-full py-1.5 text-[11px] font-medium transition-colors ${
                    resourceType === t
                      ? 'bg-primary-accent text-white'
                      : 'bg-surface text-secondary hover:text-primary'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'depin' ? 'DePIN' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Signal selector */}
          <div>
            <p className="text-[10px] font-medium text-secondary uppercase tracking-wider mb-1.5">Rank By Signal</p>
            <div className="flex flex-wrap gap-1">
              {SIGNAL_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSignal(s.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    signal === s.id
                      ? 'bg-primary-accent text-white'
                      : 'bg-surface text-secondary hover:text-primary border border-border-card'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Decision engine */}
          <AgentDecisionContent decision={decision} resourceType={resourceType} signal={signal} />
        </div>
      )}
    </div>
  );
}
