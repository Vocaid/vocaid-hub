'use client';

import { useState, useMemo } from 'react';
import { ResourceCard, type ResourceCardProps, type ResourceType } from '@/components/ResourceCard';

type FilterTab = 'all' | ResourceType;

const tabs: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'gpu', label: 'GPU' },
  { value: 'agent', label: 'Agent' },
  { value: 'human', label: 'Human' },
];

export function MarketplaceContent({ resources }: { resources: ResourceCardProps[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filtered = useMemo(
    () => activeTab === 'all' ? resources : resources.filter((r) => r.type === activeTab),
    [activeTab, resources],
  );

  return (
    <>
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

      {/* Resource cards */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((resource) => (
            <ResourceCard key={`${resource.type}-${resource.name}`} {...resource} />
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
    </>
  );
}
