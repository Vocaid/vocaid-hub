'use client';

import { useState, useMemo } from 'react';
import { Eye, ChevronDown } from 'lucide-react';
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
  const [resourceType, setResourceType] = useState<string>('all');
  const [signals, setSignals] = useState<Set<string>>(new Set(['quality']));
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showSignalDropdown, setShowSignalDropdown] = useState(false);

  function toggleSignal(id: string) {
    setSignals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      if (next.size === 0) next.add('quality'); // at least one
      return next;
    });
  }

  const selectedSignalLabels = SIGNAL_OPTIONS
    .filter((s) => signals.has(s.id))
    .map((s) => s.label)
    .join(', ');

  const typeLabel = resourceType === 'all'
    ? 'All Types'
    : resourceType === 'depin'
      ? 'DePIN'
      : resourceType.charAt(0).toUpperCase() + resourceType.slice(1);

  return (
    <div className="rounded-xl border border-border-card bg-white p-4 flex flex-col gap-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-accent/10 flex items-center justify-center shrink-0">
          <Eye className="w-5 h-5 text-primary-accent" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary">Seer Agent</p>
          <p className="text-[11px] text-secondary">Validate resources by reputation signals</p>
        </div>
      </div>

      {/* Dropdowns row */}
      <div className="flex gap-2">
        {/* Resource type dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowSignalDropdown(false); }}
            className="w-full min-h-[40px] px-3 rounded-lg border border-border-card bg-surface text-sm text-primary flex items-center justify-between cursor-pointer"
          >
            <span className="truncate">{typeLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-secondary shrink-0 ml-1" />
          </button>
          {showTypeDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-border-card bg-white shadow-lg py-1 animate-fade-in">
              {RESOURCE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => { setResourceType(t); setShowTypeDropdown(false); }}
                  className={`w-full px-3 py-2 text-left text-sm cursor-pointer ${
                    resourceType === t ? 'bg-primary-accent/10 text-primary-accent font-medium' : 'text-primary hover:bg-surface'
                  }`}
                >
                  {t === 'all' ? 'All Types' : t === 'depin' ? 'DePIN' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Signal multiselect dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => { setShowSignalDropdown(!showSignalDropdown); setShowTypeDropdown(false); }}
            className="w-full min-h-[40px] px-3 rounded-lg border border-border-card bg-surface text-sm text-primary flex items-center justify-between cursor-pointer"
          >
            <span className="truncate text-left">{signals.size === 1 ? selectedSignalLabels : `${signals.size} signals`}</span>
            <ChevronDown className="w-3.5 h-3.5 text-secondary shrink-0 ml-1" />
          </button>
          {showSignalDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-border-card bg-white shadow-lg py-1 animate-fade-in max-h-[200px] overflow-y-auto">
              {SIGNAL_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSignal(s.id)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 cursor-pointer ${
                    signals.has(s.id) ? 'text-primary-accent font-medium' : 'text-primary hover:bg-surface'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    signals.has(s.id) ? 'bg-primary-accent border-primary-accent' : 'border-border-card'
                  }`}>
                    {signals.has(s.id) && <span className="text-white text-[10px]">&#10003;</span>}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Decision engine — compact, no resource listing duplication */}
      <AgentDecisionContent
        decision={decision}
        resourceType={resourceType}
        signal={[...signals][0]}
        compact
      />
    </div>
  );
}
