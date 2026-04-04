import type { FastifyInstance } from 'fastify';
import { fetchAllResources } from './resources.js';

export default async function agentDecisionRoutes(app: FastifyInstance) {
  // GET /api/agent-decision — Rank resources by composite score
  app.get('/agent-decision', async (request) => {
    try {
      // Import resources logic directly instead of HTTP self-fetch
      const resources = await fetchAllResources('quality', undefined);

      if (!Array.isArray(resources) || resources.length === 0) {
        return { discovered: 0, providers: [], selected: null, reasoning: { weights: {}, formula: 'No resources available' } };
      }

      const providers = resources.map((r, i) => {
        const res = r as unknown as Record<string, unknown>;
        const signals = res.signals as Record<string, { value: number }> | undefined;
        const reputation = {
          starred: signals?.quality?.value ?? (res.reputation as number) ?? 0,
          uptime: signals?.uptime?.value ?? 0,
          successRate: 0,
          responseTime: signals?.latency?.value ?? 0,
        };

        const validationScore = res.verified ? 80 : 0;
        const compositeScore = Math.round(
          reputation.starred * 0.3 +
          reputation.uptime * 0.25 +
          reputation.successRate * 0.25 +
          (validationScore >= 50 ? 20 : 0),
        );

        return {
          address: `${res.type}-${i}`,
          agentId: String(i + 1),
          gpuModel: (res.subtitle as string) || (res.name as string) || 'Unknown',
          teeType: res.verified ? 'Verified' : 'Unverified',
          teeVerified: Boolean(res.verified),
          reputation,
          validationScore,
          compositeScore,
          resourceType: res.type as string,
          resourceName: res.name as string,
          price: res.price as string,
        };
      });

      const ranked = providers.sort(
        (a: { compositeScore: number }, b: { compositeScore: number }) =>
          b.compositeScore - a.compositeScore,
      );

      return {
        discovered: ranked.length,
        providers: ranked,
        selected: ranked[0] || null,
        reasoning: {
          weights: { starred: 0.3, uptime: 0.25, successRate: 0.25, teeBonus: 0.2 },
          formula: 'score = quality*0.3 + uptime*0.25 + successRate*0.25 + (verified ? 20 : 0)',
        },
      };
    } catch (err) {
      request.log.error({ err }, 'Decision engine failed');
      reply.code(500);
      return { error: 'Decision engine failed' };
    }
  });
}
