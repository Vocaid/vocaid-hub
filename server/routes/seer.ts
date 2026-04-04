import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
// Dynamic imports to avoid crashing on @0glabs/0g-serving-broker ESM issue
const loadOgCompute = () => import('@/lib/og-compute');
const loadOgBroker = () => import('@/lib/og-broker');
import { logAuditMessage } from '@/lib/hedera';
import { sendRateLimited } from '../plugins/rate-limit';

const AUDIT_TOPIC = process.env.HEDERA_AUDIT_TOPIC ?? '';

const SeerInferenceBodySchema = z.object({
  prompt: z.string().min(1),
});

/**
 * Seer inference route — 0G Compute inference + HCS audit.
 * Requires World ID verification.
 */
export default async function seerRoutes(app: FastifyInstance) {
  const f = app.withTypeProvider<ZodTypeProvider>();

  f.post(
    '/seer/inference',
    {
      schema: { body: SeerInferenceBodySchema },
      preHandler: [app.requireWorldId],
    },
    async (request, reply) => {
      // R3: Rate limit
      const rl = app.checkRateLimit(request.ip, '/api/seer/inference', 10, 60_000);
      if (rl) return sendRateLimited(reply, rl);

      const { prompt } = request.body;

      try {
        const { listProviders } = await loadOgCompute();
        const providers = await listProviders();

        if (providers.length > 0) {
          const { callInference } = await loadOgBroker();
          const result = await callInference(providers[0].provider, prompt);

          if (AUDIT_TOPIC) {
            logAuditMessage(
              AUDIT_TOPIC,
              JSON.stringify({
                type: 'seer_inference',
                provider: providers[0].provider,
                model: providers[0].model,
                verified: result.verified,
                timestamp: new Date().toISOString(),
              }),
            ).catch((e) => request.log.error({ err: e }, 'HCS audit failed'));
          }

          return {
            response: result.response,
            provider: providers[0].provider,
            model: providers[0].model,
            verified: result.verified,
          };
        }

        // No active providers — return honest error
        reply.code(404);
        return { error: 'No active inference providers on 0G Galileo testnet', providersQueried: 0 };
      } catch (err) {
        request.log.error({ err }, 'Inference failed');
        return reply.code(500).send({ error: 'Inference failed' });
      }
    },
  );
}
