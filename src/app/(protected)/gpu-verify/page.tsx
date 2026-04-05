import Link from 'next/link';
import { Bot } from 'lucide-react';
import GPUVerifyTabs from './GPUVerifyTabs';

export const metadata = {
  title: 'Resources — Vocaid Hub',
  description:
    'Register and manage marketplace resources on ERC-8004 — GPU compute, AI agents, human skills, DePIN',
};

export default function GPUVerifyPage() {
  return (
    <div className="flex flex-col items-stretch gap-4 mb-16 px-4 pt-2">
      <div>
        <h1 className="text-lg font-semibold text-primary">Resources</h1>
        <p className="text-xs text-secondary">Register and manage resources listed on the marketplace</p>
      </div>

      <GPUVerifyTabs />

      {/* Cross-link to Agents page for fleet deployment */}
      <Link
        href="/profile"
        className="flex items-center gap-2.5 rounded-lg border border-border-card bg-surface px-3 py-2.5 hover:border-primary-accent/50 transition-colors cursor-pointer"
      >
        <Bot className="w-4 h-4 text-primary-accent shrink-0" />
        <span className="text-xs text-secondary">
          Looking to deploy your trading fleet? <span className="font-medium text-primary-accent">Go to Agents →</span>
        </span>
      </Link>
    </div>
  );
}
