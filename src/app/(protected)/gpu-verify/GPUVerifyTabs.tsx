'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Cpu, Plus } from 'lucide-react';
import GPUStepper from '@/components/GPUStepper';
import { ResourceCard, type ResourceCardProps } from '@/components/ResourceCard';
import {
  ReputationSignals,
  type ResourceSignals,
} from '@/components/ReputationSignals';

type Tab = 'dashboard' | 'register';

interface ResourceWithSignals extends ResourceCardProps {
  agentId?: number;
  signals?: ResourceSignals;
  region?: string;
}

export default function GPUVerifyTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [resources, setResources] = useState<ResourceWithSignals[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('quality');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedResource, setSelectedResource] =
    useState<ResourceWithSignals | null>(null);
  const [registerType, setRegisterType] = useState<'gpu' | 'agent' | 'human' | 'depin'>('gpu');

  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    setLoading(true);
    fetch(`/api/resources?sort=${sortBy}&type=${filterType === 'all' ? '' : filterType}`)
      .then((r) => (r.ok ? r.json() : { resources: [] }))
      .then((data) => setResources(data.resources || []))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [activeTab, sortBy, filterType]);

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex rounded-lg border border-border bg-surface p-1">
        <button
          onClick={() => { setActiveTab('dashboard'); setSelectedResource(null); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'bg-white text-primary shadow-sm'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Dashboard
        </button>
        <button
          onClick={() => { setActiveTab('register'); setSelectedResource(null); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'register'
              ? 'bg-white text-primary shadow-sm'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <Plus className="h-4 w-4" />
          Register
        </button>
      </div>

      {activeTab === 'register' && (
        <>
          <div className="flex gap-1 mb-4">
            {(['gpu', 'agent', 'human', 'depin'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRegisterType(t)}
                className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
                  registerType === t
                    ? 'bg-primary text-white'
                    : 'bg-surface text-secondary hover:text-primary'
                }`}
              >
                {t === 'depin' ? 'DePIN' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {registerType === 'gpu' && <GPUStepper />}
          {registerType !== 'gpu' && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-secondary">
                {registerType === 'agent' ? 'Register an AI agent on ERC-8004' :
                 registerType === 'human' ? 'Register human skills and availability' :
                 'Register physical infrastructure (electricity, bandwidth, storage)'}
              </p>
              <p className="text-xs text-secondary/60 mt-2">Coming soon — use the Market tab to browse existing resources</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'dashboard' && !selectedResource && (
        <>
          {/* Sort + Filter Bar */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs text-primary"
            >
              <option value="quality">Quality</option>
              <option value="cost">Cost</option>
              <option value="latency">Latency</option>
              <option value="uptime">Uptime</option>
            </select>
            <div className="flex gap-1">
              {['all', 'gpu', 'agent', 'human', 'depin'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterType === t
                      ? 'bg-primary-accent text-white'
                      : 'bg-surface text-secondary hover:text-primary'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'depin' ? 'DePIN' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Resource List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl bg-surface"
                />
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Cpu className="mx-auto mb-2 h-8 w-8 text-secondary" />
              <p className="text-sm text-secondary">
                No resources registered yet
              </p>
              <button
                onClick={() => setActiveTab('register')}
                className="mt-3 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white"
              >
                Register a Provider
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource, idx) => (
                <div key={idx} className="space-y-2">
                  <ResourceCard
                    {...resource}
                    onHire={() => setSelectedResource(resource)}
                  />
                  {resource.signals && (
                    <div className="ml-2 rounded-lg bg-surface p-3">
                      <ReputationSignals
                        signals={resource.signals}
                        compact
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail View */}
      {activeTab === 'dashboard' && selectedResource && (
        <ResourceDetailView
          resource={selectedResource}
          onBack={() => setSelectedResource(null)}
        />
      )}
    </div>
  );
}

function ResourceDetailView({
  resource,
  onBack,
}: {
  resource: ResourceWithSignals;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-primary-accent"
      >
        ← Back to Dashboard
      </button>

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chain-og/10">
            <Cpu className="h-6 w-6 text-chain-og" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary">
              {resource.name}
            </h3>
            <p className="text-sm text-secondary">
              {resource.subtitle || resource.type.toUpperCase()}
              {resource.region && ` · ${resource.region}`}
            </p>
          </div>
        </div>

        {resource.agentId && (
          <p className="mb-4 text-xs text-secondary">
            ERC-8004 ID: #{resource.agentId}
          </p>
        )}

        <h4 className="mb-3 text-sm font-semibold text-primary">
          Reputation Signals
        </h4>
        {resource.signals ? (
          <ReputationSignals signals={resource.signals} />
        ) : (
          <p className="text-sm text-secondary">No signals recorded yet</p>
        )}
      </div>

      <button
        className="w-full rounded-xl bg-primary-accent py-3 text-center font-semibold text-white transition-colors hover:bg-primary-accent/90"
      >
        Hire — {resource.price} · x402 USDC on Hedera
      </button>
    </div>
  );
}
