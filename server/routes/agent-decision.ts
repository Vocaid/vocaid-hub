import { type FastifyPluginAsync } from 'fastify';
import { fetchAllResources } from './resources.js';

const agentDecisionRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/agent-decision — Rank resources by composite score
  app.get('/agent-decision', async (request) => {
    try {
      // Import resources logic directly instead of HTTP self-fetch
      const resources = await fetchAllResources('quality', undefined);

      if (!Array.isArray(resources) || resources.length === 0) {
        return getDemoDecision();
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
    } catch {
      return getDemoDecision();
    }
  });
};

export default agentDecisionRoutes;

function getDemoDecision() {
  return {
    discovered: 7,
    providers: [
      { address: 'agent-0', agentId: '27', gpuModel: 'Orion · Signal Analysis', teeType: 'AgentKit', teeVerified: true, reputation: { starred: 95, uptime: 99, successRate: 98, responseTime: 45 }, validationScore: 90, compositeScore: 91, resourceType: 'agent', resourceName: 'Orion', price: '0.001 USDC/query' },
      { address: 'gpu-0', agentId: '25', gpuModel: 'Nebula-H100 · EU Frankfurt', teeType: 'Intel TDX', teeVerified: true, reputation: { starred: 87, uptime: 99, successRate: 95, responseTime: 120 }, validationScore: 100, compositeScore: 89, resourceType: 'gpu', resourceName: 'Nebula-H100', price: '0.004 USDC/1K tok' },
      { address: 'human-0', agentId: '29', gpuModel: 'Camila Torres · Rust L4', teeType: 'World ID', teeVerified: true, reputation: { starred: 91, uptime: 0, successRate: 88, responseTime: 0 }, validationScore: 80, compositeScore: 75, resourceType: 'human', resourceName: 'Camila Torres', price: '0.005 USDC/min' },
      { address: 'depin-0', agentId: '31', gpuModel: 'Helios Solar Farm · 50kW', teeType: 'TEE', teeVerified: true, reputation: { starred: 85, uptime: 97, successRate: 90, responseTime: 0 }, validationScore: 75, compositeScore: 72, resourceType: 'depin', resourceName: 'Helios Solar Farm', price: '0.008 USDC/kWh' },
      { address: 'human-1', agentId: '30', gpuModel: 'Yuki Tanaka · Solidity L5', teeType: 'World ID', teeVerified: true, reputation: { starred: 88, uptime: 0, successRate: 85, responseTime: 0 }, validationScore: 80, compositeScore: 70, resourceType: 'human', resourceName: 'Yuki Tanaka', price: '0.008 USDC/min' },
      { address: 'depin-1', agentId: '32', gpuModel: 'GridPulse Energy · 200kW', teeType: 'TEE', teeVerified: true, reputation: { starred: 79, uptime: 95, successRate: 87, responseTime: 0 }, validationScore: 70, compositeScore: 66, resourceType: 'depin', resourceName: 'GridPulse Energy', price: '0.002 USDC/kWh' },
      { address: 'depin-2', agentId: '33', gpuModel: 'Tesla Model Y Fleet · LA', teeType: 'TEE', teeVerified: true, reputation: { starred: 88, uptime: 92, successRate: 94, responseTime: 0 }, validationScore: 85, compositeScore: 78, resourceType: 'depin', resourceName: 'Tesla Model Y Fleet', price: '0.005 USDC/mi' },
    ],
    selected: null,
    reasoning: {
      weights: { starred: 0.3, uptime: 0.25, successRate: 0.25, teeBonus: 0.2 },
      formula: 'score = quality*0.3 + uptime*0.25 + successRate*0.25 + (verified ? 20 : 0)',
    },
  };
}
