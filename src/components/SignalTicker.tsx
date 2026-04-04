'use client';

import {
  Eye, TrendingUp, Zap, ShieldCheck, BarChart3,
  ArrowRightLeft, Cpu, Wrench, ChevronDown, Radio,
} from 'lucide-react';
import { useState } from 'react';
import type { ActivityItem } from './ActivityFeed';

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

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Signals' },
  { value: 'reputation', label: 'Reputation' },
  { value: 'prediction', label: 'Prediction' },
  { value: 'payment', label: 'Payment' },
  { value: 'verification', label: 'Verification' },
  { value: 'signal', label: 'Signal' },
  { value: 'trade', label: 'Trade' },
  { value: 'depin', label: 'DePIN' },
  { value: 'skill', label: 'Skill' },
];

export function SignalTicker({ items }: { items: ActivityItem[] }) {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [showFilter, setShowFilter] = useState(false);

  if (items.length === 0) return null;

  const filtered = filterType === 'all' ? items : items.filter((i) => i.type === filterType);
  const latest = filtered[0] ?? items[0];
  const latestStyle = typeStyle[latest.type] || typeStyle.signal;
  const LatestIcon = latestStyle.icon;
  const filterLabel = FILTER_OPTIONS.find((o) => o.value === filterType)?.label ?? 'All Signals';

  return (
    <div className="rounded-xl border border-border-card bg-surface overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => { setOpen(!open); setShowFilter(false); }}
          className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5 text-status-verified animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-primary shrink-0">Signals</span>
          <span className="text-[11px] text-secondary truncate flex-1 flex items-center gap-1.5">
            <LatestIcon className={`w-3 h-3 shrink-0 ${latestStyle.color}`} />
            {latest.agent} {latest.action}
            {latest.value && <span className="text-primary-accent font-medium">{latest.value}</span>}
          </span>
        </button>

        {/* Filter dropdown trigger */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowFilter(!showFilter); if (!open) setOpen(true); }}
          className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md bg-white border border-border-card text-[10px] font-medium text-primary cursor-pointer hover:border-primary-accent/50 transition-colors"
        >
          {filterLabel}
          <ChevronDown className={`w-3 h-3 text-secondary transition-transform ${showFilter ? 'rotate-180' : ''}`} />
        </button>

        <span className="text-[10px] text-secondary/60 shrink-0">{filtered.length}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-secondary shrink-0 transition-transform cursor-pointer ${open ? 'rotate-180' : ''}`} onClick={() => { setOpen(!open); setShowFilter(false); }} />
      </div>

      {/* Filter picklist */}
      {showFilter && (
        <div className="border-t border-border-card bg-white px-2 py-1.5 flex flex-wrap gap-1 animate-fade-in">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilterType(opt.value); setShowFilter(false); }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium cursor-pointer transition-colors ${
                filterType === opt.value
                  ? 'bg-primary-accent text-white'
                  : 'bg-surface text-secondary hover:text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Signal list */}
      {open && (
        <div className="border-t border-border-card max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-secondary">
              No {filterLabel.toLowerCase()} signals
            </div>
          ) : (
            filtered.map((item) => {
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
            })
          )}
        </div>
      )}
    </div>
  );
}
