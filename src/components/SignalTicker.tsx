'use client';

import {
  Eye, TrendingUp, Zap, ShieldCheck, BarChart3,
  ArrowRightLeft, Cpu, Wrench, ChevronDown, Radio,
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

const typeStyle: Record<string, { icon: typeof Eye; color: string }> = {
  reputation:   { icon: Eye, color: 'text-green-500' },
  prediction:   { icon: TrendingUp, color: 'text-chain-hedera' },
  payment:      { icon: Zap, color: 'text-gray-500' },
  verification: { icon: ShieldCheck, color: 'text-blue-500' },
  signal:       { icon: BarChart3, color: 'text-purple-500' },
  trade:        { icon: ArrowRightLeft, color: 'text-purple-500' },
  depin:        { icon: Cpu, color: 'text-orange-500' },
  skill:        { icon: Wrench, color: 'text-cyan-500' },
};

export function SignalTicker({ items }: { items: TickerItem[] }) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  const latest = items[0];
  const latestStyle = typeStyle[latest.type] || typeStyle.signal;
  const LatestIcon = latestStyle.icon;

  return (
    <div className="rounded-xl border border-border-card bg-surface overflow-hidden">
      {/* Header — always visible, acts as toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <Radio className="w-3.5 h-3.5 text-status-verified animate-pulse shrink-0" />
        <span className="text-xs font-semibold text-primary">Signals</span>
        <span className="text-[11px] text-secondary truncate flex-1 flex items-center gap-1.5">
          <LatestIcon className={`w-3 h-3 shrink-0 ${latestStyle.color}`} />
          {latest.agent} {latest.action}
          {latest.value && <span className="text-primary-accent font-medium">{latest.value}</span>}
        </span>
        <span className="text-[10px] text-secondary/60 shrink-0">{items.length}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-secondary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="border-t border-border-card max-h-52 overflow-y-auto">
          {items.map((item) => {
            const style = typeStyle[item.type] || typeStyle.signal;
            const Icon = style.icon;
            return (
              <div
                key={item.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface/80 transition-colors"
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${style.color}`} />
                <span className="text-xs font-semibold text-primary">{item.agent}</span>
                <span className="text-[11px] text-secondary">{item.action}</span>
                <span className="text-[11px] text-secondary truncate flex-1">{item.detail}</span>
                {item.value && (
                  <span className="text-[11px] font-medium text-primary-accent shrink-0">{item.value}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
