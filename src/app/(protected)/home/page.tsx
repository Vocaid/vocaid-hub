import { MarketplaceContent } from './marketplace-content';
import { Page } from '@/components/PageLayout';
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
  const resources = await getResources();

  return (
    <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4">
      <MarketplaceContent resources={resources} />
    </Page.Main>
  );
}
