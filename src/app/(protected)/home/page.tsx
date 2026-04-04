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

  // Mock data for development / demo — diverse verified resources
  return [
    { type: 'gpu', name: 'GPU-Alpha', reputation: 87, verified: true, chain: '0g', price: '$0.04/1K tok', verificationType: 'tee', subtitle: 'H100 · EU Frankfurt' },
    { type: 'gpu', name: 'GPU-Beta', reputation: 92, verified: true, chain: '0g', price: '$0.06/1K tok', verificationType: 'tee', subtitle: 'H200 · US East' },
    { type: 'human', name: 'Maria', reputation: 91, verified: true, chain: 'world', price: '$45/hr', verificationType: 'world-id', subtitle: 'Rust Developer · L4' },
    { type: 'human', name: 'Aisha', reputation: 88, verified: true, chain: 'world', price: '$55/hr', verificationType: 'world-id', subtitle: 'Solidity Engineer · L5' },
    { type: 'agent', name: 'Seer Agent', reputation: 95, verified: true, chain: '0g', price: '$0.01/query', verificationType: 'agentkit', subtitle: 'Signal Analysis' },
    { type: 'agent', name: 'Edge Agent', reputation: 90, verified: true, chain: '0g', price: '$0.02/trade', verificationType: 'agentkit', subtitle: 'Market Maker' },
    { type: 'depin', name: 'SolarNode-EU', reputation: 85, verified: true, chain: 'hedera', price: '$0.08/kWh', verificationType: 'tee', subtitle: '50kW · Frankfurt' },
    { type: 'depin', name: 'BandwidthRelay-US', reputation: 82, verified: true, chain: 'hedera', price: '$0.003/GB', verificationType: 'tee', subtitle: '10Gbps · Virginia' },
  ];
}

async function getDecision() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/agent-decision`, {
      next: { revalidate: 30 },
    });
    if (res.ok) return res.json();
  } catch { /* fallback */ }

  return null;
}

export default async function Home() {
  const [resources, decision] = await Promise.all([getResources(), getDecision()]);

  return (
    <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4">
      <MarketplaceContent resources={resources} decision={decision} />
    </Page.Main>
  );
}
