'use client';

import { useState, useEffect } from 'react';
import { Eye, Search, BarChart3, ShieldCheck, CheckCircle, Cpu, Bot, User, Zap, Clock, Star, Activity } from 'lucide-react';
import { ReputationBar } from '@/components/ReputationBar';
import { ChainBadge } from '@/components/ChainBadge';

interface Provider {
  address: string;
  agentId: string;
  gpuModel: string;
  teeType: string;
  teeVerified: boolean;
  reputation: { starred: number; uptime: number; successRate: number; responseTime: number };
  validationScore: number;
  compositeScore: number;
  resourceType?: string;
  resourceName?: string;
  price?: string;
}

function resourceIcon(type?: string) {
  switch (type) {
    case 'agent': return Bot;
    case 'human': return User;
    case 'depin': return Zap;
    default: return Cpu;
  }
}

export interface DecisionData {
  discovered: number;
  providers: Provider[];
  selected: Provider | null;
  reasoning: { weights: Record<string, number>; formula: string };
}

const STEPS = [
  { icon: Search, label: 'Discover', desc: 'Scan network for all resources' },
  { icon: BarChart3, label: 'Rank', desc: 'Score by reputation signals' },
  { icon: ShieldCheck, label: 'Verify', desc: 'Check TEE attestation via Shield' },
  { icon: CheckCircle, label: 'Select', desc: 'Choose optimal provider' },
];

export function AgentDecisionContent({ decision, resourceType, signal, compact = false }: { decision: DecisionData | null; resourceType?: string; signal?: string; compact?: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const data = decision ?? getDemoData();

  // Auto-play through steps
  useEffect(() => {
    if (!autoPlay) return;
    if (currentStep >= 4) { setAutoPlay(false); return; }
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), 2000);
    return () => clearTimeout(timer);
  }, [autoPlay, currentStep]);

  const selected = data.providers[0];

  return (
    <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-6'}`}>
      {/* Agent Header — hidden in compact mode (parent already shows header) */}
      {!compact && (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border-card">
        <div className="w-10 h-10 rounded-full bg-primary-accent/10 flex items-center justify-center">
          <Eye className="w-5 h-5 text-primary-accent" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-primary">Seer Agent</p>
          <p className="text-xs text-secondary">
            {resourceType && resourceType !== 'all'
              ? `Ranking ${resourceType === 'depin' ? 'DePIN' : resourceType} by ${signal || 'quality'}`
              : 'Signal Analyst — finding optimal resources'}
          </p>
        </div>
        <button
          onClick={() => { setCurrentStep(0); setAutoPlay(true); }}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-accent text-white"
        >
          {autoPlay ? 'Running...' : 'Run Decision'}
        </button>
      </div>
      )}

      {/* Run button in compact mode */}
      {compact && (
        <button
          onClick={() => { setCurrentStep(0); setAutoPlay(true); }}
          className="w-full min-h-[44px] text-xs font-medium rounded-lg bg-primary-accent text-white active:scale-95 transition-transform cursor-pointer"
        >
          {autoPlay ? 'Running Decision...' : 'Run Seer Decision'}
        </button>
      )}

      {/* Step Indicators */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <button
                onClick={() => { setAutoPlay(false); setCurrentStep(i); }}
                className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer ${
                  done ? 'bg-status-verified text-white' :
                  active ? 'bg-primary-accent text-white shadow-lg scale-110' :
                  'bg-surface border border-border-card text-secondary'
                }`}
              >
                {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </button>
              <span className={`text-[10px] font-medium ${active ? 'text-primary-accent' : 'text-secondary'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className={compact ? 'min-h-[180px]' : 'min-h-[300px]'}>
        {currentStep === 0 && <DiscoverStep providers={data.providers} compact={compact} />}
        {currentStep === 1 && <RankStep providers={data.providers} reasoning={data.reasoning} />}
        {currentStep === 2 && <VerifyStep providers={data.providers} />}
        {currentStep === 3 && <SelectStep provider={selected} reasoning={data.reasoning} />}
        {currentStep >= 4 && <SelectStep provider={selected} reasoning={data.reasoning} />}
      </div>
    </div>
  );
}

// --- Step 1: Discover ---

function DiscoverStep({ providers, compact = false }: { providers: Provider[]; compact?: boolean }) {
  // Count by type
  const typeCounts = providers.reduce<Record<string, number>>((acc, p) => {
    const t = p.resourceType || 'gpu';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3">
      <StepHeader
        icon={Search}
        title="Scanning 0G Network"
        subtitle={`Found ${providers.length} resources on 0G Galileo`}
      />

      {/* Compact: summary badges only — no card duplication */}
      {compact ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeCounts).map(([type, count]) => {
            const Icon = resourceIcon(type);
            return (
              <div key={type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border-card">
                <Icon className="w-3.5 h-3.5 text-primary-accent" />
                <span className="text-xs font-medium text-primary">{count}</span>
                <span className="text-xs text-secondary">{type === 'depin' ? 'DePIN' : type}</span>
              </div>
            );
          })}
        </div>
      ) : (
        /* Full: detailed provider cards (standalone page only) */
        providers.map((p, i) => {
          const RIcon = resourceIcon(p.resourceType);
          return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border-card animate-fade-in"
            style={{ animationDelay: `${i * 200}ms` }}>
            <RIcon className="w-5 h-5 text-primary-accent" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">{p.gpuModel}</p>
              <p className="text-xs text-secondary">{p.teeType || 'No TEE'} · Agent #{p.agentId}</p>
            </div>
            {p.resourceType && (
              <span className="text-[9px] font-medium text-secondary bg-surface border border-border-card px-1.5 py-0.5 rounded-full">
                {p.resourceType === 'depin' ? 'DePIN' : p.resourceType}
              </span>
            )}
            <ChainBadge chain="0g" />
          </div>
          );
        })
      )}
    </div>
  );
}

// --- Step 2: Rank ---

function RankStep({ providers, reasoning }: { providers: Provider[]; reasoning: DecisionData['reasoning'] }) {
  return (
    <div className="flex flex-col gap-3">
      <StepHeader
        icon={BarChart3}
        title="Ranking by Reputation Signals"
        subtitle={reasoning.formula}
      />
      {providers.map((p, i) => (
        <div key={i} className="p-3 rounded-xl bg-surface border border-border-card animate-fade-in"
          style={{ animationDelay: `${i * 200}ms` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-primary">{p.gpuModel}</p>
            <span className="text-xs font-mono font-bold text-primary-accent">{p.compositeScore}/100</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Signal icon={Star} label="Quality" value={p.reputation.starred} />
            <Signal icon={Activity} label="Uptime" value={p.reputation.uptime} />
            <Signal icon={Zap} label="Success" value={p.reputation.successRate} />
            <Signal icon={Clock} label="Response" value={p.reputation.responseTime} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Step 3: Verify ---

function VerifyStep({ providers }: { providers: Provider[] }) {
  return (
    <div className="flex flex-col gap-3">
      <StepHeader
        icon={ShieldCheck}
        title="Shield Agent — TEE Verification"
        subtitle="Checking ValidationRegistry for hardware attestation"
      />
      {providers.map((p, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border animate-fade-in"
          style={{
            animationDelay: `${i * 200}ms`,
            borderColor: p.teeVerified ? 'var(--color-status-verified)' : 'var(--color-border-card)',
            backgroundColor: p.teeVerified ? 'rgba(130, 71, 229, 0.05)' : 'var(--color-surface)',
          }}>
          <ShieldCheck className={`w-5 h-5 ${p.teeVerified ? 'text-status-verified' : 'text-status-inactive'}`} />
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">{p.gpuModel}</p>
            <p className="text-xs text-secondary">{p.teeType || 'No attestation'}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            p.teeVerified
              ? 'bg-status-verified/10 text-status-verified'
              : 'bg-status-failed/10 text-status-failed'
          }`}>
            {p.teeVerified ? 'Verified' : 'Rejected'}
          </span>
        </div>
      ))}
    </div>
  );
}

// --- Step 4: Select ---

function SelectStep({ provider, reasoning }: { provider: Provider; reasoning: DecisionData['reasoning'] }) {
  const SIcon = resourceIcon(provider.resourceType);
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <StepHeader
        icon={CheckCircle}
        title="Resource Selected"
        subtitle="Seer recommends the highest-scoring verified resource"
      />
      <div className="p-4 rounded-xl border-2 border-status-verified bg-status-verified/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-primary-accent/10 flex items-center justify-center">
            <SIcon className="w-6 h-6 text-primary-accent" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-primary">{provider.gpuModel}</p>
            <p className="text-xs text-secondary">{provider.teeType} · Agent #{provider.agentId}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary-accent">{provider.compositeScore}</p>
            <p className="text-[10px] text-secondary">composite</p>
          </div>
        </div>
        <ReputationBar score={provider.compositeScore} />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Signal icon={Star} label="Quality" value={provider.reputation.starred} />
          <Signal icon={Activity} label="Uptime" value={provider.reputation.uptime} />
          <Signal icon={Zap} label="Success" value={provider.reputation.successRate} />
          <Signal icon={ShieldCheck} label="TEE Score" value={provider.validationScore} />
        </div>
      </div>
      <p className="text-xs text-secondary text-center">
        Scoring: {reasoning.formula}
      </p>
    </div>
  );
}

// --- Shared Components ---

function StepHeader({ icon: Icon, title, subtitle }: { icon: typeof Search; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-2">
      <Icon className="w-5 h-5 text-primary-accent mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-primary">{title}</p>
        <p className="text-xs text-secondary font-mono">{subtitle}</p>
      </div>
    </div>
  );
}

function Signal({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3 h-3 text-secondary" />
      <span className="text-[10px] text-secondary">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border-card overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-accent transition-all duration-700"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-mono font-medium text-primary w-6 text-right">{value}</span>
    </div>
  );
}

function getDemoData(): DecisionData {
  return {
    discovered: 5,
    providers: [
      { address: "agent-0", agentId: "27", gpuModel: "Orion · Signal Analysis", teeType: "AgentKit", teeVerified: true, reputation: { starred: 95, uptime: 99, successRate: 98, responseTime: 45 }, validationScore: 90, compositeScore: 91, resourceType: "agent", resourceName: "Orion", price: "$0.01/query" },
      { address: "gpu-0", agentId: "25", gpuModel: "Nebula-H100 · EU Frankfurt", teeType: "Intel TDX", teeVerified: true, reputation: { starred: 87, uptime: 99, successRate: 95, responseTime: 120 }, validationScore: 100, compositeScore: 89, resourceType: "gpu", resourceName: "Nebula-H100", price: "$0.04/1K tok" },
      { address: "human-0", agentId: "29", gpuModel: "Camila Torres · Rust L4", teeType: "World ID", teeVerified: true, reputation: { starred: 91, uptime: 0, successRate: 88, responseTime: 0 }, validationScore: 80, compositeScore: 75, resourceType: "human", resourceName: "Camila Torres", price: "$45/hr" },
      { address: "depin-0", agentId: "31", gpuModel: "Helios Solar · 50kW", teeType: "TEE", teeVerified: true, reputation: { starred: 85, uptime: 97, successRate: 90, responseTime: 0 }, validationScore: 75, compositeScore: 72, resourceType: "depin", resourceName: "Helios Solar", price: "$0.08/kWh" },
      { address: "gpu-1", agentId: "26", gpuModel: "Titan-A100 · US East", teeType: "None", teeVerified: false, reputation: { starred: 45, uptime: 78, successRate: 70, responseTime: 60 }, validationScore: 0, compositeScore: 48, resourceType: "gpu", resourceName: "Titan-A100", price: "$0.03/1K tok" },
    ],
    selected: null,
    reasoning: { weights: { starred: 0.3, uptime: 0.25, successRate: 0.25, teeBonus: 0.2 }, formula: "score = quality*0.3 + uptime*0.25 + success*0.25 + (verified ? 20 : 0)" },
  };
}
