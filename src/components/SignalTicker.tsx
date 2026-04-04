'use client';

import {
  Eye, TrendingUp, Zap, ShieldCheck, BarChart3,
  ArrowRightLeft, Cpu, Wrench,
} from 'lucide-react';
import { useState } from 'react';

export interface TickerItem {
  id: string;
  type: string;
  agent: string;
  action: string;
  detail: string;
  value?: string;
  txHash?: string;
}

const typeStyle: Record<string, { icon: typeof Eye; border: string }> = {
  reputation: { icon: Eye, border: 'border-green-400/60' },
  prediction: { icon: TrendingUp, border: 'border-chain-hedera/60' },
  payment:    { icon: Zap, border: 'border-gray-400/60' },
  verification: { icon: ShieldCheck, border: 'border-blue-400/60' },
  signal:     { icon: BarChart3, border: 'border-purple-400/60' },
  trade:      { icon: ArrowRightLeft, border: 'border-purple-400/60' },
  depin:      { icon: Cpu, border: 'border-orange-400/60' },
  skill:      { icon: Wrench, border: 'border-cyan-400/60' },
};

function Chip({ item }: { item: TickerItem }) {
  const style = typeStyle[item.type] || typeStyle.signal;
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border ${style.border} bg-surface/80 px-3 py-1.5 text-[11px] font-medium text-primary shrink-0`}
    >
      <Icon className="w-3 h-3 shrink-0 text-secondary" />
      <span className="font-semibold">{item.agent}</span>
      <span className="text-secondary">·</span>
      <span className="text-secondary">{item.action}</span>
      {item.value && (
        <>
          <span className="text-secondary">·</span>
          <span className="text-primary-accent font-semibold">{item.value}</span>
        </>
      )}
    </span>
  );
}

export function SignalTicker({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false);

  if (items.length === 0) return null;

  // Split items into two rows
  const mid = Math.ceil(items.length / 2);
  const row1 = items.slice(0, mid);
  const row2 = items.slice(mid);

  // Duplicate for seamless loop
  const row1Items = [...row1, ...row1];
  const row2Items = [...row2, ...row2];

  return (
    <div
      className="flex flex-col gap-1 overflow-hidden rounded-xl bg-surface/30 py-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* Row 1: scrolls left */}
      <div className="relative overflow-hidden">
        <div
          className={`flex gap-2 ticker-row-left ${paused ? 'ticker-paused' : ''}`}
          style={{ width: 'max-content' }}
        >
          {row1Items.map((item, i) => (
            <Chip key={`r1-${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>

      {/* Row 2: scrolls right */}
      {row2.length > 0 && (
        <div className="relative overflow-hidden">
          <div
            className={`flex gap-2 ticker-row-right ${paused ? 'ticker-paused' : ''}`}
            style={{ width: 'max-content' }}
          >
            {row2Items.map((item, i) => (
              <Chip key={`r2-${item.id}-${i}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
