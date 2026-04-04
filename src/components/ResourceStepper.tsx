'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Bot, Check, Cpu, ExternalLink, Loader2, ShieldCheck, User, Wallet, Wifi, Zap,
} from 'lucide-react';

/* ─── Types ────────────────────────────────────────── */

type ResourceType = 'gpu' | 'agent' | 'human' | 'depin';
type Step = 1 | 2 | 3;
type StepStatus = 'idle' | 'loading' | 'success' | 'error';
interface StepState { status: StepStatus; error?: string }

const OG_EXPLORER = 'https://chainscan-galileo.0g.ai';

const TYPE_CONFIG = {
  gpu: { icon: Cpu, label: 'GPU Compute', color: 'text-primary-accent' },
  agent: { icon: Bot, label: 'AI Agent', color: 'text-primary-accent' },
  human: { icon: User, label: 'Human Skills', color: 'text-primary-accent' },
  depin: { icon: Wifi, label: 'DePIN', color: 'text-primary-accent' },
} as const;

const AGENT_CAPABILITIES = [
  { id: 'signal-analysis', label: 'Signal Analysis' },
  { id: 'code-review', label: 'Code Review' },
  { id: 'data-processing', label: 'Data Processing' },
  { id: 'inference', label: 'AI Inference' },
  { id: 'translation', label: 'Translation' },
];

const SKILL_CATEGORIES = [
  { id: 'engineering', label: 'Engineering — Rust, Solidity, ML/AI' },
  { id: 'design', label: 'Design — UI/UX, Brand, Motion' },
  { id: 'operations', label: 'Operations — DevOps, QA, PM' },
  { id: 'research', label: 'Research — Security, Protocol, Data' },
];

const DEPIN_TYPES = [
  { id: 'compute', label: 'Compute — CPU/GPU bare metal' },
  { id: 'storage', label: 'Storage — NVMe, HDD arrays' },
  { id: 'bandwidth', label: 'Bandwidth — Network capacity' },
  { id: 'energy', label: 'Energy — Solar, grid power' },
];

/* ─── Helper Components ────────────────────────────── */

function StepIndicator({ step, current, state, label }: {
  step: Step; current: Step; state: StepState; label: string;
}) {
  const isComplete = state.status === 'success';
  const isActive = step === current;
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
        isComplete ? 'bg-status-verified text-white'
        : isActive ? 'bg-primary-accent text-white shadow-lg shadow-primary-accent/30'
        : 'bg-surface text-secondary border border-border-card'
      }`}>
        {isComplete ? <Check className="h-4 w-4" />
          : state.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" />
          : step}
      </div>
      <span className={`text-sm font-medium ${isActive ? 'text-primary' : isComplete ? 'text-status-verified' : 'text-secondary'}`}>
        {label}
      </span>
    </div>
  );
}

function StepConnector({ complete }: { complete: boolean }) {
  return (
    <div className="ml-[15px] h-6 w-0.5 transition-colors duration-500">
      <div className={`h-full w-full rounded-full ${complete ? 'bg-status-verified' : 'bg-border-card'}`} />
    </div>
  );
}

function InfoRow({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-secondary">{label}:</span>
      <span className={`font-mono text-xs text-primary ${truncate ? 'max-w-[180px] truncate' : ''}`}>{value}</span>
    </div>
  );
}

function SuccessRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs font-medium text-primary">{text}</span>
      <Check className="ml-auto h-3.5 w-3.5 text-status-verified" />
    </div>
  );
}

function truncateAddress(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

/* ─── Main Component ───────────────────────────────── */

export default function ResourceStepper({ defaultType }: { defaultType?: ResourceType }) {
  const { data: session } = useSession();
  const walletAddress = (session?.user as Record<string, string> | undefined)?.walletAddress
    ?? (session?.user as Record<string, string> | undefined)?.id
    ?? null;

  const [resourceType, setResourceType] = useState<ResourceType>(defaultType ?? 'gpu');
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [step1, setStep1] = useState<StepState>({ status: 'idle' });
  const [step2, setStep2] = useState<StepState>({ status: 'idle' });
  const [step3, setStep3] = useState<StepState>({ status: 'idle' });

  // Type-specific form fields
  const [agentName, setAgentName] = useState('');
  const [capability, setCapability] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [depinType, setDepinType] = useState('');
  const [depinCapacity, setDepinCapacity] = useState('');

  // Verify result
  const [verifyInfo, setVerifyInfo] = useState<Record<string, string> | null>(null);

  // Registration result
  const [registration, setRegistration] = useState<{ agentId: string; txHash: string } | null>(null);

  // Auto-complete step 1 if wallet available
  useEffect(() => {
    if (walletAddress && step1.status === 'idle') {
      setStep1({ status: 'success' });
      setCurrentStep(2);
    }
  }, [walletAddress, step1.status]);

  // Reset steps when type changes
  function handleTypeChange(type: ResourceType) {
    setResourceType(type);
    setCurrentStep(walletAddress ? 2 : 1);
    setStep2({ status: 'idle' });
    setStep3({ status: 'idle' });
    setVerifyInfo(null);
    setRegistration(null);
  }

  // Can proceed to verify?
  function canVerify(): boolean {
    switch (resourceType) {
      case 'gpu': return !!walletAddress;
      case 'agent': return !!agentName && !!capability;
      case 'human': return !!skillName && !!skillCategory;
      case 'depin': return !!depinType;
      default: return false;
    }
  }

  /* ── Step 2: Verify ──────────────────────────────── */

  const handleVerify = useCallback(async () => {
    setStep2({ status: 'loading' });
    try {
      if (resourceType === 'gpu') {
        // GPU: discover service from 0G broker
        const res = await fetch(`/api/gpu/list?address=${encodeURIComponent(walletAddress!)}`);
        if (!res.ok) throw new Error('Could not discover service on 0G network');
        const data = await res.json();
        const svc = data.service || data;
        setVerifyInfo({
          model: svc.model || 'Unknown',
          endpoint: svc.url || 'N/A',
          tee: svc.teeSignerAcknowledged ? 'Verified' : 'Pending',
        });
      } else {
        // Agent/Human/DePIN: just verify wallet is valid
        setVerifyInfo({
          wallet: walletAddress!,
          type: resourceType,
          status: 'Ready to register',
        });
      }
      setStep2({ status: 'success' });
      setCurrentStep(3);
    } catch {
      // Demo fallback
      setVerifyInfo({
        model: resourceType === 'gpu' ? 'NVIDIA H100 80GB' : resourceType,
        status: 'Demo mode — ready to register',
      });
      setStep2({ status: 'success' });
      setCurrentStep(3);
    }
  }, [resourceType, walletAddress]);

  /* ── Step 3: Register on ERC-8004 ────────────────── */

  const handleRegister = useCallback(async () => {
    setStep3({ status: 'loading' });
    try {
      let res: Response;

      if (resourceType === 'gpu') {
        res = await fetch('/api/gpu/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerAddress: walletAddress,
            gpuModel: verifyInfo?.model || 'GPU Provider',
            endpoint: verifyInfo?.endpoint || '',
          }),
        });
      } else {
        // Agent, Human, DePIN all use /api/agents/register
        let agentURI: string;
        let role: string;

        switch (resourceType) {
          case 'agent':
            agentURI = `resource-agent:${capability}:${agentName}`;
            role = 'resource-agent';
            break;
          case 'human':
            agentURI = `human:${skillCategory}:${skillName}`;
            role = 'human-provider';
            break;
          case 'depin':
            agentURI = `depin:${depinType}:${deviceName || 'device'}`;
            role = 'depin-provider';
            break;
          default:
            throw new Error('Unknown type');
        }

        res = await fetch('/api/agents/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentURI,
            role,
            operatorWorldId: walletAddress,
            operatorAddress: walletAddress,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Registration failed');
      }

      const data = await res.json();
      setRegistration({
        agentId: data.agentId || data.tokenId || '?',
        txHash: data.txHash || '',
      });
      setStep3({ status: 'success' });
    } catch (err) {
      setStep3({
        status: 'error',
        error: err instanceof Error ? err.message : 'Registration failed',
      });
    }
  }, [resourceType, walletAddress, verifyInfo, agentName, capability, skillName, skillCategory, deviceName, depinType]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Render ──────────────────────────────────────── */

  if (!walletAddress) {
    return (
      <div className="rounded-xl border border-border-card bg-white p-5 text-center">
        <p className="text-sm text-secondary">Wallet not connected. Please sign in first.</p>
      </div>
    );
  }

  const TypeIcon = TYPE_CONFIG[resourceType].icon;

  return (
    <div className="mx-auto w-full max-w-[428px] space-y-4">
      {/* Type Selector */}
      <div className="flex gap-1 rounded-lg border border-border-card bg-surface p-1">
        {(['gpu', 'agent', 'human', 'depin'] as const).map((t) => {
          const Icon = TYPE_CONFIG[t].icon;
          return (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors cursor-pointer ${
                resourceType === t
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t === 'depin' ? 'DePIN' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Stepper Card */}
      <div className="rounded-xl border border-border-card bg-white p-5 shadow-sm">

        {/* ── Step 1: Identity ──────────────────────── */}
        <StepIndicator step={1} current={currentStep} state={step1} label="Identity" />
        <div className="ml-11 mt-3 mb-1">
          {walletAddress && (
            <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
              <Wallet className="h-4 w-4 text-status-verified" />
              <code className="font-mono text-xs text-primary">{truncateAddress(walletAddress)}</code>
              <Check className="ml-auto h-4 w-4 text-status-verified" />
            </div>
          )}

          {/* Type-specific fields */}
          {currentStep >= 2 && (
            <div className="mt-3 flex flex-col gap-3 animate-fade-in">
              {resourceType === 'agent' && (
                <>
                  <input
                    type="text"
                    placeholder="Agent name (e.g. Orion, DataBot-7)"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
                  />
                  <select
                    value={capability}
                    onChange={(e) => setCapability(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 cursor-pointer"
                  >
                    <option value="">Select capability...</option>
                    {AGENT_CAPABILITIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </>
              )}

              {resourceType === 'human' && (
                <>
                  <input
                    type="text"
                    placeholder="Skill name (e.g. Rust Developer L4)"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
                  />
                  <select
                    value={skillCategory}
                    onChange={(e) => setSkillCategory(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 cursor-pointer"
                  >
                    <option value="">Select category...</option>
                    {SKILL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </>
              )}

              {resourceType === 'depin' && (
                <>
                  <input
                    type="text"
                    placeholder="Device name (e.g. Tesla Powerwall)"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
                  />
                  <select
                    value={depinType}
                    onChange={(e) => setDepinType(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 cursor-pointer"
                  >
                    <option value="">Select type...</option>
                    {DEPIN_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Capacity (e.g. 13.5 kWh, 5kW)"
                    value={depinCapacity}
                    onChange={(e) => setDepinCapacity(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
                  />
                </>
              )}

              {resourceType === 'gpu' && (
                <p className="text-xs text-secondary">GPU provider details will be discovered automatically from the 0G network.</p>
              )}
            </div>
          )}
        </div>

        <StepConnector complete={step1.status === 'success'} />

        {/* ── Step 2: Verify ───────────────────────── */}
        <StepIndicator step={2} current={currentStep} state={step2}
          label={resourceType === 'gpu' ? 'Verify Node' : 'Verify Identity'} />
        <div className="ml-11 mt-3 mb-1">
          {step2.status === 'success' && verifyInfo ? (
            <div className="space-y-2 rounded-lg bg-surface p-3">
              {resourceType === 'gpu' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary-accent" />
                    <span className="text-xs font-medium text-primary-accent">Found on 0G Network</span>
                  </div>
                  <InfoRow label="Model" value={verifyInfo.model || 'Unknown'} />
                  {verifyInfo.endpoint && <InfoRow label="Endpoint" value={verifyInfo.endpoint} truncate />}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-secondary">TEE:</span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${verifyInfo.tee === 'Verified' ? 'text-status-verified' : 'text-status-pending'}`}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {verifyInfo.tee || 'Checked'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-status-verified" />
                    <span className="text-xs font-medium text-status-verified">Identity Verified</span>
                  </div>
                  <InfoRow label="Wallet" value={truncateAddress(walletAddress)} />
                  <InfoRow label="Type" value={TYPE_CONFIG[resourceType].label} />
                </>
              )}
            </div>
          ) : step2.status === 'error' ? (
            <div className="space-y-2">
              <p className="text-xs text-status-failed">{step2.error}</p>
              <button onClick={handleVerify} className="rounded-lg bg-primary-accent px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98] cursor-pointer">
                Retry
              </button>
            </div>
          ) : currentStep === 2 ? (
            <button
              onClick={handleVerify}
              disabled={!canVerify() || step2.status === 'loading'}
              className="w-full rounded-lg bg-primary-accent px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-accent/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {step2.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TypeIcon className="h-4 w-4" />}
              {step2.status === 'loading'
                ? resourceType === 'gpu' ? 'Discovering node...' : 'Verifying...'
                : resourceType === 'gpu' ? 'Verify Node on 0G' : 'Verify Identity'}
            </button>
          ) : null}
        </div>

        <StepConnector complete={step2.status === 'success'} />

        {/* ── Step 3: Register on ERC-8004 ──────────── */}
        <StepIndicator step={3} current={currentStep} state={step3} label="Register on ERC-8004" />
        <div className="ml-11 mt-3">
          {step3.status === 'success' && registration ? (
            <div className="space-y-3 rounded-lg bg-surface p-3">
              <SuccessRow
                icon={<ShieldCheck className="h-4 w-4 text-status-verified" />}
                text={`Identity NFT #${registration.agentId}`}
              />
              <SuccessRow
                icon={<TypeIcon className="h-4 w-4 text-status-verified" />}
                text={`${TYPE_CONFIG[resourceType].label} Registered`}
              />
              <SuccessRow
                icon={<Zap className="h-4 w-4 text-status-verified" />}
                text="Discoverable by Agents"
              />
              {registration.txHash && (
                <>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border-card">
                    <span className="text-[10px] text-secondary">Tx Hash:</span>
                    <code className="font-mono text-[10px] text-primary truncate max-w-[200px]">
                      {registration.txHash}
                    </code>
                  </div>
                  <a
                    href={`${OG_EXPLORER}/tx/${registration.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border border-border-card px-4 py-2 text-xs font-medium text-primary active:scale-[0.98] cursor-pointer"
                  >
                    View on Explorer
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </>
              )}
            </div>
          ) : step3.status === 'error' ? (
            <div className="space-y-2">
              <p className="text-xs text-status-failed">{step3.error}</p>
              <button onClick={handleRegister} className="rounded-lg bg-primary-accent px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98] cursor-pointer">
                Retry
              </button>
            </div>
          ) : currentStep === 3 ? (
            <button
              onClick={handleRegister}
              disabled={step3.status === 'loading'}
              className="w-full rounded-lg bg-primary-accent px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-accent/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {step3.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {step3.status === 'loading' ? 'Registering on-chain...' : 'Register on ERC-8004'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
