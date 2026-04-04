'use client';

import { useState } from 'react';
import {
  Plus,
  ShieldCheck,
  Eye,
  Search,
  ArrowRightLeft,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  AgentDecisionContent,
  type DecisionData,
} from '@/app/(protected)/agent-decision/agent-decision-content';

// ─── Pipeline steps ─────────────────────────────────────────────────────────

const PIPELINE = [
  { icon: Plus, label: 'Register', desc: 'Resources on ERC-8004' },
  { icon: ShieldCheck, label: 'Shield', desc: 'TEE + risk gate' },
  { icon: Eye, label: 'Lens', desc: 'Indexing + metadata' },
  { icon: Search, label: 'Seer', desc: 'Signal ranking' },
  { icon: ArrowRightLeft, label: 'Edge', desc: 'Trade settle' },
];

const RESOURCE_TYPES = ['all', 'gpu', 'agent', 'human', 'depin'] as const;
const QUALITY_LEVELS = [
  { label: 'Any', value: 0 },
  { label: 'Good (50+)', value: 50 },
  { label: 'Premium (80+)', value: 80 },
] as const;

interface ShieldResult {
  cleared: boolean;
  count?: number;
  avgResponse?: number;
  _demo?: boolean;
}
interface LensResult {
  providers?: unknown[];
  count?: number;
  _demo?: boolean;
}
interface EdgeResult {
  success: boolean;
  txHash?: string;
  _demo?: boolean;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function TradingDesk() {
  const [step, setStep] = useState(-1); // -1 = idle
  const [running, setRunning] = useState(false);
  const [resourceType, setResourceType] = useState<string>('all');
  const [minQuality, setMinQuality] = useState(0);

  const [shield, setShield] = useState<ShieldResult | null>(null);
  const [lens, setLens] = useState<LensResult | null>(null);
  const [seer, setSeer] = useState<DecisionData | null>(null);
  const [edge, setEdge] = useState<EdgeResult | null>(null);
  const [edgeLoading, setEdgeLoading] = useState(false);

  // ── Run the pipeline (steps 0-3) ──────────────────────────────────────────

  async function runPipeline() {
    setRunning(true);
    setShield(null);
    setLens(null);
    setSeer(null);
    setEdge(null);

    // Step 0: Register (visual)
    setStep(0);
    await delay(600);

    // Step 1: Shield clearance
    setStep(1);
    try {
      const res = await fetch('/api/agents/shield/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'requestClearance',
          params: { agentId: '7', tag: 'gpu-tee-attestation' },
        }),
      });
      const data = await res.json();
      setShield(data.result ?? { cleared: true, _demo: true });
    } catch {
      setShield({ cleared: true, _demo: true });
    }
    await delay(400);

    // Step 2: Lens observation
    setStep(2);
    try {
      const res = await fetch('/api/agents/lens/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'getObservation', params: {} }),
      });
      const data = await res.json();
      setLens(data.result ?? { count: 0, _demo: true });
    } catch {
      setLens({ count: 0, _demo: true });
    }
    await delay(400);

    // Step 3: Seer ranking
    setStep(3);
    try {
      const typeParam = resourceType !== 'all' ? `&type=${resourceType}` : '';
      const res = await fetch(`/api/agent-decision?${typeParam}`);
      const data: DecisionData = await res.json();
      if (minQuality > 0) {
        data.providers = data.providers.filter(
          (p) => p.compositeScore >= minQuality,
        );
        data.discovered = data.providers.length;
      }
      setSeer(data);
    } catch {
      setSeer(null);
    }

    setRunning(false);
  }

  // ── Step 4: Edge trade (user-triggered) ───────────────────────────────────

  async function executeTrade() {
    if (!seer?.providers?.[0]) return;
    setEdgeLoading(true);
    setStep(4);
    const top = seer.providers[0];
    try {
      const res = await fetch('/api/edge/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'hire',
          targetAgentId: top.agentId,
          resourceName: top.gpuModel,
          amount: '0.01',
        }),
      });
      const data = await res.json();
      setEdge({ success: true, txHash: data.txHash, _demo: data._demo });
    } catch {
      setEdge({ success: false, _demo: true });
    }
    setEdgeLoading(false);
  }

  const pipelineDone = step >= 3 && !running;
  const tradeDone = edge !== null;

  return (
    <div className="space-y-4">
      {/* ── Fleet context ──────────────────────────────────────────── */}
      <p className="text-[10px] text-secondary text-center -mb-2">
        Your OpenClaw fleet (deployed from Profile) finds and leases the best resource
      </p>

      {/* ── Pipeline Stepper ─────────────────────────────────────────── */}
      <div className="flex items-start gap-0 px-1">
        {PIPELINE.map((s, i) => {
          const Icon = s.icon;
          const done = i < step || (i === step && !running && i < 4) || tradeDone;
          const active = i === step && (running || (i === 4 && edgeLoading));
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1 relative">
              {/* Connecting line (before each step except first) */}
              {i > 0 && (
                <div
                  className="absolute top-[18px] right-1/2 w-full h-0.5 -z-10 transition-colors duration-500"
                  style={{ backgroundColor: done || active ? 'var(--color-primary-accent)' : 'var(--color-border-card)' }}
                />
              )}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                  done
                    ? 'bg-status-verified text-white'
                    : active
                      ? 'bg-primary-accent text-white shadow-lg scale-110'
                      : 'bg-surface border border-border-card text-secondary'
                }`}
              >
                {active ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : done ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[9px] font-medium ${
                  active ? 'text-primary-accent' : done ? 'text-status-verified' : 'text-secondary'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Preferences ──────────────────────────────────────────────── */}
      {step < 0 && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-3 animate-fade-in">
          <p className="text-sm font-semibold text-primary">Resource Preferences</p>

          {/* Type filter */}
          <div>
            <p className="text-[10px] text-secondary mb-1.5">Resource Type</p>
            <div className="flex gap-1">
              {RESOURCE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setResourceType(t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    resourceType === t
                      ? 'bg-primary-accent text-white'
                      : 'bg-surface text-secondary hover:text-primary'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'depin' ? 'DePIN' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quality threshold */}
          <div>
            <p className="text-[10px] text-secondary mb-1.5">Minimum Quality</p>
            <div className="flex gap-1">
              {QUALITY_LEVELS.map((q) => (
                <button
                  key={q.value}
                  onClick={() => setMinQuality(q.value)}
                  className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
                    minQuality === q.value
                      ? 'bg-primary text-white'
                      : 'bg-surface text-secondary hover:text-primary'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={runPipeline}
            className="w-full rounded-lg bg-primary-accent py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Find Best Resource
          </button>
        </div>
      )}

      {/* ── Pipeline Results ──────────────────────────────────────────── */}

      {/* Shield result */}
      {shield && (
        <div className="rounded-xl border border-border bg-white p-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${shield.cleared ? 'text-status-verified' : 'text-status-failed'}`} />
            <span className="text-xs font-medium text-primary">
              Shield: {shield.cleared ? 'Clearance Approved' : 'Clearance Denied'}
            </span>
            {shield._demo && <span className="text-[9px] text-secondary bg-surface px-1.5 py-0.5 rounded-full">demo</span>}
          </div>
          {shield.count !== undefined && (
            <p className="text-[10px] text-secondary mt-1 ml-6">
              {shield.count} validations · avg score {shield.avgResponse ?? 0}
            </p>
          )}
        </div>
      )}

      {/* Lens result */}
      {lens && (
        <div className="rounded-xl border border-border bg-white p-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary-accent" />
            <span className="text-xs font-medium text-primary">
              Lens: {lens.count ?? (lens.providers as unknown[])?.length ?? 0} resources indexed
            </span>
            {lens._demo && <span className="text-[9px] text-secondary bg-surface px-1.5 py-0.5 rounded-full">demo</span>}
          </div>
        </div>
      )}

      {/* Seer results (embedded decision component) */}
      {seer && (
        <div className="animate-fade-in">
          <AgentDecisionContent decision={seer} resourceType={resourceType} />
        </div>
      )}

      {/* Edge execution */}
      {tradeDone && edge && (
        <div className={`rounded-xl border-2 p-4 animate-fade-in ${edge.success ? 'border-status-verified bg-status-verified/5' : 'border-status-failed bg-status-failed/5'}`}>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className={`w-5 h-5 ${edge.success ? 'text-status-verified' : 'text-status-failed'}`} />
            <div>
              <p className="text-sm font-semibold text-primary">
                {edge.success ? 'Trade Settled via Edge' : 'Trade Failed'}
              </p>
              {edge.txHash && (
                <p className="text-[10px] text-secondary font-mono mt-0.5">
                  tx: {edge.txHash.slice(0, 10)}...{edge.txHash.slice(-8)}
                </p>
              )}
            </div>
            {edge._demo && <span className="text-[9px] text-secondary bg-surface px-1.5 py-0.5 rounded-full ml-auto">demo</span>}
          </div>
        </div>
      )}

      {/* Lease button (after Seer, before Edge) */}
      {pipelineDone && !tradeDone && seer && seer.providers.length > 0 && (
        <button
          onClick={executeTrade}
          disabled={edgeLoading}
          className="w-full rounded-lg bg-primary-accent py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 animate-fade-in"
        >
          {edgeLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Settling via Edge...
            </>
          ) : (
            <>
              <ArrowRightLeft className="w-4 h-4" />
              Lease Top Resource — x402 USDC on Hedera
            </>
          )}
        </button>
      )}

      {/* Reset */}
      {(pipelineDone || tradeDone) && (
        <button
          onClick={() => {
            setStep(-1);
            setShield(null);
            setLens(null);
            setSeer(null);
            setEdge(null);
          }}
          className="w-full rounded-lg border border-border py-2 text-xs text-secondary hover:text-primary transition-colors"
        >
          Reset Pipeline
        </button>
      )}

      {/* Protocol badges */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-secondary pt-1">
        <span>OpenClaw</span>
        <span>·</span>
        <span>A2A Protocol</span>
        <span>·</span>
        <span>ERC-8004</span>
        <span>·</span>
        <span>x402 Hedera</span>
      </div>
    </div>
  );
}
