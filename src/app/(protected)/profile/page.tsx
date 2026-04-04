import { auth } from '@/auth';
import { Page } from '@/components/PageLayout';
import { ProfileContent } from './profile-content';

export const metadata = {
  title: 'My Resources — Vocaid Hub',
};

interface AgentData {
  agentId: string;
  owner: string;
  agentURI: string;
  wallet: string;
  operatorWorldId: string;
  role: string;
  type: string;
}

async function getAgents(): Promise<AgentData[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/agents`, {
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const data = await res.json();
      return data.agents ?? [];
    }
  } catch {
    // API not available — fall back to mock data
  }

  return [
    { agentId: '3', owner: '0x58c4...7eeE', agentURI: '/agent-cards/seer.json', wallet: '0x1111...1111', operatorWorldId: 'verified', role: 'signal-analyst', type: 'ai-agent' },
    { agentId: '4', owner: '0x58c4...7eeE', agentURI: '/agent-cards/edge.json', wallet: '0x2222...2222', operatorWorldId: 'verified', role: 'market-maker', type: 'ai-agent' },
    { agentId: '5', owner: '0x58c4...7eeE', agentURI: '/agent-cards/shield.json', wallet: '0x3333...3333', operatorWorldId: 'verified', role: 'risk-manager', type: 'ai-agent' },
    { agentId: '6', owner: '0x58c4...7eeE', agentURI: '/agent-cards/lens.json', wallet: '0x4444...4444', operatorWorldId: 'verified', role: 'discovery', type: 'ai-agent' },
  ];
}

export default async function ProfilePage() {
  const [session, agents] = await Promise.all([auth(), getAgents()]);

  return (
    <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4 pt-2">
      <ProfileContent
        username={session?.user.username ?? 'Anonymous'}
        walletAddress={session?.user.walletAddress}
        agents={agents}
      />
    </Page.Main>
  );
}
