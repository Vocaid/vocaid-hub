import type { FastifyInstance } from 'fastify';
import { readFile } from 'fs/promises';
import { join } from 'path';

const AGENT_NAMES = ['seer', 'edge', 'shield', 'lens'] as const;

export default async function wellKnownRoutes(app: FastifyInstance) {
  // GET /.well-known/agent-card.json — A2A discovery endpoint
  app.get('/.well-known/agent-card.json', async (request, reply) => {
    try {
      const agents = await Promise.all(
        AGENT_NAMES.map(async (name) => {
          const filePath = join(process.cwd(), 'public', 'agent-cards', `${name}.json`);
          const raw = await readFile(filePath, 'utf-8');
          return JSON.parse(raw);
        }),
      );

      const card = {
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name: 'Vocaid Hub',
        description:
          'Reliable Resources for the Agentic Economy — 4 AI agents backed by World ID-verified human operators, registered on 0G Chain via ERC-8004.',
        version: '1.0.0',
        operator: {
          worldAppId: process.env.NEXT_PUBLIC_WORLD_APP_ID || 'app_74d7b06d88b9e220ad1cc06e387c55f3',
          identityRegistry: process.env.IDENTITY_REGISTRY || null,
          chain: '0g-galileo-testnet',
        },
        agents,
      };

      return reply
        .header('Cache-Control', 'public, max-age=300')
        .header('Content-Type', 'application/json')
        .send(card);
    } catch (err) {
      request.log.error(err, 'Failed to build agent card');
      return reply.code(500).send({ error: 'Failed to build agent card' });
    }
  });
}
