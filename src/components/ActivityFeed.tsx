'use client';

import { useEffect, useState } from 'react';
import { Activity, BarChart3, Eye, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import Image from 'next/image';

interface ActivityItem {
  id: string;
  type: 'reputation' | 'prediction' | 'payment' | 'verification' | 'signal';
  agent: string;
  action: string;
  detail: string;
  value?: string;
  chain: 'world' | '0g' | 'hedera';
  timestamp: number;
  txHash?: string;
}

const typeConfig = {
  reputation: { icon: Eye, label: 'Reputation' },
  prediction: { icon: TrendingUp, label: 'Prediction' },
  payment: { icon: Zap, label: 'Payment' },
  verification: { icon: ShieldCheck, label: 'Verification' },
  signal: { icon: BarChart3, label: 'Signal' },
} as const;

const chainLogo: Record<string, string> = {
  world: '/world.png',
  '0g': '/0G.png',
  hedera: '/hedera.png',
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ActivityFeed({ maxItems = 10 }: { maxItems?: number }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch('/api/activity');
        if (res.ok) {
          const data = await res.json();
          setItems(data.activities || []);
        }
      } catch {
        // Fallback to demo data if API not ready
        setItems(getDemoActivity());
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <Activity className="mx-auto mb-2 h-6 w-6 text-secondary" />
        <p className="text-sm text-secondary">No activity yet</p>
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
      {items.slice(0, maxItems).map((item) => {
        const config = typeConfig[item.type];
        const Icon = config.icon;
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg bg-surface/50 px-3 py-2.5 transition-colors hover:bg-surface"
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
          </div>
        );
      })}
    </div>
  );
}

function getDemoActivity(): ActivityItem[] {
  const now = Date.now();
  return [
    {
      id: '1',
      type: 'reputation',
      agent: 'Lens',
      action: 'rated',
      detail: 'GPU-Alpha quality',
      value: '92/100',
      chain: '0g',
      timestamp: now - 120000,
    },
    {
      id: '2',
      type: 'prediction',
      agent: 'Edge',
      action: 'bet YES',
      detail: 'H100 cost < $0.03',
      value: '0.005 A0GI',
      chain: '0g',
      timestamp: now - 300000,
    },
    {
      id: '3',
      type: 'payment',
      agent: 'User',
      action: 'hired',
      detail: 'GPU-Alpha',
      value: '0.04 USDC',
      chain: 'hedera',
      timestamp: now - 480000,
    },
    {
      id: '4',
      type: 'verification',
      agent: 'Shield',
      action: 'verified',
      detail: 'GPU-Alpha TEE',
      value: 'PASS',
      chain: '0g',
      timestamp: now - 720000,
    },
    {
      id: '5',
      type: 'signal',
      agent: 'Seer',
      action: 'detected',
      detail: 'GPU demand spike +18%',
      chain: '0g',
      timestamp: now - 900000,
    },
    {
      id: '6',
      type: 'reputation',
      agent: 'Lens',
      action: 'rated',
      detail: 'Seer Agent uptime',
      value: '99.9%',
      chain: '0g',
      timestamp: now - 1200000,
    },
  ];
}
