'use client';

import { useState, useEffect } from 'react';
import { BarChart3, ChevronDown, Cpu, Plus, Check } from 'lucide-react';
import ResourceStepper from '@/components/ResourceStepper';
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
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedResource, setSelectedResource] =
    useState<ResourceWithSignals | null>(null);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    setLoading(true);
    fetch('/api/resources')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setResources(Array.isArray(data) ? data : data.resources || []))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const filtered = filterTypes.size === 0
    ? resources
    : resources.filter((r) => filterTypes.has(r.type));

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex rounded-lg border border-border-card bg-surface p-1">
        <button
          onClick={() => { setActiveTab('dashboard'); setSelectedResource(null); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
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

      {/* Register Tab → Unified ResourceStepper */}
      {activeTab === 'register' && <ResourceStepper />}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && selectedResource && (
        <ResourceDetailView resource={selectedResource} onBack={() => setSelectedResource(null)} />
      )}

      {activeTab === 'dashboard' && !selectedResource && (
        <>
          {/* Resource Type Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full min-h-[40px] px-3 rounded-lg border border-border-card bg-white text-sm text-primary flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">
                {filterTypes.size === 0
                  ? 'All Resource Types'
                  : [...filterTypes].map((t) => t === 'depin' ? 'DePIN' : t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
              </span>
              <ChevronDown className="w-4 h-4 text-secondary shrink-0 ml-2" />
            </button>
            {showFilterDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-border-card bg-white shadow-lg py-1 animate-fade-in">
                {(['gpu', 'agent', 'human', 'depin'] as const).map((t) => {
                  const active = filterTypes.has(t);
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setFilterTypes((prev) => {
                          const next = new Set(prev);
                          if (next.has(t)) next.delete(t); else next.add(t);
                          return next;
                        });
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 cursor-pointer ${
                        active ? 'text-primary-accent font-medium' : 'text-primary hover:bg-surface'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        active ? 'bg-primary-accent border-primary-accent' : 'border-border-card'
                      }`}>
                        {active && <Check className="w-3 h-3 text-white" />}
                      </span>
                      {t === 'depin' ? 'DePIN' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  );
                })}
                {filterTypes.size > 0 && (
                  <button
                    onClick={() => { setFilterTypes(new Set()); setShowFilterDropdown(false); }}
                    className="w-full px-3 py-2 text-left text-xs text-secondary hover:text-primary border-t border-border-card mt-1 pt-2 cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Resource List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-card p-8 text-center">
              <Cpu className="mx-auto mb-2 h-8 w-8 text-secondary" />
              <p className="text-sm text-secondary">No resources registered yet</p>
              <button
                onClick={() => setActiveTab('register')}
                className="mt-3 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white cursor-pointer"
              >
                Register a Provider
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((resource, idx) => (
                <div key={idx} className="space-y-2">
                  <ResourceCard
                    {...resource}
                    onHire={() => setSelectedResource(resource)}
                  />
                  {resource.signals && (
                    <div className="ml-2 rounded-lg bg-surface p-3">
                      <ReputationSignals signals={resource.signals} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Resource Detail View ─────────────────────────── */

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
        className="flex items-center gap-1 text-sm text-primary-accent cursor-pointer"
      >
        ← Back to Dashboard
      </button>

      <div className="rounded-xl border border-border-card bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-accent/10">
            <Cpu className="h-6 w-6 text-primary-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary">{resource.name}</h3>
            <p className="text-sm text-secondary">
              {resource.subtitle || resource.type.toUpperCase()}
              {resource.region && ` · ${resource.region}`}
            </p>
          </div>
        </div>

        {resource.agentId && (
          <p className="mb-4 text-xs text-secondary">ERC-8004 ID: #{resource.agentId}</p>
        )}

        <h4 className="mb-3 text-sm font-semibold text-primary">Reputation Signals</h4>
        {resource.signals ? (
          <ReputationSignals signals={resource.signals} />
        ) : (
          <p className="text-sm text-secondary">No signals recorded yet</p>
        )}
      </div>
    </div>
  );
}
