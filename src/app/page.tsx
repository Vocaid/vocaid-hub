import { Page } from '@/components/PageLayout';
import { AuthButton } from '../components/AuthButton';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center gap-8 px-6 mb-16">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Image
            src="/app-logo.png"
            alt="Vocaid Hub"
            width={240}
            height={76}
            priority
          />
          <p className="text-sm text-secondary text-center max-w-[280px]">
            Discover, verify, and trade any resource — human skills, GPU compute, AI agents, physical infrastructure.
          </p>
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <AuthButton />
        </div>
      </Page.Main>
    </Page>
  );
}
