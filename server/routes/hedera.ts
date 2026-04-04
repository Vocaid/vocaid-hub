import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { HederaAuditQuerySchema } from '../schemas/resources.js';
import { queryAuditTrail } from '@/lib/hedera';

const DEFAULT_TOPIC = process.env.HEDERA_AUDIT_TOPIC ?? '';

const hederaRoutes: FastifyPluginAsync = async (app) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/hedera/audit — Query HCS audit trail via Mirror Node
  typed.get('/hedera/audit', {
    schema: { querystring: HederaAuditQuerySchema },
  }, async (request, reply) => {
    const { topicId: topicParam, limit } = request.query;
    const topicId = topicParam ?? DEFAULT_TOPIC;

    if (!topicId) {
      return reply.status(400).send({ error: 'Missing topicId param and no HEDERA_AUDIT_TOPIC configured' });
    }

    try {
      const messages = await queryAuditTrail(topicId, limit);
      return { topicId, count: messages.length, messages };
    } catch (err) {
      request.log.error(err, 'Audit trail query failed');
      return reply.status(500).send({ error: 'Failed to query audit trail from Mirror Node' });
    }
  });
};

export default hederaRoutes;
