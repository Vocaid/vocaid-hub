import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { PredictionMarket } from '@/components/PredictionCard';
import { PredictionsContent } from './predictions-content';
import { ethers } from 'ethers';

export const revalidate = 10; // ISR every 10 seconds

const RESOURCE_PREDICTION_ABI = [
  'function nextMarketId() view returns (uint256)',
  'function getMarket(uint256 marketId) view returns (tuple(string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool, address creator))',
];

async function getMarkets(): Promise<PredictionMarket[]> {
  try {
    const rpc = process.env.OG_RPC_URL;
    const address = process.env.RESOURCE_PREDICTION;
    if (!rpc || !address) return [];

    const provider = new ethers.JsonRpcProvider(rpc);
    const contract = new ethers.Contract(address, RESOURCE_PREDICTION_ABI, provider);
    const nextId = await contract.nextMarketId();
    const count = Number(nextId);
    if (count === 0) return [];

    return await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const m = await contract.getMarket(i);
        return {
          id: i,
          question: m.question,
          resolutionTime: Number(m.resolutionTime),
          state: Number(m.state),
          winningOutcome: Number(m.winningOutcome),
          yesPool: m.yesPool.toString(),
          noPool: m.noPool.toString(),
          creator: m.creator,
        };
      })
    );
  } catch (err) {
    console.error('SSR getMarkets failed:', err);
  }
  return [];
}

export default async function PredictionsPage() {
  const markets = await getMarkets();

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title="Prediction Markets"
          startAdornment={
            <Link
              href="/home"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface"
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </Link>
          }
        />
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4">
        <PredictionsContent initialMarkets={markets} />
      </Page.Main>
    </>
  );
}
