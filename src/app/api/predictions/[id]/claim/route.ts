import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const CLAIM_ABI = [
  'function claimWinnings(uint256)',
  'function claimRefund(uint256)',
  'function getMarket(uint256) view returns (tuple(string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool, address creator))',
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const marketId = parseInt(id, 10);
    if (isNaN(marketId)) {
      return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai',
    );
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(
      process.env.RESOURCE_PREDICTION!,
      CLAIM_ABI,
      signer,
    );

    const market = await contract.getMarket(marketId);
    const state = Number(market.state);

    let tx;
    let action: string;

    if (state === 1) {
      tx = await contract.claimWinnings(marketId);
      action = 'claimWinnings';
    } else if (state === 2) {
      tx = await contract.claimRefund(marketId);
      action = 'claimRefund';
    } else {
      return NextResponse.json(
        { error: 'Market is still active — cannot claim yet' },
        { status: 400 },
      );
    }

    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      marketId,
      action,
    });
  } catch (err) {
    console.error('[predictions/claim]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to claim' },
      { status: 500 },
    );
  }
}
