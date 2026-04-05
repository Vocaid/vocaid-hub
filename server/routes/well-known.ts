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
        contracts: {
          chain: '0g-galileo-testnet',
          chainId: 16602,
          identityRegistry: '0xc16cf40a33e85f41bed6c90c710ff8c70b8c79ec',
          reputationRegistry: '0xa7ba63bce59d366a1c1b647e4ca75a5c11ca47f4',
          validationRegistry: '0x629c61e5a8c78725c8e2cfc6d5b441a4bba0517c',
          gpuProviderRegistry: '0x94f7d419dd3ff171cb5cd9291a510528ee1ada59',
          resourcePrediction: '0x82d5f12e55390016c49faab2ccb3c8d55d63fe7a',
          humanSkillRegistry: '0xcAc906DB5F68c45a059131A45BeA476897b6D2bb',
          depinRegistry: '0x1C7FB282c65071d0d5d55704E3CC3FE3C634fB35',
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
