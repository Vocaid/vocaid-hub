import { auth } from '@/auth';
import { MarketplaceContent } from './marketplace-content';
import { Page } from '@/components/PageLayout';
import { TopBar, Marble } from '@worldcoin/mini-apps-ui-kit-react';
import type { ResourceCardProps } from '@/components/ResourceCard';

export const revalidate = 30; // ISR every 30 seconds

async function getResources(): Promise<ResourceCardProps[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/resources`, {
      next: { revalidate: 30 },
    });
    if (res.ok) return res.json();
  } catch {
    // API not available yet — fall back to mock data
  }

  // Mock data for development / demo
  return [
    {
      type: 'gpu',
      name: 'GPU-Alpha',
      subtitle: 'H100 · 80GB VRAM',
      reputation: 82,
      verified: true,
      chain: '0g',
      price: '$0.05/call',
      verificationType: 'tee',
    },
    {
      type: 'agent',
      name: 'Seer Agent',
      subtitle: 'Signal Analysis',
      reputation: 95,
      verified: true,
      chain: 'world',
      price: '$0.02/call',
      verificationType: 'world-id',
    },
    {
      type: 'human',
      name: 'Maria (Rust)',
      subtitle: 'Skill: L4 Verified',
      reputation: 78,
      verified: true,
      chain: 'world',
      price: '$25/hr',
      verificationType: 'world-id',
    },
    {
      type: 'gpu',
      name: 'GPU-Beta',
      subtitle: 'H200 · 141GB VRAM',
      reputation: 64,
      verified: false,
      chain: '0g',
      price: '$0.08/call',
      verificationType: 'tee',
    },
    {
      type: 'agent',
      name: 'Edge Agent',
      subtitle: 'Market Pricing',
      reputation: 88,
      verified: true,
      chain: '0g',
      price: '$0.01/call',
      verificationType: 'tee',
    },
    {
      type: 'human',
      name: 'Carlos (ML)',
      subtitle: 'Skill: L3',
      reputation: 71,
      verified: true,
      chain: 'hedera',
      price: '$30/hr',
      verificationType: 'world-id',
    },
  ];
}

export default async function Home() {
  const [session, resources] = await Promise.all([auth(), getResources()]);

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          startAdornment={
            <img src="/app-logo.png" alt="Vocaid Hub" className="h-6" />
          }
          endAdornment={
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold capitalize">
                {session?.user.username}
              </p>
              <Marble src={session?.user.profilePictureUrl} className="w-12" />
            </div>
          }
        />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4">
        <MarketplaceContent resources={resources} />
      </Page.Main>
    </>
  );
}
