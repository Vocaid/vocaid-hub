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
    { type: 'gpu', name: 'Nebula-H100', reputation: 87, verified: true, chain: '0g', price: '$0.004/1K tok', verificationType: 'tee', subtitle: 'H100 80GB · EU Frankfurt' },
    { type: 'gpu', name: 'Titan-H200', reputation: 92, verified: true, chain: '0g', price: '$0.006/1K tok', verificationType: 'tee', subtitle: 'H200 141GB · US East' },
    { type: 'human', name: 'Camila Torres', reputation: 91, verified: true, chain: 'world', price: '$0.005/min', verificationType: 'world-id', subtitle: 'Rust Developer · L4' },
    { type: 'human', name: 'Yuki Tanaka', reputation: 88, verified: true, chain: 'world', price: '$0.008/min', verificationType: 'world-id', subtitle: 'Solidity Engineer · L5' },
    { type: 'human', name: 'Kwame Asante', reputation: 84, verified: true, chain: 'world', price: '$0.004/min', verificationType: 'world-id', subtitle: 'ML Engineer · L4' },
    { type: 'agent', name: 'Orion', reputation: 95, verified: true, chain: '0g', price: '$0.001/query', verificationType: 'agentkit', subtitle: 'Signal Analysis Agent' },
    { type: 'agent', name: 'Vega', reputation: 90, verified: true, chain: '0g', price: '$0.002/trade', verificationType: 'agentkit', subtitle: 'Market Maker Agent' },
    { type: 'agent', name: 'Lyra', reputation: 93, verified: true, chain: '0g', price: '$0.001/check', verificationType: 'agentkit', subtitle: 'Compliance Agent' },
    { type: 'depin', name: 'Helios Solar Farm', reputation: 85, verified: true, chain: 'hedera', price: '$0.008/kWh', verificationType: 'tee', subtitle: '50kW · Frankfurt' },
    { type: 'depin', name: 'FiberLink Relay', reputation: 82, verified: true, chain: 'hedera', price: '$0.003/GB', verificationType: 'tee', subtitle: '10Gbps · Virginia' },
    { type: 'depin', name: 'GridPulse Energy', reputation: 79, verified: true, chain: 'hedera', price: '$0.002/kWh', verificationType: 'tee', subtitle: 'Grid Power · 200kW · Paris' },
    { type: 'depin', name: 'Tesla Model Y Fleet', reputation: 88, verified: true, chain: 'hedera', price: '$0.005/mi', verificationType: 'tee', subtitle: 'Autonomous · 12 vehicles · LA' },
  ];
}

export default async function Home() {
  const resources = await getResources();

  return (
    <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4 pt-2">
      <MarketplaceContent resources={resources} />
    </Page.Main>
  );
}
