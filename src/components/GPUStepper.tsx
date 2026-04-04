'use client';

import {
  Check,
  Cpu,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

/* ─── Types ────────────────────────────────────────── */

interface ServiceInfo {
  provider: string;
  model: string;
  url: string;
  teeSignerAcknowledged: boolean;
  verifiability: string;
}

interface RegistrationResult {
  tokenId: string;
  txHash: string;
  blockExplorerUrl: string;
}

type Step = 1 | 2 | 3;

interface StepState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

/* ─── Constants ────────────────────────────────────── */

const OG_EXPLORER =
  process.env.NEXT_PUBLIC_OG_EXPLORER_URL ?? 'https://chainscan-newton.0g.ai';

/* ─── Helpers ──────────────────────────────────────── */

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ─── Step Indicator ───────────────────────────────── */

function StepIndicator({
  step,
  current,
  state,
  label,
}: {
  step: Step;
  current: Step;
  state: StepState;
  label: string;
}) {
  const isComplete = state.status === 'success';
  const isActive = step === current;
  const isPast = step < current || isComplete;

  return (
    <div className="flex items-center gap-3">
      {/* Circle */}
      <div
        className={`
          flex h-8 w-8 shrink-0 items-center justify-center rounded-full
          text-sm font-semibold transition-all duration-300
          ${
            isComplete
              ? 'bg-status-verified text-white'
              : isActive
                ? 'bg-primary-accent text-white shadow-lg shadow-primary-accent/30'
                : isPast
                  ? 'bg-status-verified text-white'
                  : 'bg-surface text-secondary border border-border-card'
          }
        `}
      >
        {isComplete ? (
          <Check className="h-4 w-4" />
        ) : state.status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          step
        )}
      </div>
      {/* Label */}
      <span
        className={`text-sm font-medium ${
          isActive
            ? 'text-primary'
            : isComplete
              ? 'text-status-verified'
              : 'text-secondary'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── Connector Line ──────────────────────────────── */

function StepConnector({ complete }: { complete: boolean }) {
  return (
    <div className="ml-[15px] h-6 w-0.5 transition-colors duration-500">
      <div
        className={`h-full w-full rounded-full ${
          complete ? 'bg-status-verified' : 'bg-border-card'
        }`}
      />
    </div>
  );
}

/* ─── Main Component ──────────────────────────────── */

export default function GPUStepper() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [registration, setRegistration] = useState<RegistrationResult | null>(
    null,
  );

  const [step1, setStep1] = useState<StepState>({ status: 'idle' });
  const [step2, setStep2] = useState<StepState>({ status: 'idle' });
  const [step3, setStep3] = useState<StepState>({ status: 'idle' });
  const [isDemoMode, setIsDemoMode] = useState(false);

  /* ── Auto-connect wallet from session on mount ──── */
  useEffect(() => {
    if (!walletAddress && step1.status === 'idle') {
      // Try to get wallet from session (user is already authenticated)
      fetch('/api/auth/session')
        .then(r => r.json())
        .then(session => {
          if (session?.user?.address) {
            setWalletAddress(session.user.address);
            setStep1({ status: 'success' });
            setCurrentStep(2);
          }
        })
        .catch(() => { /* fallback to manual connect */ });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Step 1: Connect Wallet (fallback) ──────────── */

  const connectWallet = useCallback(async () => {
    setStep1({ status: 'loading' });
    try {
      // Path 1: Inside World App — get address from auth session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== 'undefined' && (window as any).MiniKit?.isInstalled?.()) {
        const session = await fetch('/api/auth/session').then(r => r.json()).catch(() => null);
        if (session?.user?.address) {
          setWalletAddress(session.user.address);
          setStep1({ status: 'success' });
          setCurrentStep(2);
          return;
        }
      }

      // Path 2: Browser wallet (MetaMask, Rabby, etc.)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accounts = (await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        })) as string[];

        if (!accounts?.[0]) throw new Error('No account returned');

        setWalletAddress(accounts[0]);
        setStep1({ status: 'success' });
        setCurrentStep(2);
        return;
      }

      // Path 3: No wallet available
      throw new Error(
        'No wallet detected. Open in World App or install a browser wallet (MetaMask, Rabby).'
      );
    } catch (err) {
      setStep1({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to connect',
      });
    }
  }, []);

  /* ── Step 2: Verify Node (auto-discover from 0G) ── */

  const verifyNode = useCallback(async () => {
    if (!walletAddress) return;
    setStep2({ status: 'loading' });

    try {
      // Discover services from broker SDK via API
      const res = await fetch(
        `/api/gpu/list?address=${encodeURIComponent(walletAddress)}`,
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error ?? 'Could not discover service on 0G network',
        );
      }

      const data = await res.json();
      setServiceInfo(data.service);
      if (data._demo) setIsDemoMode(true);
      setStep2({ status: 'success' });
      setCurrentStep(3);
    } catch (err) {
      setStep2({
        status: 'error',
        error: err instanceof Error ? err.message : 'Verification failed',
      });
    }
  }, [walletAddress]);

  /* ── Step 3: Register on ERC-8004 ────────────────── */

  const registerProvider = useCallback(async () => {
    if (!walletAddress || !serviceInfo) return;
    setStep3({ status: 'loading' });

    try {
      const res = await fetch('/api/gpu/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerAddress: walletAddress,
          gpuModel: serviceInfo.model,
          endpoint: serviceInfo.url,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Registration failed');
      }

      const data = await res.json();
      setRegistration({
        tokenId: data.tokenId,
        txHash: data.txHash,
        blockExplorerUrl: `${OG_EXPLORER}/tx/${data.txHash}`,
      });

      setStep3({ status: 'success' });
    } catch (err) {
      setStep3({
        status: 'error',
        error: err instanceof Error ? err.message : 'Registration failed',
      });
    }
  }, [walletAddress, serviceInfo]);

  /* ── Render ──────────────────────────────────────── */

  return (
    <div className="mx-auto w-full max-w-[428px] space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-primary">
          Register Your GPU Provider
        </h1>
        <p className="text-sm text-secondary">
          Verify and register on-chain via ERC-8004
        </p>
      </div>

      {/* Innovation callout */}
      <div className="flex items-center gap-2 rounded-lg border border-chain-og/30 bg-chain-og/5 px-4 py-3">
        <Zap className="h-4 w-4 shrink-0 text-chain-og" />
        <p className="text-xs font-medium text-chain-og">
          This tool doesn&apos;t exist in 0G&apos;s ecosystem yet — we built it.
        </p>
      </div>

      {/* Demo mode indicator */}
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg border border-status-pending/30 bg-status-pending/5 px-4 py-2">
          <span className="text-xs font-medium text-status-pending">
            Demo Mode — 0G testnet offline, showing simulated data
          </span>
        </div>
      )}

      {/* Stepper */}
      <div className="rounded-xl border border-border-card bg-white p-5">
        {/* Step 1 */}
        <StepIndicator
          step={1}
          current={currentStep}
          state={step1}
          label="Connect Wallet"
        />
        <div className="ml-11 mt-3 mb-1">
          {step1.status === 'success' && walletAddress ? (
            <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
              <Wallet className="h-4 w-4 text-status-verified" />
              <code className="font-mono text-xs text-primary">
                {truncateAddress(walletAddress)}
              </code>
              <Check className="ml-auto h-4 w-4 text-status-verified" />
            </div>
          ) : step1.status === 'error' ? (
            <div className="space-y-2">
              <p className="text-xs text-status-failed">{step1.error}</p>
              <button
                onClick={connectWallet}
                className="rounded-lg bg-primary-accent px-4 py-2.5 text-sm font-semibold text-white
                  transition-all hover:bg-primary-accent/90 active:scale-[0.98]"
              >
                Retry
              </button>
            </div>
          ) : currentStep === 1 ? (
            <button
              onClick={connectWallet}
              disabled={step1.status === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-accent px-4
                py-3 text-sm font-semibold text-white shadow-md shadow-primary-accent/20
                transition-all hover:bg-primary-accent/90 active:scale-[0.98]
                disabled:cursor-not-allowed disabled:opacity-60"
            >
              {step1.status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              {step1.status === 'loading'
                ? 'Connecting...'
                : 'Connect Wallet'}
            </button>
          ) : null}
        </div>

        <StepConnector complete={step1.status === 'success'} />

        {/* Step 2 */}
        <StepIndicator
          step={2}
          current={currentStep}
          state={step2}
          label="Verify Node"
        />
        <div className="ml-11 mt-3 mb-1">
          {step2.status === 'success' && serviceInfo ? (
            <div className="space-y-2 rounded-lg bg-surface p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-chain-og" />
                <span className="text-xs font-medium text-chain-og">
                  Found on 0G Network
                </span>
              </div>
              <div className="space-y-1.5">
                <InfoRow label="Model" value={serviceInfo.model} />
                <InfoRow
                  label="Endpoint"
                  value={serviceInfo.url}
                  truncate
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-secondary">TEE:</span>
                  {serviceInfo.teeSignerAcknowledged ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-status-verified">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-status-pending">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : step2.status === 'error' ? (
            <div className="space-y-2">
              <p className="text-xs text-status-failed">{step2.error}</p>
              <button
                onClick={verifyNode}
                className="rounded-lg bg-chain-og px-4 py-2.5 text-sm font-semibold text-white
                  transition-all hover:bg-chain-og/90 active:scale-[0.98]"
              >
                Retry
              </button>
            </div>
          ) : currentStep === 2 ? (
            <button
              onClick={verifyNode}
              disabled={step2.status === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-chain-og px-4
                py-3 text-sm font-semibold text-white shadow-md shadow-chain-og/20
                transition-all hover:bg-chain-og/90 active:scale-[0.98]
                disabled:cursor-not-allowed disabled:opacity-60"
            >
              {step2.status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Cpu className="h-4 w-4" />
              )}
              {step2.status === 'loading'
                ? 'Discovering node...'
                : 'Verify Node on 0G'}
            </button>
          ) : null}
        </div>

        <StepConnector complete={step2.status === 'success'} />

        {/* Step 3 */}
        <StepIndicator
          step={3}
          current={currentStep}
          state={step3}
          label="Register on ERC-8004"
        />
        <div className="ml-11 mt-3">
          {step3.status === 'success' && registration ? (
            <div className="space-y-3 rounded-lg bg-surface p-3">
              <SuccessRow
                icon={<ShieldCheck className="h-4 w-4 text-status-verified" />}
                text={`Identity NFT #${registration.tokenId}`}
              />
              <SuccessRow
                icon={<Cpu className="h-4 w-4 text-status-verified" />}
                text="A2A Agent Card Issued"
              />
              <SuccessRow
                icon={<Zap className="h-4 w-4 text-status-verified" />}
                text="TEE Validated"
              />
              <a
                href={registration.blockExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-primary-accent
                  transition-colors hover:text-primary-accent/80"
              >
                View on Explorer
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : step3.status === 'error' ? (
            <div className="space-y-2">
              <p className="text-xs text-status-failed">{step3.error}</p>
              <button
                onClick={registerProvider}
                className="rounded-lg bg-primary-accent px-4 py-2.5 text-sm font-semibold text-white
                  transition-all hover:bg-primary-accent/90 active:scale-[0.98]"
              >
                Retry
              </button>
            </div>
          ) : currentStep === 3 ? (
            <button
              onClick={registerProvider}
              disabled={step3.status === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-accent px-4
                py-3 text-sm font-semibold text-white shadow-md shadow-primary-accent/20
                transition-all hover:bg-primary-accent/90 active:scale-[0.98]
                disabled:cursor-not-allowed disabled:opacity-60"
            >
              {step3.status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {step3.status === 'loading'
                ? 'Registering on-chain...'
                : 'Register on ERC-8004'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Chain attribution footer */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-secondary">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-chain-og" />
          0G Chain
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-chain-world" />
          ERC-8004
        </span>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────── */

function InfoRow({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-secondary">{label}:</span>
      <span
        className={`font-mono text-xs text-primary ${truncate ? 'max-w-[180px] truncate' : ''}`}
      >
        {value}
      </span>
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

/* ─── Window type extension ───────────────────────── */

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}
