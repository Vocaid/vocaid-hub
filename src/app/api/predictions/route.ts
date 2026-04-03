import { NextResponse } from 'next/server';
import { requireWorldId } from '@/lib/world-id';
import { ethers } from 'ethers';

const RESOURCE_PREDICTION_ABI = [
  'function nextMarketId() view returns (uint256)',
  'function getMarket(uint256 marketId) view returns (tuple(string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool, address creator))',
] as const;

function getContract(withSigner = false) {
  const rpc = process.env.OG_RPC_URL;
  const address = process.env.RESOURCE_PREDICTION;
  if (!rpc || !address) throw new Error('Missing OG_RPC_URL or RESOURCE_PREDICTION env');

  const provider = new ethers.JsonRpcProvider(rpc);
  if (withSigner) {
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    return new ethers.Contract(address, [
      ...RESOURCE_PREDICTION_ABI,
      'function createMarket(string,uint256) returns (uint256)',
      'function placeBet(uint256,uint8) payable',
    ], signer);
  }
  return new ethers.Contract(address, RESOURCE_PREDICTION_ABI, provider);
}

export async function GET() {
  const gate = await requireWorldId();
  if (gate instanceof NextResponse) return gate;

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

export async function POST(req: Request) {
  const gate = await requireWorldId();
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await req.json();
    const { question, resolutionTime, initialSide, initialAmount } = body as {
      question: string;
      resolutionTime: number;
      initialSide?: 'yes' | 'no';
      initialAmount?: number;
    };

    if (!question || !resolutionTime) {
      return NextResponse.json(
        { error: 'question and resolutionTime required' },
        { status: 400 },
      );
    }

    if (resolutionTime <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        { error: 'resolutionTime must be in the future' },
        { status: 400 },
      );
    }

    const contract = getContract(true);

    const createTx = await contract.createMarket(question, resolutionTime);
    const createReceipt = await createTx.wait();

    const nextId = await contract.nextMarketId();
    const marketId = Number(nextId) - 1;

    let betTxHash: string | null = null;

    if (initialSide && initialAmount && initialAmount > 0) {
      const outcomeEnum = initialSide === 'yes' ? 1 : 2;
      const betTx = await contract.placeBet(marketId, outcomeEnum, {
        value: ethers.parseEther(String(initialAmount)),
      });
      const betReceipt = await betTx.wait();
      betTxHash = betReceipt.hash;
    }

    return NextResponse.json({
      success: true,
      marketId,
      txHash: createReceipt.hash,
      betTxHash,
    });
  } catch (err) {
    console.error('[predictions/POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create market' },
      { status: 500 },
    );
  }
}
