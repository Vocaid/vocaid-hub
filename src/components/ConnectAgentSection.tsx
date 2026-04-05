'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Key, Copy, Check, Loader2, XCircle, Shield } from 'lucide-react';

const CHAINS = [
  { id: '0g', label: '0G Galileo (16602)', desc: 'ERC-8004, Compute, Storage' },
  { id: 'hedera', label: 'Hedera Testnet', desc: 'x402 USDC, HTS, HCS' },
  { id: 'world', label: 'World Sepolia (4801)', desc: 'World ID, CredentialGate' },
] as const;

export function ConnectAgentSection() {
  const { data: session } = useSession();
  const walletAddress = (session?.user as Record<string, string> | undefined)?.walletAddress
    ?? (session?.user as Record<string, string> | undefined)?.id
    ?? '';

  const [chain, setChain] = useState<string>('0g');
  const [agentWallet, setAgentWallet] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!walletAddress && !agentWallet) {
      setError('Wallet address required');
      return;
    }
    setLoading(true);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate key');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    try {
      await fetch('/api/keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: agentWallet || walletAddress }),
      });
      setApiKey(null);
      setMaskedKey(null);
    } catch { setError('Revoke failed'); }
    finally { setLoading(false); }
  }

  function copyKey() {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="rounded-xl border border-border-card bg-white p-4 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-accent/10 flex items-center justify-center shrink-0">
          <Key className="w-5 h-5 text-primary-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">Connect Your Agent</p>
          <p className="text-[11px] text-secondary">Generate an API key for your OpenClaw agent instance</p>
        </div>
      </div>

      {maskedKey && !apiKey && (
        <div className="rounded-lg bg-surface border border-border-card p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-secondary">Active API Key</p>
            <p className="text-sm font-mono text-primary">{maskedKey}</p>
          </div>
          <button onClick={handleRevoke} disabled={loading} className="text-xs text-status-failed cursor-pointer">Revoke</button>
        </div>
      )}

      {apiKey && (
        <div className="rounded-lg bg-status-verified/5 border border-status-verified/30 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-status-verified" />
            <p className="text-xs font-medium text-status-verified">API Key Generated — Copy Now (shown once)</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-primary bg-surface px-2 py-1 rounded flex-1 truncate">{apiKey}</code>
            <button onClick={copyKey} className="shrink-0 cursor-pointer">
              {copied ? <Check className="w-4 h-4 text-status-verified" /> : <Copy className="w-4 h-4 text-secondary" />}
            </button>
          </div>
          <p className="text-[10px] text-secondary">Add to your OpenClaw config: <code className="bg-surface px-1 rounded">X-API-Key: voc_...</code></p>
        </div>
      )}

      {!apiKey && (
        <>
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

          {/* Private key management is handled in the user's OpenClaw agent config, not in the web UI */}
          <div className="rounded-lg bg-surface border border-border-card p-3">
            <p className="text-[10px] text-secondary">Your agent&apos;s private key stays in your OpenClaw config file — it is never sent to our servers. The API key authenticates your agent&apos;s requests; transaction signing happens locally on your machine.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-status-failed/10 border border-status-failed/30 p-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-status-failed shrink-0" />
              <p className="text-xs text-status-failed">{error}</p>
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading}
            className="w-full min-h-[44px] rounded-lg bg-primary-accent text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Generate API Key'}
          </button>
        </>
      )}
    </div>
  );
}
