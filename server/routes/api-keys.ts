import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  generateApiKey,
  getKeyByWallet,
  revokeApiKey,
  type ChainId,
} from '../../src/lib/api-key-ledger.js';

const ChainEnum = z.enum(['0g', 'hedera', 'world']);

const GenerateBodySchema = z.object({
  walletAddress: z.string().min(1),
  chain: ChainEnum,
});

const RevokeBodySchema = z.object({
  walletAddress: z.string().min(1),
});

const StatusQuerySchema = z.object({
  wallet: z.string().min(1),
});

/**
 * API-key management routes — generate, status, revoke.
 */
export default async function apiKeyRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── POST /api/keys/generate ───────────────────────────────────────────
  typed.post(
    '/keys/generate',
    {
      schema: { body: GenerateBodySchema },
    },
    async (request, reply) => {
      try {
        const { walletAddress, chain } = request.body;
        const { key, record } = generateApiKey(walletAddress, chain as ChainId);

        return {
          key,
          maskedKey: record.maskedKey,
          chain: record.chain,
        };
      } catch (err) {
        request.log.error({ err }, 'Failed to generate API key');
        return reply.code(500).send({ error: 'Failed to generate API key' });
      }
    },
  );

  // ── GET /api/keys/status?wallet=0x... ─────────────────────────────────
  typed.get(
    '/keys/status',
    {
      schema: { querystring: StatusQuerySchema },
    },
    async (request, reply) => {
      try {
        const { wallet } = request.query;
        const record = getKeyByWallet(wallet);

        if (!record) {
          return reply.code(404).send({ error: 'No active key found for wallet' });
        }

        return record;
      } catch (err) {
        request.log.error({ err }, 'Failed to fetch key status');
        return reply.code(500).send({ error: 'Failed to fetch key status' });
      }
    },
  );

  // ── POST /api/keys/revoke ─────────────────────────────────────────────
  typed.post(
    '/keys/revoke',
    {
      schema: { body: RevokeBodySchema },
    },
    async (request, reply) => {
      try {
        const { walletAddress } = request.body;
        const revoked = revokeApiKey(walletAddress);

        if (!revoked) {
          return reply.code(404).send({ error: 'No active key found for wallet' });
        }

        return { success: true };
      } catch (err) {
        request.log.error({ err }, 'Failed to revoke API key');
        return reply.code(500).send({ error: 'Failed to revoke API key' });
      }
    },
  );
}
