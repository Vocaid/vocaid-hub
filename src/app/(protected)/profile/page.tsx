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

// Only show the user's own 4-agent fleet (Seer, Edge, Shield, Lens)
// The on-chain IdentityRegistry has 30+ identities from all users — we filter to our fleet
const FLEET_AGENTS: AgentData[] = [
  { agentId: '27', owner: '0x58c4...7eeE', agentURI: '/agent-cards/seer.json', wallet: '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE', operatorWorldId: 'verified', role: 'signal-analyst', type: 'ai-agent' },
  { agentId: '28', owner: '0x58c4...7eeE', agentURI: '/agent-cards/edge.json', wallet: '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE', operatorWorldId: 'verified', role: 'market-maker', type: 'ai-agent' },
  { agentId: '29', owner: '0x58c4...7eeE', agentURI: '/agent-cards/shield.json', wallet: '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE', operatorWorldId: 'verified', role: 'risk-manager', type: 'ai-agent' },
  { agentId: '30', owner: '0x58c4...7eeE', agentURI: '/agent-cards/lens.json', wallet: '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE', operatorWorldId: 'verified', role: 'discovery', type: 'ai-agent' },
];

async function getAgents(): Promise<AgentData[]> {
  // Return the user's known fleet agents with their on-chain IDs
  // In production, this would filter by owner from the IdentityRegistry
  return FLEET_AGENTS;
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
