import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { listProviders } from '@/lib/og-compute';
import { callInference } from '@/lib/og-broker';
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
        const providers = await listProviders();

        if (providers.length > 0) {
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

        // Fallback: no active providers on testnet
        if (AUDIT_TOPIC) {
          logAuditMessage(
            AUDIT_TOPIC,
            JSON.stringify({
              type: 'seer_inference_fallback',
              reason: 'no_providers_on_testnet',
              providersQueried: 0,
              timestamp: new Date().toISOString(),
            }),
          ).catch((e) => request.log.error({ err: e }, 'HCS audit failed'));
        }

        return {
          response: `[Seer Analysis] Based on current market conditions, H100 inference pricing shows moderate demand. Provider discovery returned 0 active providers on 0G Galileo testnet — production deployment would connect to mainnet operators.`,
          provider: 'mock-seer-fallback',
          model: 'seer-analysis-v1',
          verified: false,
          _demo: true,
          _reason:
            '0G Galileo testnet has no registered inference providers. SDK integration is production-ready.',
        };
      } catch (err) {
        request.log.error({ err }, 'Inference failed');
        return reply.code(500).send({ error: 'Inference failed' });
      }
    },
  );
}
