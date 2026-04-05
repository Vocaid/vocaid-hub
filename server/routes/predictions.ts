import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ethers } from 'ethers';
import { logAuditMessage } from '@/lib/hedera';
import { cachedFetch, cacheInvalidate } from '@/lib/cache';
import { sendRateLimited } from '../plugins/rate-limit';
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

import { getOgProvider, getOgSigner } from '../clients.js';

function getContract(withSigner = false) {
  const address = process.env.RESOURCE_PREDICTION;
  if (!address) throw new Error('Missing RESOURCE_PREDICTION env');

  if (withSigner) {
    return new ethers.Contract(address, RESOURCE_PREDICTION_ABI, getOgSigner());
  }
  return new ethers.Contract(address, RESOURCE_PREDICTION_ABI, getOgProvider());
}

// R2: Timeout wrapper for tx.wait() — prevents indefinite hangs
const TX_TIMEOUT_MS = 60_000;
function waitWithTimeout(tx: ethers.ContractTransactionResponse, ms = TX_TIMEOUT_MS) {
  return Promise.race([
    tx.wait(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Transaction confirmation timed out')), ms),
    ),
  ]);
}

/**
 * Prediction market routes — GET/POST + :id/bet, :id/claim, :id/resolve
 */
export default async function predictionRoutes(app: FastifyInstance) {
  const f = app.withTypeProvider<ZodTypeProvider>();

  // ── GET /api/predictions ───────────────────────────────────────────────
  f.get('/predictions',  async () => {
    const { data, _demo } = await cachedFetch(
      'predictions:markets',
      'og-predictions',
      15_000, // 15s TTL — matches ISR pace
      async () => {
        const contract = getContract();
        const nextId = await contract.nextMarketId();
        const count = Number(nextId);
        if (count === 0) return [];

        return Promise.all(
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
      },
      [], // fallback: empty array (better than fake data)
    );

    return { markets: data, _stale: _demo };
  });

  // ── POST /api/predictions ──────────────────────────────────────────────
  f.post(
    '/predictions', 
    { schema: { body: CreateMarketSchema } },
    async (request, reply) => {
      // R3: Rate limit
      const rl = app.checkRateLimit(request.ip, '/api/predictions', 5, 60_000);
      if (rl) return sendRateLimited(reply, rl);

      try {
        const { question, resolutionTime, initialSide, initialAmount } = request.body;

        if (resolutionTime <= Math.floor(Date.now() / 1000)) {
          return reply.code(400).send({ error: 'resolutionTime must be in the future' });
        }

        const contract = getContract(true);
        const createTx = await contract.createMarket(question, resolutionTime);
        const createReceipt = await waitWithTimeout(createTx);

        const nextId = await contract.nextMarketId();
        const marketId = Number(nextId) - 1;

        let betTxHash: string | null = null;
        if (initialSide && initialAmount && initialAmount > 0) {
          const outcomeEnum = initialSide === 'yes' ? 1 : 2;
          const betTx = await contract.placeBet(marketId, outcomeEnum, {
            value: ethers.parseEther(String(initialAmount)),
          });
          const betReceipt = await waitWithTimeout(betTx);
          betTxHash = betReceipt!.hash;
        }

        app.responseCache.invalidate('/api/predictions');
        cacheInvalidate('predictions:markets');
        app.responseCache.invalidate('/api/agent-decision');
        return { success: true, marketId, txHash: createReceipt!.hash, betTxHash };
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
      const rl = app.checkRateLimit(request.ip, '/api/predictions/bet', 10, 60_000);
      if (rl) return sendRateLimited(reply, rl);

      try {
        const { id: marketId } = request.params;
        const { side, amount } = request.body;

        const outcomeEnum = side === 'yes' ? 1 : 2;
        const contract = getContract(true);
        const value = ethers.parseEther(String(amount));

        const tx = await contract.placeBet(marketId, outcomeEnum, { value });
        const receipt = await waitWithTimeout(tx);

        app.responseCache.invalidate('/api/predictions');
        cacheInvalidate('predictions:markets');
        return {
          success: true,
          txHash: receipt!.hash,
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
      const rl = app.checkRateLimit(request.ip, '/api/predictions/claim', 10, 60_000);
      if (rl) return sendRateLimited(reply, rl);

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

        const receipt = await waitWithTimeout(tx);
        app.responseCache.invalidate('/api/predictions');
        cacheInvalidate('predictions:markets');
        return { success: true, txHash: receipt!.hash, marketId, action };
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
      const rl = app.checkRateLimit(request.ip, '/api/predictions/resolve', 5, 60_000);
      if (rl) return sendRateLimited(reply, rl);

      try {
        const { id: marketId } = request.params;
        const { outcome } = request.body;
        const outcomeEnum = outcome === 'yes' ? 1 : 2;

        const contract = getContract(true);
        const tx = await contract.resolveMarket(marketId, outcomeEnum);
        const receipt = await waitWithTimeout(tx);

        // C3: Cross-chain audit — skip if topic not configured
        const auditTopicId = process.env.HEDERA_AUDIT_TOPIC;
        if (auditTopicId) {
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
                txHash: receipt!.hash,
                chain: '0g-galileo',
                timestamp: new Date().toISOString(),
              }),
            );
          } catch (hcsErr) {
            request.log.error({ err: hcsErr }, 'HCS audit failed (non-blocking)');
          }
        }

        app.responseCache.invalidate('/api/predictions');
        cacheInvalidate('predictions:markets');
        app.responseCache.invalidate('/api/agent-decision');
        return { success: true, txHash: receipt!.hash, marketId, outcome };
      } catch (err) {
        request.log.error({ err }, 'Failed to resolve market');
        return reply.code(500).send({ error: 'Failed to resolve market' });
      }
    },
  );
}
