import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ethers } from 'ethers';
import { logAuditMessage } from '@/lib/hedera';
import {
  CreateMarketSchema,
  PlaceBetSchema,
  MarketIdParamsSchema,
  ResolveMarketSchema,
} from '../schemas/predictions';

const RESOURCE_PREDICTION_ABI = [
  'function nextMarketId() view returns (uint256)',
  'function getMarket(uint256 marketId) view returns (tuple(string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool, address creator))',
  'function createMarket(string,uint256) returns (uint256)',
  'function placeBet(uint256,uint8) payable',
  'function claimWinnings(uint256)',
  'function claimRefund(uint256)',
  'function resolveMarket(uint256,uint8)',
] as const;

function getContract(withSigner = false) {
  const rpc = process.env.OG_RPC_URL;
  const address = process.env.RESOURCE_PREDICTION;
  if (!rpc || !address) throw new Error('Missing OG_RPC_URL or RESOURCE_PREDICTION env');

  const provider = new ethers.JsonRpcProvider(rpc);
  if (withSigner) {
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    return new ethers.Contract(address, RESOURCE_PREDICTION_ABI, signer);
  }
  return new ethers.Contract(address, RESOURCE_PREDICTION_ABI, provider);
}

/**
 * Prediction market routes — GET/POST + :id/bet, :id/claim, :id/resolve
 */
export default async function predictionRoutes(app: FastifyInstance) {
  const f = app.withTypeProvider<ZodTypeProvider>();

  // ── GET /api/predictions ───────────────────────────────────────────────
  f.get('/predictions', async (request) => {
    try {
      const contract = getContract();
      const nextId = await contract.nextMarketId();
      const count = Number(nextId);

      if (count === 0) return [];

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
        }),
      );

      return markets;
    } catch (error) {
      request.log.error({ err: error }, 'Failed to fetch prediction markets');

      // Fallback demo data
      return [
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
      ];
    }
  });

  // ── POST /api/predictions ──────────────────────────────────────────────
  f.post(
    '/predictions',
    { schema: { body: CreateMarketSchema } },
    async (request, reply) => {
      try {
        const { question, resolutionTime, initialSide, initialAmount } = request.body;

        if (resolutionTime <= Math.floor(Date.now() / 1000)) {
          return reply.code(400).send({ error: 'resolutionTime must be in the future' });
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

        return { success: true, marketId, txHash: createReceipt.hash, betTxHash };
      } catch (err) {
        request.log.error({ err }, 'Failed to create market');
        return reply.code(500).send({ error: 'Failed to create market' });
      }
    },
  );

  // ── POST /api/predictions/:id/bet ──────────────────────────────────────
  f.post(
    '/predictions/:id/bet',
    { schema: { params: MarketIdParamsSchema, body: PlaceBetSchema } },
    async (request, reply) => {
      try {
        const { id: marketId } = request.params;
        const { side, amount } = request.body;

        const outcomeEnum = side === 'yes' ? 1 : 2;
        const contract = getContract(true);
        const value = ethers.parseEther(String(amount));

        const tx = await contract.placeBet(marketId, outcomeEnum, { value });
        const receipt = await tx.wait();

        return {
          success: true,
          txHash: receipt.hash,
          marketId,
          side,
          amount: String(amount),
        };
      } catch (err) {
        request.log.error({ err }, 'Failed to place bet');
        return reply.code(500).send({ error: 'Failed to place bet' });
      }
    },
  );

  // ── POST /api/predictions/:id/claim ────────────────────────────────────
  f.post(
    '/predictions/:id/claim',
    { schema: { params: MarketIdParamsSchema } },
    async (request, reply) => {
      try {
        const { id: marketId } = request.params;
        const contract = getContract(true);

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
          return reply.code(400).send({ error: 'Market is still active — cannot claim yet' });
        }

        const receipt = await tx.wait();
        return { success: true, txHash: receipt.hash, marketId, action };
      } catch (err) {
        request.log.error({ err }, 'Failed to claim winnings');
        return reply.code(500).send({ error: 'Failed to claim winnings' });
      }
    },
  );

  // ── POST /api/predictions/:id/resolve ──────────────────────────────────
  f.post(
    '/predictions/:id/resolve',
    { schema: { params: MarketIdParamsSchema, body: ResolveMarketSchema } },
    async (request, reply) => {
      try {
        const { id: marketId } = request.params;
        const { outcome } = request.body;
        const outcomeEnum = outcome === 'yes' ? 1 : 2;

        const contract = getContract(true);
        const tx = await contract.resolveMarket(marketId, outcomeEnum);
        const receipt = await tx.wait();

        // Cross-chain audit: log resolution to Hedera HCS
        const auditTopicId = process.env.HEDERA_AUDIT_TOPIC || '0.0.8499635';
        try {
          const market = await contract.getMarket(marketId);
          await logAuditMessage(
            auditTopicId,
            JSON.stringify({
              event: 'market_resolved',
              marketId,
              outcome,
              question: market.question,
              totalPool: (market.yesPool + market.noPool).toString(),
              txHash: receipt.hash,
              chain: '0g-galileo',
              timestamp: new Date().toISOString(),
            }),
          );
        } catch (hcsErr) {
          request.log.error({ err: hcsErr }, 'HCS audit failed (non-blocking)');
        }

        return { success: true, txHash: receipt.hash, marketId, outcome };
      } catch (err) {
        request.log.error({ err }, 'Failed to resolve market');
        return reply.code(500).send({ error: 'Failed to resolve market' });
      }
    },
  );
}
