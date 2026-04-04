import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  getReputation,
  getAllReputationScores,
  giveFeedback,
  type ReputationTag,
} from '@/lib/reputation';

const ReputationQuerySchema = z.object({
  agentId: z.coerce.number().int().min(0),
  tag: z.string().optional(),
});

const VALID_TAGS = ['starred', 'uptime', 'successRate', 'responseTime'] as const;

const ReputationFeedbackSchema = z.object({
  agentId: z.coerce.number().int().min(0),
  value: z.number().int().min(0).max(100),
  tag1: z.enum(VALID_TAGS),
  tag2: z.string().optional(),
  endpoint: z.string().optional(),
  feedbackURI: z.string().optional(),
});

/**
 * Reputation routes — GET + POST.
 * All routes require World ID verification.
 */
export default async function reputationRoutes(app: FastifyInstance) {
  const f = app.withTypeProvider<ZodTypeProvider>();

  // ── GET /api/reputation?agentId=0&tag=starred ──────────────────────────
  f.get(
    '/reputation',
    {
      schema: { querystring: ReputationQuerySchema },
      preHandler: [app.requireWorldId],
    },
    async (request, reply) => {
      const { agentId, tag } = request.query;

      try {
        if (tag) {
          const score = await getReputation(BigInt(agentId), tag as ReputationTag);
          return score;
        }
        const scores = await getAllReputationScores(BigInt(agentId));
        return { agentId, scores };
      } catch (err: unknown) {
        request.log.error({ err }, 'Failed to fetch reputation');
        const message = err instanceof Error ? err.message : '';

        if (message.includes('env not set') || message.includes('Missing')) {
          return {
            agentId,
            scores: [],
            warning: 'ReputationRegistry not configured',
          };
        }

        return reply.code(500).send({ error: 'Failed to fetch reputation' });
      }
    },
  );

  // ── POST /api/reputation ───────────────────────────────────────────────
  f.post(
    '/reputation',
    {
      schema: { body: ReputationFeedbackSchema },
      preHandler: [app.requireWorldId],
    },
    async (request, reply) => {
      try {
        const { agentId, value, tag1, tag2, endpoint, feedbackURI } = request.body;

        const result = await giveFeedback({
          agentId: BigInt(agentId),
          value: Number(value),
          tag1: tag1 as ReputationTag,
          tag2,
          endpoint,
          feedbackURI,
        });

        return {
          success: true,
          txHash: result.txHash,
          feedbackHash: result.feedbackHash,
        };
      } catch (err) {
        request.log.error({ err }, 'Failed to submit reputation');
        return reply.code(500).send({ error: 'Failed to submit reputation' });
      }
    },
  );
}
