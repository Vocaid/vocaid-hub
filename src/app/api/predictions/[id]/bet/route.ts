import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RESOURCE_PREDICTION_ABI = [
  'function placeBet(uint256 marketId, uint8 side) payable',
] as const;

function getSigner() {
  const rpc = process.env.OG_RPC_URL;
  const pk = process.env.PRIVATE_KEY;
  const address = process.env.RESOURCE_PREDICTION;
  if (!rpc || !pk || !address) {
    throw new Error('Missing OG_RPC_URL, PRIVATE_KEY, or RESOURCE_PREDICTION env');
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(address, RESOURCE_PREDICTION_ABI, signer);
  return contract;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const marketId = parseInt(id, 10);
    if (isNaN(marketId)) {
      return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });
    }

    const body = await request.json();
    const { side, amount } = body;

    // side: 'yes' = 1, 'no' = 2 (matches Outcome enum in contract)
    const outcomeEnum = side === 'yes' ? 1 : side === 'no' ? 2 : 0;
    if (outcomeEnum === 0) {
      return NextResponse.json({ error: 'Invalid side, must be "yes" or "no"' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const contract = getSigner();
    const value = ethers.parseEther(String(amount));

    const tx = await contract.placeBet(marketId, outcomeEnum, { value });
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      marketId,
      side,
      amount: String(amount),
    });
  } catch (error: unknown) {
    console.error('Failed to place bet:', error);
    const message = error instanceof Error ? error.message : 'Failed to place bet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
