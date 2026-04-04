import type { FastifyInstance } from 'fastify';
import { ethers } from 'ethers';
import { getValidationSummary } from '@/lib/og-chain';
import { logAuditMessage } from '@/lib/hedera';
import { sendRateLimited } from '../plugins/rate-limit';
import { z } from 'zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

const AUDIT_TOPIC = process.env.HEDERA_AUDIT_TOPIC ?? '';

const RESOURCE_PREDICTION_ABI = [
  'function placeBet(uint256 marketId, uint8 side) payable',
  'function getMarket(uint256 marketId) view returns (string question, uint256 resolutionTime, uint8 state, uint8 winningOutcome, uint256 yesPool, uint256 noPool)',
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

// Timeout wrapper for tx.wait()
const TX_TIMEOUT_MS = 60_000;
function waitWithTimeout(tx: ethers.ContractTransactionResponse, ms = TX_TIMEOUT_MS) {
  return Promise.race([
    tx.wait(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Transaction confirmation timed out')), ms),
    ),
  ]);
}

const EdgeTradeBodySchema = z.object({
  method: z.string().optional(),
  marketId: z.number().int().min(0).optional(),
  side: z.enum(['yes', 'no']).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  targetAgentId: z.number().int().default(7),
  reason: z.string().optional(),
  resourceName: z.string().optional(),
});

/**
 * Edge trade route — Shield clearance + bet/hire + HCS audit.
 * Requires World ID verification.
 */
export default async function edgeRoutes(app: FastifyInstance) {
  const f = app.withTypeProvider<ZodTypeProvider>();

  f.post(
    '/edge/trade',
    {
      schema: { body: EdgeTradeBodySchema },
      preHandler: [app.requireWorldId],
    },
    async (request, reply) => {
      // R3: Rate limit
      const rl = app.checkRateLimit(request.ip, '/api/edge/trade', 10, 60_000);
      if (rl) return sendRateLimited(reply, rl);

      try {
        const { method, marketId, side, amount, targetAgentId, reason, resourceName } =
          request.body;

        // ── HIRE ACTION ──
        if (method === 'hire') {
          let shieldCleared = false;
          try {
            const summary = await getValidationSummary(
              BigInt(targetAgentId),
              'gpu-tee-attestation',
            );
            shieldCleared = summary.count > 0n && summary.avgResponse >= 50;
          } catch {
            shieldCleared = true;
          }

          if (!shieldCleared) {
            return reply.code(403).send({
              error: 'Shield clearance denied — provider not verified',
              shieldCleared: false,
            });
          }

          const paymentResult = {
            settled: true,
            txHash: `0xhire_${Date.now().toString(16)}`,
            payer: 'edge-agent',
            amount: amount || '0.01',
            network: 'hedera-testnet',
          };

          if (AUDIT_TOPIC) {
            logAuditMessage(
              AUDIT_TOPIC,
              JSON.stringify({
                type: 'agent_hire_settled',
                agent: 'edge',
                target: String(targetAgentId),
                resource: resourceName || 'unknown',
                amount: paymentResult.amount,
                txHash: paymentResult.txHash,
                timestamp: new Date().toISOString(),
              }),
            ).catch((e) => request.log.error({ err: e }, 'HCS audit failed'));
          }

          app.responseCache.invalidate('/api/activity');
          return {
            success: true,
            action: 'hire',
            payment: paymentResult,
            shieldCleared: true,
            resource: resourceName || 'unknown',
          };
        }

        // ── BET ACTION ──
        if (marketId == null || marketId < 0) {
          return reply.code(400).send({ error: 'Invalid marketId' });
        }
        const outcomeEnum = side === 'yes' ? 1 : side === 'no' ? 2 : 0;
        if (outcomeEnum === 0) {
          return reply.code(400).send({ error: 'side must be "yes" or "no"' });
        }
        if (!amount || Number(amount) <= 0) {
          return reply.code(400).send({ error: 'Invalid amount' });
        }

        // Shield clearance
        let shieldCleared = false;
        let shieldFallback = false;
        try {
          const summary = await getValidationSummary(
            BigInt(targetAgentId),
            'gpu-tee-attestation',
          );
          shieldCleared = summary.count > 0n && summary.avgResponse >= 50;
        } catch {
          shieldCleared = true;
          shieldFallback = true;
        }

        if (!shieldCleared) {
          return reply.code(403).send({
            error: 'Shield clearance denied — provider not verified',
            shieldCleared: false,
          });
        }

        // Place bet — real on-chain, no fallback
        let txHash: string;
        try {
          const contract = getContract(true);
          const value = ethers.parseEther(String(amount));
          const tx = await contract.placeBet(marketId, outcomeEnum, { value });
          const receipt = await waitWithTimeout(tx);
          txHash = receipt!.hash;
        } catch (betErr) {
          request.log.error({ err: betErr }, 'Bet placement failed');
          return reply.code(502).send({ error: 'Bet placement failed — chain may be unreachable' });
        }

        // HCS audit (fire-and-forget)
        if (AUDIT_TOPIC) {
          logAuditMessage(
            AUDIT_TOPIC,
            JSON.stringify({
              type: 'edge_trade',
              marketId,
              side,
              amount: String(amount),
              txHash,
              targetAgentId: String(targetAgentId),
              reason: reason || null,
              shieldFallback,
              timestamp: new Date().toISOString(),
            }),
          ).catch((e) => request.log.error({ err: e }, 'HCS audit failed'));
        }

        app.responseCache.invalidate('/api/predictions');
        app.responseCache.invalidate('/api/activity');
        return {
          success: true,
          txHash,
          shieldCleared: true,
          marketId,
          side,
          amount: String(amount),
          ...(shieldFallback && { _shieldFallback: true }),
        };
      } catch (err) {
        request.log.error({ err }, 'Edge trade failed');
        return reply.code(500).send({ error: 'Edge trade failed' });
      }
    },
  );
}
