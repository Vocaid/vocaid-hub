import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const PROPOSAL_ABI = [
  'function proposalCount() view returns (uint256)',
  'function getProposal(uint256) view returns (uint256 agentId, uint8 pType, bytes data, uint8 status, uint256 createdAt)',
  'function submitProposal(uint256 agentId, uint8 pType, bytes data)',
  'function approveAndExecute(uint256 proposalId) payable',
  'function reject(uint256 proposalId)',
];

const PREDICTION_ABI = [
  'function getMarket(uint256) view returns (tuple(string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool, address creator))',
];

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai');
}

function getContract(withSigner = false) {
  const address = process.env.AGENT_PROPOSAL_REGISTRY;
  if (!address) throw new Error('AGENT_PROPOSAL_REGISTRY not set');
  const provider = getProvider();
  if (withSigner) {
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    return new ethers.Contract(address, PROPOSAL_ABI, signer);
  }
  return new ethers.Contract(address, PROPOSAL_ABI, provider);
}

/** GET /api/proposals?agentId=X — list proposals for an agent */
export async function GET(req: NextRequest) {
  try {
    const agentId = req.nextUrl.searchParams.get('agentId');
    const contract = getContract();
    const count = Number(await contract.proposalCount());

    if (count === 0) return NextResponse.json({ proposals: [] });

    const predictionAddr = process.env.RESOURCE_PREDICTION;
    const predictionContract = predictionAddr
      ? new ethers.Contract(predictionAddr, PREDICTION_ABI, getProvider())
      : null;

    const proposals = [];
    for (let i = 0; i < count; i++) {
      const [pAgentId, pType, data, status, createdAt] = await contract.getProposal(i);
      const aid = Number(pAgentId);

      // Filter by agentId if specified
      if (agentId && aid !== Number(agentId)) continue;

      // Decode proposal data
      let decoded: Record<string, unknown> = {};
      try {
        if (Number(pType) === 0) {
          // BET: (uint256 marketId, uint8 side, uint256 amount)
          const [marketId, side, amount] = ethers.AbiCoder.defaultAbiCoder().decode(
            ['uint256', 'uint8', 'uint256'], data
          );
          const sideLabel = Number(side) === 1 ? 'YES' : 'NO';
          let question = `Market #${Number(marketId)}`;
          if (predictionContract) {
            try {
              const market = await predictionContract.getMarket(Number(marketId));
              question = market.question;
            } catch { /* fallback to ID */ }
          }
          decoded = { marketId: Number(marketId), side: sideLabel, amount: ethers.formatEther(amount), question };
        } else {
          // CREATE_MARKET: (string question, uint256 resolutionTime)
          const [question, resolutionTime] = ethers.AbiCoder.defaultAbiCoder().decode(
            ['string', 'uint256'], data
          );
          decoded = { question, resolutionTime: Number(resolutionTime) };
        }
      } catch { /* leave decoded empty */ }

      // Check expiry (24h)
      const expired = Date.now() / 1000 > Number(createdAt) + 86400;
      const statusLabel = expired && Number(status) === 0
        ? 'expired'
        : ['pending', 'approved', 'rejected', 'expired'][Number(status)];

      proposals.push({
        id: i,
        agentId: aid,
        type: Number(pType) === 0 ? 'bet' : 'create_market',
        status: statusLabel,
        createdAt: Number(createdAt),
        expiresAt: Number(createdAt) + 86400,
        decoded,
      });
    }

    return NextResponse.json({ proposals });
  } catch (err) {
    console.error('[proposals/GET]', err);
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 });
  }
}

/** POST /api/proposals — submit, approve, or reject */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const contract = getContract(true);

    if (action === 'submit') {
      const { agentId, proposalType, marketId, side, amount, question, resolutionTime } = body;
      const pType = proposalType === 'bet' ? 0 : 1;

      let data: string;
      if (pType === 0) {
        const sideEnum = side === 'yes' ? 1 : 2;
        data = ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint8', 'uint256'],
          [marketId, sideEnum, ethers.parseEther(String(amount))]
        );
      } else {
        data = ethers.AbiCoder.defaultAbiCoder().encode(
          ['string', 'uint256'],
          [question, resolutionTime]
        );
      }

      const tx = await contract.submitProposal(agentId, pType, data);
      const receipt = await tx.wait();
      return NextResponse.json({ success: true, txHash: receipt.hash });

    } else if (action === 'approve') {
      const { proposalId, value } = body;
      const tx = await contract.approveAndExecute(proposalId, {
        value: value ? ethers.parseEther(String(value)) : 0n,
      });
      const receipt = await tx.wait();
      return NextResponse.json({ success: true, txHash: receipt.hash });

    } else if (action === 'reject') {
      const { proposalId } = body;
      const tx = await contract.reject(proposalId);
      const receipt = await tx.wait();
      return NextResponse.json({ success: true, txHash: receipt.hash });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[proposals/POST]', err);
    return NextResponse.json({ error: 'Failed to process proposal' }, { status: 500 });
  }
}
