import { Page } from '@/components/PageLayout';
import { AuthButton } from '../components/AuthButton';
import { Globe, Zap, CircleDollarSign } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center gap-8 px-6">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Image
            src="/app-logo.png"
            alt="Vocaid Hub"
            width={180}
            height={60}
            priority
            className="h-auto"
          />
          <p className="text-sm text-secondary text-center max-w-[280px]">
            Discover, verify, and trade any resource — human skills, GPU compute, AI agents.
          </p>
        </div>

        <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-chain-world/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-chain-world" />
            </div>
            <span className="text-[11px] text-secondary">Trust</span>
          </div>
          <div className="w-6 h-px bg-border-card" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-chain-og/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-chain-og" />
            </div>
            <span className="text-[11px] text-secondary">Verify</span>
          </div>
          <div className="w-6 h-px bg-border-card" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-chain-hedera/10 flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5 text-chain-hedera" />
            </div>
            <span className="text-[11px] text-secondary">Settle</span>
          </div>
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <AuthButton />
        </div>
      </Page.Main>
    </Page>
  );
}
