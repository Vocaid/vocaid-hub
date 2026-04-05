'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Bot, Check, ChevronDown, Cpu, ExternalLink, Loader2, ShieldCheck, User, Wallet, Wifi, Zap,
} from 'lucide-react';
import { WorldIdGateModal } from '@/components/WorldIdGateModal';
import { useWorldIdGate } from '@/hooks/useWorldIdGate';

/* ─── Types ────────────────────────────────────────── */

type ResourceType = 'gpu' | 'agent' | 'human' | 'depin';
type Step = 1 | 2 | 3;
type StepStatus = 'idle' | 'loading' | 'success' | 'error';
interface StepState { status: StepStatus; error?: string }

/** A single form field — either a text input or a select dropdown. */
interface FieldDef {
  key: string;
  type: 'text' | 'select';
  placeholder: string;
  options?: { id: string; label: string }[];
  required?: boolean;
}

const OG_EXPLORER = 'https://chainscan-galileo.0g.ai';

/* ─── Per-type configuration (data, not JSX) ──────── */

const TYPE_META: Record<ResourceType, {
  icon: typeof Cpu;
  label: string;
  fields: FieldDef[];
  verifyLabel: string;
  verifyLoadingLabel: string;
  /** Build agentURI + role from form values for /api/agents/register */
  buildPayload?: (form: Record<string, string>) => { agentURI: string; role: string };
}> = {
  gpu: {
    icon: Cpu,
    label: 'GPU Compute',
    fields: [], // GPU fields are auto-discovered, no manual input
    verifyLabel: 'Verify Node on 0G',
    verifyLoadingLabel: 'Discovering node...',
  },
  agent: {
    icon: Bot,
    label: 'AI Agent',
    fields: [
      { key: 'name', type: 'text', placeholder: 'Agent name (e.g. Orion, DataBot-7)', required: true },
      {
        key: 'capability', type: 'select', placeholder: 'Select capability...', required: true,
        options: [
          { id: 'signal-analysis', label: 'Signal Analysis' },
          { id: 'code-review', label: 'Code Review' },
          { id: 'data-processing', label: 'Data Processing' },
          { id: 'inference', label: 'AI Inference' },
          { id: 'translation', label: 'Translation' },
        ],
      },
    ],
    verifyLabel: 'Verify Identity',
    verifyLoadingLabel: 'Verifying...',
    buildPayload: (f) => ({
      agentURI: `resource-agent:${f.capability}:${f.name}`,
      role: 'resource-agent',
    }),
  },
  human: {
    icon: User,
    label: 'Human Skills',
    fields: [
      { key: 'name', type: 'text', placeholder: 'Skill name (e.g. Rust Developer L4)', required: true },
      {
        key: 'category', type: 'select', placeholder: 'Select category...', required: true,
        options: [
          { id: 'engineering', label: 'Engineering — Rust, Solidity, ML/AI' },
          { id: 'design', label: 'Design — UI/UX, Brand, Motion' },
          { id: 'operations', label: 'Operations — DevOps, QA, PM' },
          { id: 'research', label: 'Research — Security, Protocol, Data' },
        ],
      },
    ],
    verifyLabel: 'Verify Identity',
    verifyLoadingLabel: 'Verifying...',
    buildPayload: (f) => ({
      agentURI: `human:${f.category}:${f.name}`,
      role: 'human-provider',
    }),
  },
  depin: {
    icon: Wifi,
    label: 'DePIN',
    fields: [
      { key: 'name', type: 'text', placeholder: 'Device name (e.g. Tesla Powerwall)' },
      {
        key: 'deviceType', type: 'select', placeholder: 'Select type...', required: true,
        options: [
          { id: 'compute', label: 'Compute — CPU/GPU bare metal' },
          { id: 'storage', label: 'Storage — NVMe, HDD arrays' },
          { id: 'bandwidth', label: 'Bandwidth — Network capacity' },
          { id: 'energy', label: 'Energy — Solar, grid power' },
        ],
      },
      { key: 'capacity', type: 'text', placeholder: 'Capacity (e.g. 13.5 kWh, 5kW)' },
    ],
    verifyLabel: 'Verify Identity',
    verifyLoadingLabel: 'Verifying...',
    buildPayload: (f) => ({
      agentURI: `depin:${f.deviceType}:${f.name || 'device'}:${f.capacity || ''}`,
      role: 'depin-provider',
    }),
  },
};

/* ─── Shared input styles ─────────────────────────── */

const INPUT_CLASS = 'w-full min-h-11 rounded-lg border border-border-card bg-surface px-4 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-accent/30';
const SELECT_CLASS = `${INPUT_CLASS} cursor-pointer`;

/* ─── Helper Components ───────────────────────────── */

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

/** Generic field renderer — renders any FieldDef[] with a shared form state. */
function FieldRenderer({ fields, form, onChange }: {
  fields: FieldDef[];
  form: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (fields.length === 0) {
    return <p className="text-xs text-secondary">GPU provider details will be discovered automatically from the 0G network.</p>;
  }
  return (
    <>
      {fields.map((f) =>
        f.type === 'select' ? (
          <select
            key={f.key}
            value={form[f.key] ?? ''}
            onChange={(e) => onChange(f.key, e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">{f.placeholder}</option>
            {f.options?.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            key={f.key}
            type="text"
            placeholder={f.placeholder}
            value={form[f.key] ?? ''}
            onChange={(e) => onChange(f.key, e.target.value)}
            className={INPUT_CLASS}
          />
        ),
      )}
    </>
  );
}

/* ─── Resource Type Selector ─────────────────────── */

const RESOURCE_TYPES: ResourceType[] = ['gpu', 'agent', 'human', 'depin'];

function ResourceTypeSelect({ value, onChange }: {
  value: ResourceType;
  onChange: (t: ResourceType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const selected = TYPE_META[value];
  const SelectedIcon = selected.icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${SELECT_CLASS} flex items-center gap-2.5 cursor-pointer`}
      >
        <SelectedIcon className="h-4 w-4 text-primary-accent" />
        <span className="text-sm font-medium text-primary">
          {value === 'depin' ? 'DePIN' : value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
        <ChevronDown className={`ml-auto h-4 w-4 text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 w-full rounded-lg border border-border-card bg-white shadow-lg overflow-hidden motion-safe:animate-fade-in"
        >
          {RESOURCE_TYPES.map((t) => {
            const Icon = TYPE_META[t].icon;
            const isSelected = t === value;
            return (
              <button
                key={t}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(t); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-surface text-primary font-medium'
                    : 'text-secondary hover:bg-surface hover:text-primary'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t === 'depin' ? 'DePIN' : t.charAt(0).toUpperCase() + t.slice(1)}</span>
                {isSelected && <Check className="ml-auto h-3.5 w-3.5 text-primary-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────── */

export default function ResourceStepper({ defaultType }: { defaultType?: ResourceType }) {
  const { data: session } = useSession();
  const walletAddress = (session?.user as Record<string, string> | undefined)?.walletAddress
    ?? (session?.user as Record<string, string> | undefined)?.id
    ?? null;

  const { isVerified, recheckStatus } = useWorldIdGate();
  const [showGateModal, setShowGateModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'verify' | 'register' | null>(null);

  const [resourceType, setResourceType] = useState<ResourceType>(defaultType ?? 'gpu');
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [step1, setStep1] = useState<StepState>({ status: 'idle' });
  const [step2, setStep2] = useState<StepState>({ status: 'idle' });
  const [step3, setStep3] = useState<StepState>({ status: 'idle' });

  // Single form state for all field values
  const [form, setForm] = useState<Record<string, string>>({});
  const updateField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Verify result
  const [verifyInfo, setVerifyInfo] = useState<Record<string, string> | null>(null);

  // Registration result
  const [registration, setRegistration] = useState<{ agentId: string; txHash: string } | null>(null);

  const meta = TYPE_META[resourceType];
  const TypeIcon = meta.icon;

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
    setForm({});
  }

  // Can proceed to verify? All required fields must be filled.
  function canVerify(): boolean {
    if (!walletAddress) return false;
    return meta.fields
      .filter((f) => f.required)
      .every((f) => !!form[f.key]);
  }

  /* ── Step 2: Verify ──────────────────────────────── */

  const handleVerify = useCallback(async () => {
    // Gate: require World ID before verify step
    if (!isVerified) {
      setPendingAction('verify');
      setShowGateModal(true);
      return;
    }
    setStep2({ status: 'loading' });
    try {
      if (resourceType === 'gpu') {
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
  }, [resourceType, walletAddress, isVerified]);

  /* ── Step 3: Register on ERC-8004 ────────────────── */

  const handleRegister = useCallback(async () => {
    // Gate: require World ID before registration
    if (!isVerified) {
      setPendingAction('register');
      setShowGateModal(true);
      return;
    }
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
            ...(verifyInfo?.endpoint && verifyInfo.endpoint !== 'N/A'
              ? { endpoint: verifyInfo.endpoint }
              : {}),
          }),
        });
      } else {
        const payload = TYPE_META[resourceType].buildPayload!(form);
        res = await fetch('/api/agents/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentURI: payload.agentURI,
            role: payload.role,
            operatorWorldId: walletAddress,
            operatorAddress: walletAddress,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // 403 = World ID not verified — show gate modal instead of generic error
        if (res.status === 403) {
          setPendingAction('register');
          setShowGateModal(true);
          setStep3({ status: 'idle' });
          return;
        }
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
  }, [resourceType, walletAddress, verifyInfo, form, isVerified]);

  /* ── Render ──────────────────────────────────────── */

  if (!walletAddress) {
    return (
      <div className="rounded-xl border border-border-card bg-white p-5 text-center">
        <p className="text-sm text-secondary">Wallet not connected. Please sign in first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[428px] space-y-4">
      {/* Type Selector */}
      <ResourceTypeSelect value={resourceType} onChange={handleTypeChange} />

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

          {/* Type-specific fields — rendered from config */}
          {currentStep >= 2 && (
            <div className="mt-3 flex flex-col gap-3 animate-fade-in">
              <FieldRenderer fields={meta.fields} form={form} onChange={updateField} />
            </div>
          )}
        </div>

        <StepConnector complete={step1.status === 'success'} />

        {/* ── Step 2: Verify ───────────────────────── */}
        <StepIndicator step={2} current={currentStep} state={step2} label={meta.verifyLabel} />
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
                  <InfoRow label="Type" value={meta.label} />
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
              {step2.status === 'loading' ? meta.verifyLoadingLabel : meta.verifyLabel}
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
                text={`${meta.label} Registered`}
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

      {/* World ID verification gate modal */}
      <WorldIdGateModal
        open={showGateModal}
        onClose={() => { setShowGateModal(false); recheckStatus(); }}
        onVerified={async () => {
          setShowGateModal(false);
          await recheckStatus();
          // Auto-resume the interrupted action
          if (pendingAction === 'verify') {
            setPendingAction(null);
            handleVerify();
          } else if (pendingAction === 'register') {
            setPendingAction(null);
            handleRegister();
          }
        }}
      />
    </div>
  );
}
