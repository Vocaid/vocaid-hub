import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import type { PredictionMarket } from '@/components/PredictionCard';
import { PredictionsContent } from './predictions-content';

export const revalidate = 10; // ISR every 10 seconds

async function getMarkets(): Promise<PredictionMarket[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/predictions`, {
      next: { revalidate: 10 },
    });
    if (res.ok) return res.json();
  } catch {
    // API not available — fall back to empty
  }
  return [];
}

export default async function PredictionsPage() {
  const markets = await getMarkets();

  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="Prediction Markets" />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4">
        <PredictionsContent initialMarkets={markets} />
      </Page.Main>
    </>
  );
}
