'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Cpu, Plus, Pause, Play, ShieldCheck } from 'lucide-react';
import ResourceStepper from '@/components/ResourceStepper';
import { ChainBadge } from '@/components/ChainBadge';
import { ReputationBar } from '@/components/ReputationBar';
import type { ResourceCardProps } from '@/components/ResourceCard';
import type { Chain } from '@/components/ChainBadge';
import {
  ReputationSignals,
  type ResourceSignals,
} from '@/components/ReputationSignals';

type Tab = 'my-resources' | 'register';

interface ManagedResource extends ResourceCardProps {
  agentId?: number;
  signals?: ResourceSignals;
  owner?: string;
  active?: boolean;
}

export default function GPUVerifyTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('my-resources');
  const [resources, setResources] = useState<ManagedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [paused, setPaused] = useState<Set<string>>(new Set());

  // Fetch session address
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const addr = data?.user?.walletAddress || data?.user?.address;
        if (addr) setUserAddress(addr.toLowerCase());
      })
      .catch(() => {});
  }, []);

  // Fetch resources and filter to user's own
  const fetchMyResources = useCallback(() => {
    setLoading(true);
    fetch('/api/resources')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const all: ManagedResource[] = Array.isArray(data) ? data : data.resources || [];
        // Always filter to user's own resources — no exceptions
        const mine = userAddress
          ? all.filter((r) => r.owner?.toLowerCase() === userAddress)
          : [];
        setResources(mine);
      })
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [userAddress]);

  useEffect(() => {
    if (activeTab !== 'my-resources') return;
    fetchMyResources();
  }, [activeTab, fetchMyResources]);

  function togglePause(name: string) {
    setPaused((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex rounded-lg border border-border-card bg-surface p-1">
        <button
          onClick={() => setActiveTab('my-resources')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'my-resources'
              ? 'bg-white text-primary shadow-sm'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Manage
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'register'
              ? 'bg-white text-primary shadow-sm'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <Plus className="h-4 w-4" />
          Register
        </button>
      </div>

      {/* Register Tab */}
      {activeTab === 'register' && <ResourceStepper />}

      {/* My Resources Tab */}
      {activeTab === 'my-resources' && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-card p-8 text-center">
              <Cpu className="mx-auto mb-2 h-8 w-8 text-secondary" />
              <p className="text-sm text-secondary">No resources registered yet</p>
              <p className="text-xs text-secondary mt-1">Resources you register here will be discoverable on the Market for agents and users to hire</p>
              <button
                onClick={() => setActiveTab('register')}
                className="mt-3 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white cursor-pointer"
              >
                Register Resource
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-secondary">{resources.length} resource{resources.length !== 1 ? 's' : ''} registered</p>
              {resources.map((r, idx) => {
                const isPaused = paused.has(r.name);
                return (
                  <div key={idx} className={`rounded-xl border bg-white p-4 shadow-sm transition-opacity ${isPaused ? 'opacity-60 border-border-card' : 'border-border-card'}`}>
                    {/* Header row */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-primary truncate">{r.name}</p>
                          <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            isPaused
                              ? 'bg-status-pending/10 text-status-pending'
                              : 'bg-status-verified/10 text-status-verified'
                          }`}>
                            {isPaused ? 'Paused' : 'Active'}
                          </span>
                        </div>
                        <p className="text-xs text-secondary truncate">{r.subtitle}</p>
                      </div>
                      <ChainBadge chain={r.chain as Chain} />
                    </div>

                    {/* Info row */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-mono text-primary-accent">{r.price}</span>
                      <span className="text-[10px] text-secondary">·</span>
                      <span className="text-xs text-secondary capitalize">{r.type}</span>
                      <span className="text-[10px] text-secondary">·</span>
                      <span className={`flex items-center gap-1 text-xs ${r.verified ? 'text-status-verified' : 'text-secondary'}`}>
                        {r.verified ? <><ShieldCheck className="w-3 h-3" /> Verified</> : 'Unverified'}
                      </span>
                    </div>

                    {/* Reputation */}
                    <ReputationBar score={r.reputation} />

                    {/* Signals */}
                    {r.signals && (
                      <div className="mt-2 rounded-lg bg-surface p-2">
                        <ReputationSignals signals={r.signals} compact />
                      </div>
                    )}

                    {/* Management controls */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => togglePause(r.name)}
                        className={`flex-1 min-h-[36px] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          isPaused
                            ? 'bg-status-verified/10 text-status-verified hover:bg-status-verified/20'
                            : 'bg-status-pending/10 text-status-pending hover:bg-status-pending/20'
                        }`}
                      >
                        {isPaused ? <><Play className="w-3.5 h-3.5" /> Activate</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
