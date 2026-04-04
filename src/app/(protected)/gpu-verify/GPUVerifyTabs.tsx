'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Bot, ChevronDown, Cpu, Plus, User, Wifi, Loader2, Check } from 'lucide-react';
import GPUStepper from '@/components/GPUStepper';
import { ResourceCard, type ResourceCardProps } from '@/components/ResourceCard';
import {
  ReputationSignals,
  type ResourceSignals,
} from '@/components/ReputationSignals';

/* ─── Session helper for registration ──────────── */
async function getSessionAddress(): Promise<{ address: string; worldId: string } | null> {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.user?.walletAddress || data?.user?.address;
    if (!addr) return null;
    return { address: addr, worldId: addr };
  } catch {
    return null;
  }
}

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
  const [registerType, setRegisterType] = useState<'gpu' | 'agent' | 'human' | 'depin'>('gpu');

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
          {registerType === 'agent' && <AgentRegisterPanel />}
          {registerType === 'human' && <HumanRegisterPanel />}
          {registerType === 'depin' && <DePINRegisterPanel />}
        </>
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
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl bg-surface"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
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
              {filtered.map((resource, idx) => (
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

/* ─── Resource Agent Registration Panel ─────────────── */

const AGENT_CAPABILITIES = [
  { id: 'signal-analysis', label: 'Signal Analysis' },
  { id: 'code-review', label: 'Code Review' },
  { id: 'data-processing', label: 'Data Processing' },
  { id: 'translation', label: 'Translation' },
  { id: 'custom', label: 'Custom' },
];

function AgentRegisterPanel() {
  const [agentName, setAgentName] = useState('');
  const [capability, setCapability] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleRegister() {
    if (!agentName || !capability) return;
    setStatus('loading');
    try {
      const session = await getSessionAddress();
      if (!session) { setStatus('error'); return; }

      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentURI: `resource-agent:${capability}:${agentName}`,
          role: 'resource-agent',
          operatorWorldId: session.worldId,
          operatorAddress: session.address,
        }),
      });
      if (!res.ok) throw new Error('Registration failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border-card bg-white p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary-accent" />
          <h3 className="font-semibold text-primary">Register AI Agent</h3>
        </div>
        <p className="text-xs text-secondary">
          List your AI agent as a leasable resource on the marketplace.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="agent-name" className="text-sm font-medium text-primary">Agent Name</label>
          <input
            id="agent-name"
            type="text"
            placeholder="e.g. Orion, DataBot-7"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="agent-capability" className="text-sm font-medium text-primary">Capability</label>
          <select
            id="agent-capability"
            value={capability ?? ''}
            onChange={(e) => setCapability(e.target.value || null)}
            className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 cursor-pointer"
          >
            <option value="">Select capability...</option>
            {AGENT_CAPABILITIES.map((cap) => (
              <option key={cap.id} value={cap.id}>{cap.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="agent-price" className="text-sm font-medium text-primary">Price (optional)</label>
          <input
            id="agent-price"
            type="text"
            placeholder="e.g. $0.01/query, $5/hr"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
          />
        </div>

        {status === 'success' && (
          <div className="rounded-lg bg-status-verified/10 border border-status-verified/30 p-3">
            <div className="flex items-center gap-2 text-status-verified text-sm font-medium">
              <Check className="h-4 w-4" /> Agent listed on marketplace
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg bg-status-failed/10 border border-status-failed/30 p-3">
            <p className="text-xs text-status-failed">Registration failed. Check connection and try again.</p>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={!agentName || !capability || status === 'loading'}
          className="w-full min-h-[44px] rounded-lg bg-primary-accent text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
        >
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'loading' ? 'Registering...' : 'List Agent on Marketplace'}
        </button>
      </div>
    </div>
  );
}

/* ─── Human Skills Registration Panel ────────────── */

const SKILL_CATEGORIES = [
  { id: 'engineering', label: 'Engineering', examples: 'Rust, Solidity, ML/AI' },
  { id: 'design', label: 'Design', examples: 'UI/UX, Brand, Motion' },
  { id: 'operations', label: 'Operations', examples: 'DevOps, QA, PM' },
  { id: 'research', label: 'Research', examples: 'Security, Protocol, Data' },
];

function HumanRegisterPanel() {
  const [category, setCategory] = useState<string | null>(null);
  const [skillName, setSkillName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleRegister() {
    if (!category || !skillName) return;
    setStatus('loading');
    try {
      const session = await getSessionAddress();
      if (!session) { setStatus('error'); return; }

      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentURI: `human:${category}:${skillName}`,
          role: 'human-provider',
          operatorWorldId: session.worldId,
          operatorAddress: session.address,
        }),
      });
      if (!res.ok) throw new Error('Registration failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border-card bg-white p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary-accent" />
          <h3 className="font-semibold text-primary">Register Human Skills</h3>
        </div>
        <p className="text-xs text-secondary">Offer your verified skills for hire. World ID proves you&apos;re human.</p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="skill-category" className="text-sm font-medium text-primary">Category</label>
          <select
            id="skill-category"
            value={category ?? ''}
            onChange={(e) => setCategory(e.target.value || null)}
            className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 cursor-pointer"
          >
            <option value="">Select category...</option>
            {SKILL_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label} — {cat.examples}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="skill-name" className="text-sm font-medium text-primary">Skill Name</label>
          <input
            id="skill-name"
            type="text"
            placeholder="e.g. Rust Developer L4, Solidity Auditor"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="hourly-rate" className="text-sm font-medium text-primary">Hourly Rate (optional)</label>
          <input
            id="hourly-rate"
            type="text"
            placeholder="e.g. $25/hr"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
          />
        </div>

        {status === 'success' && (
          <div className="rounded-lg bg-status-verified/10 border border-status-verified/30 p-3">
            <div className="flex items-center gap-2 text-status-verified text-sm font-medium">
              <Check className="h-4 w-4" /> Skills registered on ERC-8004
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg bg-status-failed/10 border border-status-failed/30 p-3">
            <p className="text-xs text-status-failed">Registration failed. Check connection and try again.</p>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={!category || !skillName || status === 'loading'}
          className="w-full min-h-[44px] rounded-lg bg-primary-accent text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
        >
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'loading' ? 'Registering...' : 'Register Skills'}
        </button>
      </div>
    </div>
  );
}

/* ─── DePIN Registration Panel ───────────────────── */

const DEPIN_TYPES = [
  { id: 'compute', label: 'Compute', desc: 'CPU/GPU bare metal' },
  { id: 'storage', label: 'Storage', desc: 'NVMe, HDD arrays' },
  { id: 'bandwidth', label: 'Bandwidth', desc: 'Network capacity' },
  { id: 'energy', label: 'Energy', desc: 'Solar, grid power' },
];

function DePINRegisterPanel() {
  const [infraType, setInfraType] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleRegister() {
    if (!infraType) return;
    setStatus('loading');
    try {
      const session = await getSessionAddress();
      if (!session) { setStatus('error'); return; }

      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentURI: `depin:${infraType}:${location || 'remote'}`,
          role: 'depin-provider',
          operatorWorldId: session.worldId,
          operatorAddress: session.address,
        }),
      });
      if (!res.ok) throw new Error('Registration failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border-card bg-white p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary-accent" />
          <h3 className="font-semibold text-primary">Register Physical Infrastructure</h3>
        </div>
        <p className="text-xs text-secondary">Register DePIN hardware — verified on-chain, discoverable by any agent.</p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="depin-type" className="text-sm font-medium text-primary">Infrastructure Type</label>
          <select
            id="depin-type"
            value={infraType ?? ''}
            onChange={(e) => setInfraType(e.target.value || null)}
            className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 cursor-pointer"
          >
            <option value="">Select type...</option>
            {DEPIN_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label} — {t.desc}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="depin-location" className="text-sm font-medium text-primary">Location (optional)</label>
          <input
            id="depin-location"
            type="text"
            placeholder="e.g. US-East, EU-West"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="depin-capacity" className="text-sm font-medium text-primary">Capacity (optional)</label>
          <input
            id="depin-capacity"
            type="text"
            placeholder="e.g. 10TB, 100Mbps, 5kW"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
          />
        </div>

        {status === 'success' && (
          <div className="rounded-lg bg-status-verified/10 border border-status-verified/30 p-3">
            <div className="flex items-center gap-2 text-status-verified text-sm font-medium">
              <Check className="h-4 w-4" /> Infrastructure registered on ERC-8004
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg bg-status-failed/10 border border-status-failed/30 p-3">
            <p className="text-xs text-status-failed">Registration failed. Check connection and try again.</p>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={!infraType || status === 'loading'}
          className="w-full min-h-[44px] rounded-lg bg-primary-accent text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
        >
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'loading' ? 'Registering...' : 'Register Infrastructure'}
        </button>
      </div>
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

      <p className="text-center text-xs text-secondary">
        This resource is listed on the <a href="/home" className="text-primary-accent font-medium">Market</a> for lease via x402 USDC on Hedera.
      </p>
    </div>
  );
}
