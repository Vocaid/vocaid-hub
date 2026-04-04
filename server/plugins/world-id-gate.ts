import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Address } from 'viem';

declare module 'fastify' {
  interface FastifyRequest {
    verifiedAddress?: Address;
  }
  interface FastifyInstance {
    requireWorldId: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * World ID gate plugin — preHandler hook that checks session + on-chain verification.
 * Depends on auth plugin (request.session must be populated).
 *
 * Usage in routes:
 *   app.post('/api/foo', { preHandler: [app.requireWorldId] }, handler)
 */
async function worldIdGatePlugin(app: FastifyInstance) {
  app.decorateRequest('verifiedAddress', undefined);

  app.decorate('requireWorldId', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.session?.user?.id;
    if (!userId) {
      reply.code(401).send({ error: 'Authentication required' });
      return;
    }

    try {
      const { isVerifiedOnChain } = await import('@/lib/world-id');
      const verified = await isVerifiedOnChain(userId as Address);
      if (!verified) {
        reply.code(403).send({ error: 'World ID verification required', verifyUrl: '/verify' });
        return;
      }
      request.verifiedAddress = userId as Address;
    } catch (err) {
      app.log.error({ err }, 'World ID check failed');
      reply.code(500).send({ error: 'Verification check failed' });
    }
  });
}

export default fp(worldIdGatePlugin, {
  name: 'world-id-gate',
  dependencies: ['auth'],
});
