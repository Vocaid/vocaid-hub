'use client';

import { ShieldCheck, ArrowRight } from 'lucide-react';
import { ChainBadge } from '@/components/ChainBadge';
import Link from 'next/link';
import { ConnectAgentSection } from '@/components/ConnectAgentSection';

interface ProfileContentProps {
  username: string;
  walletAddress?: string;
}

function truncateAddress(addr?: string): string {
  if (!addr) return '—';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ProfileContent({ username, walletAddress }: ProfileContentProps) {
  return (
    <>
      {/* Identity card */}
      <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-accent/5">
            <ChainBadge chain="world" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary capitalize">{username}</p>
            <p className="text-xs font-mono text-secondary">{truncateAddress(walletAddress)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-status-verified/10 text-status-verified">
            <ShieldCheck className="w-3.5 h-3.5" />
            World ID Verified
          </span>
          <span className="text-xs text-secondary">ERC-8004 ID: #1</span>
        </div>
      </div>

      {/* ── Connect Your Agent ────────────────────────── */}
      <ConnectAgentSection />

      {/* ── Link to Resources page for marketplace registration ── */}
      <Link
        href="/gpu-verify"
        className="flex items-center justify-between rounded-xl border border-dashed border-border-card p-4 hover:border-primary-accent/50 transition-colors cursor-pointer"
      >
        <div>
          <p className="text-sm font-medium text-primary">Register resources for the marketplace</p>
          <p className="text-xs text-secondary mt-0.5">GPUs, agents, skills, and DePIN devices available for hire</p>
        </div>
        <ArrowRight className="w-4 h-4 text-secondary shrink-0" />
      </Link>
    </>
  );
}
