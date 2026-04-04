import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { AgentDecisionContent } from './agent-decision-content';

export const revalidate = 30;

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

export default async function AgentDecisionPage() {
  const decision = await getDecision();

  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="Seer Agent — GPU Selection" />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4 pt-4">
        <AgentDecisionContent decision={decision} />
      </Page.Main>
    </>
  );
}
