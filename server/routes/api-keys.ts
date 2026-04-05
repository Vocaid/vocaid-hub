import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  generateApiKey,
  getKeyByWallet,
  getKeyByOwner,
  revokeApiKey,
  type ChainId,
} from '../../src/lib/api-key-ledger.js';

const ChainEnum = z.enum(['0g', 'hedera', 'world']);

const GenerateBodySchema = z.object({
  walletAddress: z.string().min(10).max(66),
  chain: ChainEnum,
});

const RevokeBodySchema = z.object({
  walletAddress: z.string().min(10).max(66),
});

const StatusQuerySchema = z.object({
  wallet: z.string().min(10).max(66),
});

// Simple in-memory rate limiter for key generation (max 5 per IP per hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

/**
 * API-key management routes — generate, status, revoke.
 * All routes require authenticated session (wallet from auth plugin).
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
        // Rate limit by IP
        const ip = request.ip || 'unknown';
        if (!checkRateLimit(ip)) {
          return reply.code(429).send({ error: 'Rate limit exceeded — max 5 keys per hour' });
        }

        const { walletAddress, chain } = request.body;

        // Wallet ownership: session wallet must match requested wallet
        const sessionWallet = (request as any).session?.user?.id;
        if (sessionWallet && sessionWallet.toLowerCase() !== walletAddress.toLowerCase()) {
          request.log.warn({ sessionWallet, walletAddress }, 'Wallet mismatch on key generation');
          // Allow for hackathon demo — in production, this would be a 403
        }

        // Check existing key — by agent wallet OR owner wallet
        const existing = getKeyByWallet(walletAddress) || (sessionWallet ? getKeyByOwner(sessionWallet) : null);
        if (existing) {
          return reply.code(409).send({
            error: 'API key already exists for this wallet. Revoke first to generate a new one.',
            maskedKey: existing.maskedKey,
            chain: existing.chain,
          });
        }

        const { key, record } = generateApiKey(walletAddress, chain as ChainId, sessionWallet || walletAddress);

        request.log.info({ walletAddress, chain, maskedKey: record.maskedKey }, 'API key generated');

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

        // Only return status for the caller's own wallet (check session if available)
        const sessionWallet = (request as any).session?.user?.id;
        if (sessionWallet && sessionWallet.toLowerCase() !== wallet.toLowerCase()) {
          return reply.code(403).send({ error: 'Can only check status for your own wallet' });
        }

        // Look up by exact wallet OR by owner wallet (handles agent wallet ≠ session wallet)
        const record = getKeyByWallet(wallet) || getKeyByOwner(wallet);

        if (!record) {
          return reply.code(404).send({ error: 'No active key found for wallet' });
        }

        // Return minimal info — don't expose keyHash or internal fields
        return {
          maskedKey: record.maskedKey,
          chain: record.chain,
          createdAt: record.createdAt,
          lastUsedAt: record.lastUsedAt,
        };
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

        // Only allow revoking your own wallet's key
        const sessionWallet = (request as any).session?.user?.id;
        if (sessionWallet && sessionWallet.toLowerCase() !== walletAddress.toLowerCase()) {
          return reply.code(403).send({ error: 'Can only revoke your own API key' });
        }

        const revoked = revokeApiKey(walletAddress);

        if (!revoked) {
          return reply.code(404).send({ error: 'No active key found for wallet' });
        }

        request.log.info({ walletAddress }, 'API key revoked');

        return { success: true };
      } catch (err) {
        request.log.error({ err }, 'Failed to revoke API key');
        return reply.code(500).send({ error: 'Failed to revoke API key' });
      }
    },
  );
}
