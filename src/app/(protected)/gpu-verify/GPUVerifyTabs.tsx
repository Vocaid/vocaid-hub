'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Bot, Cpu, Plus, User, Wifi, Loader2, Check } from 'lucide-react';
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
          {registerType === 'agent' && <AgentRegisterPanel />}
          {registerType === 'human' && <HumanRegisterPanel />}
          {registerType === 'depin' && <DePINRegisterPanel />}
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
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="h-5 w-5 text-primary-accent" />
          <h3 className="font-semibold text-primary">Register AI Agent</h3>
        </div>
        <p className="text-xs text-secondary mb-4">
          List your AI agent as a leasable resource on the marketplace. Other users and agents can discover and hire it.
        </p>

        <input
          type="text"
          placeholder="Agent name (e.g. Orion, DataBot-7)"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary-accent"
        />

        <p className="text-[10px] text-secondary mb-1.5">Capability</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {AGENT_CAPABILITIES.map((cap) => (
            <button
              key={cap.id}
              onClick={() => setCapability(cap.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                capability === cap.id
                  ? 'bg-primary-accent text-white'
                  : 'bg-surface text-secondary hover:text-primary'
              }`}
            >
              {cap.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Price (e.g. $0.01/query, $5/hr)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary-accent"
        />

        {status === 'success' && (
          <div className="rounded-lg bg-green-50 p-3 mb-3">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <Check className="h-4 w-4" /> Agent listed on marketplace
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg bg-red-50 p-3 mb-3">
            <p className="text-xs text-red-600">Registration failed. Verify World ID and try again.</p>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={!agentName || !capability || status === 'loading'}
          className="w-full rounded-lg bg-primary-accent py-2.5 text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'loading' ? 'Registering...' : 'List Agent on Marketplace'}
        </button>
      </div>

      <p className="text-center text-[10px] text-secondary">
        Looking for OpenClaw trading agents (Seer, Edge, Shield, Lens)? Deploy them from your <strong>Profile</strong> page.
      </p>
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
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-5 w-5 text-chain-world" />
          <h3 className="font-semibold text-primary">Register Human Skills</h3>
        </div>
        <p className="text-xs text-secondary mb-4">Offer your verified skills for hire. World ID proves you&apos;re human — agents can lease your expertise.</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {SKILL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`rounded-lg border p-2.5 text-left transition-colors ${
                category === cat.id
                  ? 'border-primary-accent bg-primary-accent/5'
                  : 'border-border hover:border-primary-accent/50'
              }`}
            >
              <span className="text-xs font-medium text-primary">{cat.label}</span>
              <span className="block text-[10px] text-secondary mt-0.5">{cat.examples}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Skill name (e.g. Rust L4, Solidity Auditor)"
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-2 focus:outline-none focus:border-primary-accent"
        />
        <input
          type="text"
          placeholder="Hourly rate (e.g. $25/hr)"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary-accent"
        />

        {status === 'success' && (
          <div className="rounded-lg bg-green-50 p-3 mb-3">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <Check className="h-4 w-4" /> Skills registered on ERC-8004
            </div>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={!category || !skillName || status === 'loading'}
          className="w-full rounded-lg bg-primary-accent py-2.5 text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'loading' ? 'Registering...' : 'Register Skills'}
        </button>
      </div>
      <div className="flex items-center justify-center gap-3 text-xs text-secondary">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chain-world" /> World ID Verified</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chain-og" /> ERC-8004</span>
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
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wifi className="h-5 w-5 text-chain-hedera" />
          <h3 className="font-semibold text-primary">Register Physical Infrastructure</h3>
        </div>
        <p className="text-xs text-secondary mb-4">Register DePIN hardware for the agentic economy — verified on-chain, discoverable by any agent.</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {DEPIN_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setInfraType(t.id)}
              className={`rounded-lg border p-2.5 text-left transition-colors ${
                infraType === t.id
                  ? 'border-primary-accent bg-primary-accent/5'
                  : 'border-border hover:border-primary-accent/50'
              }`}
            >
              <span className="text-xs font-medium text-primary">{t.label}</span>
              <span className="block text-[10px] text-secondary mt-0.5">{t.desc}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Location (e.g. US-East, EU-West)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-2 focus:outline-none focus:border-primary-accent"
        />
        <input
          type="text"
          placeholder="Capacity (e.g. 10TB, 100Mbps, 5kW)"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary-accent"
        />

        {status === 'success' && (
          <div className="rounded-lg bg-green-50 p-3 mb-3">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <Check className="h-4 w-4" /> Infrastructure registered on ERC-8004
            </div>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={!infraType || status === 'loading'}
          className="w-full rounded-lg bg-primary-accent py-2.5 text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'loading' ? 'Registering...' : 'Register Infrastructure'}
        </button>
      </div>
      <div className="flex items-center justify-center gap-3 text-xs text-secondary">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chain-og" /> 0G Chain</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chain-hedera" /> Hedera Audit</span>
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
