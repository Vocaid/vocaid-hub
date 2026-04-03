import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RESOURCE_PREDICTION_ABI = [
  'function nextMarketId() view returns (uint256)',
  'function getMarket(uint256 marketId) view returns (tuple(string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool, address creator))',
] as const;

function getContract() {
  const rpc = process.env.OG_RPC_URL;
  const address = process.env.RESOURCE_PREDICTION;
  if (!rpc || !address) throw new Error('Missing OG_RPC_URL or RESOURCE_PREDICTION env');

  const provider = new ethers.JsonRpcProvider(rpc);
  return new ethers.Contract(address, RESOURCE_PREDICTION_ABI, provider);
}

export async function GET() {
  try {
    const contract = getContract();
    const nextId = await contract.nextMarketId();
    const count = Number(nextId);

    if (count === 0) {
      return NextResponse.json([]);
    }

    const markets = await Promise.all(
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

    return NextResponse.json(markets);
  } catch (error) {
    console.error('Failed to fetch prediction markets:', error);

    // Fallback mock data for demo/development
    return NextResponse.json([
      {
        id: 0,
        question: 'Will H100 cost drop below $0.005 per token by May?',
        resolutionTime: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        state: 0,
        winningOutcome: 0,
        yesPool: '62000000000000000000',
        noPool: '38000000000000000000',
        creator: '0x0000000000000000000000000000000000000000',
      },
      {
        id: 1,
        question: 'Rust developer demand +15% in Q2 2026?',
        resolutionTime: Math.floor(Date.now() / 1000) + 60 * 24 * 3600,
        state: 0,
        winningOutcome: 0,
        yesPool: '45000000000000000000',
        noPool: '55000000000000000000',
        creator: '0x0000000000000000000000000000000000000000',
      },
      {
        id: 2,
        question: 'EU GPU capacity will exceed US by end of 2026?',
        resolutionTime: Math.floor(Date.now() / 1000) + 90 * 24 * 3600,
        state: 0,
        winningOutcome: 0,
        yesPool: '30000000000000000000',
        noPool: '70000000000000000000',
        creator: '0x0000000000000000000000000000000000000000',
      },
    ]);
  }
}
