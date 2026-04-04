import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { logAuditMessage } from '@/lib/hedera';
import { requireWorldId } from '@/lib/world-id';

const RESOLVE_ABI = [
  'function resolveMarket(uint256,uint8)',
  'function getMarket(uint256) view returns (tuple(string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool, address creator))',
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireWorldId();
    if (gate instanceof NextResponse) return gate;

    const { id } = await params;
    const marketId = parseInt(id, 10);
    if (isNaN(marketId)) {
      return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });
    }

    const body = await req.json();
    const { outcome } = body as { outcome: 'yes' | 'no' };

    if (outcome !== 'yes' && outcome !== 'no') {
      return NextResponse.json(
        { error: 'outcome must be "yes" or "no"' },
        { status: 400 },
      );
    }

    const outcomeEnum = outcome === 'yes' ? 1 : 2;

    const provider = new ethers.JsonRpcProvider(
      process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai',
    );
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(
      process.env.RESOURCE_PREDICTION!,
      RESOLVE_ABI,
      signer,
    );

    const tx = await contract.resolveMarket(marketId, outcomeEnum);
    const receipt = await tx.wait();

    // Cross-chain audit: log resolution to Hedera HCS
    const auditTopicId = process.env.HEDERA_AUDIT_TOPIC || '0.0.8499635';
    try {
      const market = await contract.getMarket(marketId);
      await logAuditMessage(auditTopicId, JSON.stringify({
        event: 'market_resolved',
        marketId,
        outcome,
        question: market.question,
        totalPool: (market.yesPool + market.noPool).toString(),
        txHash: receipt.hash,
        chain: '0g-galileo',
        timestamp: new Date().toISOString(),
      }));
    } catch (hcsErr) {
      console.error('[resolve] HCS audit failed (non-blocking):', hcsErr);
    }

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      marketId,
      outcome,
    });
  } catch (err) {
    console.error('[predictions/resolve]', err);
    return NextResponse.json(
      { error: "Failed to resolve market" },
      { status: 500 },
    );
  }
}
