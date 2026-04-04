'use client';

import { useEffect, useState } from 'react';
import {
  Activity, BarChart3, Eye, ShieldCheck, TrendingUp, Zap,
  ArrowRightLeft, Cpu, Wrench, X,
} from 'lucide-react';
import Image from 'next/image';

export interface ActivityItem {
  id: string;
  type: 'reputation' | 'prediction' | 'payment' | 'verification' | 'signal' | 'trade' | 'depin' | 'skill';
  agent: string;
  action: string;
  detail: string;
  value?: string;
  chain: 'world' | '0g' | 'hedera';
  timestamp: number;
  txHash?: string;
}

const typeConfig: Record<string, { icon: typeof Eye; label: string }> = {
  reputation: { icon: Eye, label: 'Reputation' },
  prediction: { icon: TrendingUp, label: 'Prediction' },
  payment: { icon: Zap, label: 'Payment' },
  verification: { icon: ShieldCheck, label: 'Verification' },
  signal: { icon: BarChart3, label: 'Signal' },
  trade: { icon: ArrowRightLeft, label: 'Trade' },
  depin: { icon: Cpu, label: 'DePIN' },
  skill: { icon: Wrench, label: 'Skill' },
};

const chainName: Record<string, string> = {
  world: 'World Chain Sepolia',
  '0g': '0G Galileo',
  hedera: 'Hedera Testnet',
};

const chainLogo: Record<string, string> = {
  world: '/world.png',
  '0g': '/0G.png',
  hedera: '/hedera.png',
};

const FILTER_CHIPS: { label: string; types: string[] }[] = [
  { label: 'All', types: [] },
  { label: 'Agents', types: ['trade', 'signal'] },
  { label: 'Reputation', types: ['reputation'] },
  { label: 'GPU', types: ['verification', 'prediction'] },
  { label: 'DePIN', types: ['depin'] },
  { label: 'Skills', types: ['skill'] },
  { label: 'Payments', types: ['payment'] },
];

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/* ── Detail Popup ── */
function DetailPopup({ item, onClose }: { item: ActivityItem; onClose: () => void }) {
  const config = typeConfig[item.type] || typeConfig.signal;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[90%] max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary-accent" />
            <span className="text-sm font-bold text-primary">{config.label}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface transition-colors">
            <X className="w-4 h-4 text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary w-14">Agent</span>
            <span className="text-sm font-semibold text-primary">{item.agent}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary w-14">Action</span>
            <span className="text-sm text-primary">{item.action}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-secondary w-14 pt-0.5">Detail</span>
            <span className="text-sm text-primary">{item.detail}</span>
          </div>
          {item.value && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary w-14">Value</span>
              <span className="text-sm font-semibold text-primary-accent">{item.value}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary w-14">Chain</span>
            <div className="flex items-center gap-1.5">
              <Image src={chainLogo[item.chain] || '/0G.png'} alt={item.chain} width={14} height={14} />
              <span className="text-sm text-primary">{chainName[item.chain] || item.chain}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary w-14">Time</span>
            <span className="text-sm text-primary">{formatTimestamp(item.timestamp)}</span>
          </div>
          {item.txHash && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary w-14">Tx</span>
              <span className="text-xs text-primary font-mono truncate">{item.txHash}</span>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-5 w-full min-h-[40px] rounded-lg border border-border-card text-sm font-medium text-primary active:scale-95 transition-transform"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ── Activity Feed ── */
interface ActivityFeedProps {
  maxItems?: number;
  items?: ActivityItem[];
}

export function ActivityFeed({ maxItems = 10, items: externalItems }: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>(externalItems || []);
  const [loading, setLoading] = useState(!externalItems);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

  useEffect(() => {
    if (externalItems) {
      setItems(externalItems);
      return;
    }

    async function fetchActivity() {
      try {
        const res = await fetch('/api/activity');
        if (res.ok) {
          const data = await res.json();
          setItems(data.activities || []);
        }
      } catch {
        // Will show empty state
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, [externalItems]);

  const filteredItems = activeFilter === 'All'
    ? items
    : items.filter((item) => {
        const chip = FILTER_CHIPS.find((c) => c.label === activeFilter);
        return chip?.types.includes(item.type);
      });

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4 text-primary-accent" />
        <h3 className="text-sm font-semibold text-primary">Live Activity</h3>
        <span className="ml-auto flex h-2 w-2 rounded-full bg-status-verified animate-pulse" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => setActiveFilter(chip.label)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              activeFilter === chip.label
                ? 'bg-chain-hedera text-white'
                : 'bg-surface border border-border-card text-secondary'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-secondary">No {activeFilter.toLowerCase()} activity</p>
        </div>
      ) : (
        filteredItems.slice(0, maxItems).map((item) => {
          const config = typeConfig[item.type] || typeConfig.signal;
          const Icon = config.icon;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="w-full flex items-start gap-3 rounded-lg bg-surface/50 px-3 py-2.5 transition-colors hover:bg-surface text-left"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-accent" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-primary truncate">
                    {item.agent}
                  </span>
                  <span className="text-xs text-secondary">{item.action}</span>
                  <Image
                    src={chainLogo[item.chain] || '/0G.png'}
                    alt={item.chain}
                    width={14}
                    height={14}
                    className="shrink-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary truncate">
                    {item.detail}
                  </span>
                  {item.value && (
                    <span className="text-xs font-medium text-primary-accent">
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-[10px] text-secondary/60">
                {timeAgo(item.timestamp)}
              </span>
            </button>
          );
        })
      )}

      {/* Detail popup */}
      {selectedItem && (
        <DetailPopup item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
