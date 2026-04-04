'use client';

import { BarChart3, Clock, DollarSign, Gauge, Globe, Star, Zap } from 'lucide-react';

export interface SignalData {
  value: number;
  unit: string;
  rank?: number;
  total?: number;
  tag2?: string;
}

export interface ResourceSignals {
  cost?: SignalData;
  latency?: SignalData;
  uptime?: SignalData;
  compute?: SignalData;
  region?: SignalData;
  quality?: SignalData;
  availability?: SignalData;
}

const signalConfig = {
  cost: { icon: DollarSign, label: 'Cost', color: 'text-green-600' },
  latency: { icon: Zap, label: 'Latency', color: 'text-amber-600' },
  uptime: { icon: Clock, label: 'Uptime', color: 'text-blue-600' },
  compute: { icon: Gauge, label: 'Compute', color: 'text-purple-600' },
  region: { icon: Globe, label: 'Region', color: 'text-cyan-600' },
  quality: { icon: Star, label: 'Quality', color: 'text-yellow-600' },
  availability: { icon: BarChart3, label: 'Available', color: 'text-emerald-600' },
} as const;

function SignalBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className="rounded-full bg-primary-accent transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface ReputationSignalsProps {
  signals: ResourceSignals;
  compact?: boolean;
}

export function ReputationSignals({ signals, compact = false }: ReputationSignalsProps) {
  const entries = Object.entries(signals).filter(
    ([, data]) => data !== undefined
  ) as [keyof ResourceSignals, SignalData][];

  if (entries.length === 0) {
    return (
      <p className="text-xs text-secondary">No reputation signals yet</p>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {entries.slice(0, 4).map(([key, data]) => {
          const config = signalConfig[key];
          const Icon = config.icon;
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <Icon className={`h-3 w-3 ${config.color}`} />
              <span className="text-secondary">{config.label}:</span>
              <span className="font-medium text-primary">
                {formatValue(key, data)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, data]) => {
        const config = signalConfig[key];
        const Icon = config.icon;
        const normalizedValue = normalizeForBar(key, data);
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <span className="text-sm font-medium text-primary">
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">
                  {formatValue(key, data)}
                </span>
                {data.rank && data.total && (
                  <span className="text-xs text-secondary">
                    #{data.rank} of {data.total}
                  </span>
                )}
              </div>
            </div>
            <SignalBar value={normalizedValue} />
          </div>
        );
      })}
    </div>
  );
}

function formatValue(key: string, data: SignalData): string {
  switch (key) {
    case 'cost':
      return `$${data.value}/${data.unit.replace('$/','') || '1K tok'}`;
    case 'latency':
      return `${data.value}ms`;
    case 'uptime':
      return `${data.value}%`;
    case 'compute':
      return data.unit === 'context-tokens'
        ? `${(data.value / 1000).toFixed(0)}K ctx`
        : `${data.value} ${data.unit}`;
    case 'region':
      return data.tag2?.toUpperCase() || `${data.value}/100`;
    case 'quality':
      return `${data.value}/100`;
    case 'availability':
      return data.tag2 || `${data.value}`;
    default:
      return `${data.value} ${data.unit}`;
  }
}

function normalizeForBar(key: string, data: SignalData): number {
  switch (key) {
    case 'cost':
      return Math.max(0, 100 - data.value * 500);
    case 'latency':
      return Math.max(0, 100 - data.value / 5);
    case 'uptime':
      return data.value;
    case 'compute':
      return Math.min(data.value / 1280, 100);
    case 'quality':
      return data.value;
    case 'region':
      return data.value;
    default:
      return data.value;
  }
}
