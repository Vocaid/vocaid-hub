'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Key, Copy, Check, Loader2, XCircle, Shield, Unplug } from 'lucide-react';

const CHAINS = [
  { id: '0g', label: '0G Galileo (16602)', desc: 'ERC-8004, Compute, Storage' },
  { id: 'hedera', label: 'Hedera Testnet', desc: 'x402 USDC, HTS, HCS' },
  { id: 'world', label: 'World Sepolia (4801)', desc: 'World ID, CredentialGate' },
] as const;

type ViewState = 'loading' | 'disconnected' | 'just-generated' | 'connected';

export function ConnectAgentSection() {
  const { data: session } = useSession();
  const walletAddress = (session?.user as Record<string, string> | undefined)?.walletAddress
    ?? (session?.user as Record<string, string> | undefined)?.id
    ?? '';

  const [chain, setChain] = useState<string>('0g');
  const [agentWallet, setAgentWallet] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [keyChain, setKeyChain] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(true);

  // Determine view state
  const view: ViewState = checking ? 'loading'
    : apiKey ? 'just-generated'
    : maskedKey ? 'connected'
    : 'disconnected';

  // Load existing key status when session wallet is available
  useEffect(() => {
    if (!walletAddress) return; // wait for session — keep checking=true
    setChecking(true); // re-show loading skeleton when wallet changes
    fetch(`/api/keys/status?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.maskedKey) {
          setMaskedKey(data.maskedKey);
          setKeyChain(data.chain ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [walletAddress]);

  // If session never loads (unauthenticated), stop showing skeleton after timeout
  useEffect(() => {
    if (!walletAddress && checking) {
      const timer = setTimeout(() => setChecking(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [walletAddress, checking]);

  async function handleGenerate() {
    if (!walletAddress && !agentWallet) { setError('Wallet address required'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: agentWallet || walletAddress, chain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setApiKey(data.key);
      setMaskedKey(data.maskedKey);
      setKeyChain(data.chain);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate key');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: agentWallet || walletAddress }),
      });
      if (!res.ok) throw new Error('Revoke failed');
      setApiKey(null);
      setMaskedKey(null);
      setKeyChain(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed');
    } finally {
      setBusy(false);
    }
  }

  function copyKey() {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ── LOADING ────────────────────────────────────
  if (view === 'loading') {
    return (
      <div className="rounded-xl border border-border-card bg-white p-4 flex items-center gap-3 shadow-sm animate-pulse">
        <div className="w-9 h-9 rounded-full bg-border-card" />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-4 w-32 rounded bg-border-card" />
          <div className="h-3 w-48 rounded bg-border-card" />
        </div>
      </div>
    );
  }

  // ── CONNECTED (has key — show status + reset) ──
  if (view === 'connected') {
    const chainLabel = CHAINS.find(c => c.id === keyChain)?.label ?? keyChain ?? 'Unknown';
    return (
      <div className="rounded-xl border border-status-verified/30 bg-status-verified/5 p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-status-verified/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-status-verified" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">Agent Connected</p>
            <p className="text-[11px] text-secondary">Your agent instance is authenticated</p>
          </div>
        </div>

        <div className="rounded-lg bg-white border border-border-card p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">API Key</span>
            <span className="text-xs font-mono text-primary">{maskedKey}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">Chain</span>
            <span className="text-xs text-primary">{chainLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">Status</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-status-verified">
              <Check className="w-3 h-3" /> Active
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-status-failed/10 border border-status-failed/30 p-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-status-failed shrink-0" />
            <p className="text-xs text-status-failed">{error}</p>
          </div>
        )}

        <button
          onClick={handleRevoke}
          disabled={busy}
          className="w-full min-h-[44px] rounded-lg border border-status-failed/30 text-status-failed text-sm font-medium flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
          {busy ? 'Disconnecting...' : 'Disconnect & Reset API Key'}
        </button>
      </div>
    );
  }

  // ── JUST GENERATED (show key once) ─────────────
  if (view === 'just-generated') {
    return (
      <div className="rounded-xl border border-status-verified/30 bg-status-verified/5 p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-status-verified/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-status-verified" />
          </div>
          <div>
            <p className="text-sm font-semibold text-status-verified">Agent Connected</p>
              <p className="text-[11px] text-secondary">Copy your API key now — it won&apos;t be shown again</p>
          </div>
        </div>

        <div className="rounded-lg bg-white border border-border-card p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-primary bg-surface px-2 py-1 rounded flex-1 truncate">{apiKey}</code>
            <button onClick={copyKey} className="shrink-0 cursor-pointer">
              {copied ? <Check className="w-4 h-4 text-status-verified" /> : <Copy className="w-4 h-4 text-secondary" />}
            </button>
          </div>
          <p className="text-[10px] text-secondary">
            Set in your agent config: <code className="bg-surface px-1 rounded">X-API-Key: {apiKey?.slice(0, 12)}...</code>
          </p>
        </div>

        <button
          onClick={() => setApiKey(null)}
          className="w-full min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
        >
          <Check className="w-4 h-4" />
          Done — I&apos;ve Copied My Key
        </button>
      </div>
    );
  }

  // ── DISCONNECTED (show connect form) ───────────
  return (
    <div className="rounded-xl border border-border-card bg-white p-4 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-accent/10 flex items-center justify-center shrink-0">
          <Key className="w-5 h-5 text-primary-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">Connect Your Agent</p>
          <p className="text-[11px] text-secondary">Generate an API key to connect your agent instance</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="agent-chain" className="text-sm font-medium text-primary">Settlement Chain</label>
        <select id="agent-chain" value={chain} onChange={(e) => setChain(e.target.value)}
          className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 cursor-pointer">
          {CHAINS.map((c) => (<option key={c.id} value={c.id}>{c.label} — {c.desc}</option>))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="agent-wallet" className="text-sm font-medium text-primary">Agent Wallet Address</label>
        <input id="agent-wallet" type="text"
          placeholder={walletAddress ? `Default: ${walletAddress.slice(0, 10)}...` : '0x...'}
          value={agentWallet} onChange={(e) => setAgentWallet(e.target.value)}
          className="w-full min-h-[44px] rounded-lg border border-border-card bg-surface px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-accent/30" />
        <p className="text-[10px] text-secondary">The wallet your agent uses to transact on-chain</p>
      </div>

      <div className="rounded-lg bg-surface border border-border-card p-3">
        <p className="text-[10px] text-secondary">Your agent&apos;s private key stays in your agent config — never sent to our servers. The API key authenticates requests; signing happens locally.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-status-failed/10 border border-status-failed/30 p-3 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-status-failed shrink-0" />
          <p className="text-xs text-status-failed">{error}</p>
        </div>
      )}

      <button onClick={handleGenerate} disabled={busy}
        className="w-full min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
        {busy ? 'Connecting...' : 'Connect Agent'}
      </button>
    </div>
  );
}
