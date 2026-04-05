import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateApiKey, type ApiKeyRecord } from '../../src/lib/api-key-ledger.js';

declare module 'fastify' {
  interface FastifyRequest {
    apiKeyRecord?: ApiKeyRecord;
  }
  interface FastifyInstance {
    requireApiKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function apiKeyAuthPlugin(app: FastifyInstance) {
  app.decorate('requireApiKey', async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers['x-api-key'] as string | undefined;
    if (!header) {
      reply.code(401).send({ error: 'Missing X-API-Key header' });
      return;
    }

    const record = validateApiKey(header);
    if (!record) {
      reply.code(403).send({ error: 'Invalid or revoked API key' });
      return;
    }

    request.apiKeyRecord = record;
  });
}

export default fp(apiKeyAuthPlugin, { name: 'api-key-auth' });
