import type { FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { AgentListQuerySchema, AgentNameParamsSchema, AgentRegisterSchema, A2ATaskSchema, McpToolCallSchema } from '../schemas/agents.js';
import { listRegisteredAgents, getAgent, registerAgent } from '@/lib/agentkit';
import { isVerifiedOnChain } from '@/lib/world-id';
import { isAddress, type Address } from 'viem';
import {
  isValidAgent,
  getAgentCard,
  checkRateLimit,
  type AgentName,
  type A2ARequest,
  type A2AResponse,
  type MCPRequest,
  type MCPResponse,
} from '@/lib/agent-router';
import { handleA2A as seerA2A } from '@/lib/agents/seer';
import { handleA2A as edgeA2A } from '@/lib/agents/edge';
import { handleA2A as shieldA2A } from '@/lib/agents/shield';
import { handleA2A as lensA2A } from '@/lib/agents/lens';
import { handleMCP as seerMCP, mcpTools as seerTools } from '@/lib/agents/seer';
import { handleMCP as edgeMCP, mcpTools as edgeTools } from '@/lib/agents/edge';
import { handleMCP as shieldMCP, mcpTools as shieldTools } from '@/lib/agents/shield';
import { handleMCP as lensMCP, mcpTools as lensTools } from '@/lib/agents/lens';

const a2aHandlers: Record<AgentName, (req: A2ARequest) => Promise<A2AResponse>> = {
  seer: seerA2A,
  edge: edgeA2A,
  shield: shieldA2A,
  lens: lensA2A,
};

const mcpHandlers: Record<AgentName, (req: MCPRequest) => Promise<MCPResponse>> = {
  seer: seerMCP,
  edge: edgeMCP,
  shield: shieldMCP,
  lens: lensMCP,
};

const toolSchemas: Record<AgentName, typeof seerTools> = {
  seer: seerTools,
  edge: edgeTools,
  shield: shieldTools,
  lens: lensTools,
};

function getMethodList(name: AgentName): string[] {
  const methods: Record<AgentName, string[]> = {
    seer: ['querySignal', 'getProviders', 'runInference'],
    edge: ['requestTrade', 'getMarket'],
    shield: ['requestClearance', 'checkReputation', 'getProviders'],
    lens: ['submitFeedback', 'getObservation', 'getReputationScores'],
  };
  return methods[name];
}

export default async function agentRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/agents — List all registered agents
  typed.get('/agents', {
    schema: { querystring: AgentListQuerySchema },
  }, async (request, reply) => {
    try {
      const { agentId } = request.query;

      if (agentId !== undefined) {
        const agent = await getAgent(agentId);
        return {
          agent: {
            agentId: agent.agentId.toString(),
            owner: agent.owner,
            agentURI: agent.agentURI,
            wallet: agent.wallet,
            operatorWorldId: agent.operatorWorldId,
            role: agent.role,
            type: agent.type,
          },
        };
      }

      const agents = await listRegisteredAgents();
      return {
        agents: agents.map((a) => ({
          agentId: a.agentId.toString(),
          owner: a.owner,
          agentURI: a.agentURI,
          wallet: a.wallet,
          operatorWorldId: a.operatorWorldId,
          role: a.role,
          type: a.type,
        })),
        count: agents.length,
        registry: process.env.IDENTITY_REGISTRY,
        chain: '0g-galileo-testnet',
      };
    } catch (err) {
      request.log.error(err, 'Failed to list agents');
      return reply.code(500).send({ error: 'Failed to list agents' });
    }
  });

  // POST /api/agents/register — Register a new agent
  typed.post('/agents/register', {
    schema: { body: AgentRegisterSchema },
  }, async (request, reply) => {
    try {
      const { agentURI, operatorWorldId, operatorAddress, role, agentkitId } = request.body;

      if (!isAddress(operatorAddress)) {
        return reply.code(400).send({ error: 'Invalid operatorAddress — must be a valid Ethereum address' });
      }

      const isVerified = await isVerifiedOnChain(operatorAddress as Address);
      if (!isVerified) {
        return reply.code(403).send({
          error: 'Operator address is not World ID verified. Complete World ID verification first.',
        });
      }

      const result = await registerAgent({ agentURI, operatorWorldId, role, agentkitId });

      return {
        success: true,
        agentId: result.agentId.toString(),
        txHash: result.txHash,
        registry: process.env.IDENTITY_REGISTRY,
        chain: '0g-galileo-testnet',
      };
    } catch (err) {
      request.log.error(err, 'Agent registration failed');
      return reply.code(500).send({ error: 'Registration failed' });
    }
  });

  // GET /api/agents/:name/a2a — Agent capability card
  typed.get('/agents/:name/a2a', {
    schema: { params: AgentNameParamsSchema },
  }, async (request) => {
    const { name } = request.params;
    const card = await getAgentCard(name);
    return { ...card, protocol: 'a2a', methods: getMethodList(name) };
  });

  // POST /api/agents/:name/a2a — Execute A2A task
  typed.post('/agents/:name/a2a', {
    schema: { params: AgentNameParamsSchema, body: A2ATaskSchema },
  }, async (request, reply) => {
    const { name } = request.params;
    const ip = request.headers['x-forwarded-for'] as string ?? request.headers['x-real-ip'] as string ?? 'unknown';
    if (!checkRateLimit(name, ip)) {
      return reply.code(429).send({ error: 'Rate limit exceeded' });
    }

    const handler = a2aHandlers[name];
    const result = await handler(request.body as A2ARequest);

    if (result.error) {
      const status = result.error.includes('Signature rejected') ? 401
        : result.error.includes('Unknown method') ? 400
        : result.error.includes('requires signed') ? 401
        : 500;
      return reply.code(status).send(result);
    }

    return result;
  });

  // GET /api/agents/:name/mcp — MCP tool schema
  typed.get('/agents/:name/mcp', {
    schema: { params: AgentNameParamsSchema },
  }, async (request) => {
    const { name } = request.params;
    const card = await getAgentCard(name);
    return { ...card, protocol: 'mcp', tools: toolSchemas[name] };
  });

  // POST /api/agents/:name/mcp — Execute MCP tool
  typed.post('/agents/:name/mcp', {
    schema: { params: AgentNameParamsSchema, body: McpToolCallSchema },
  }, async (request, reply) => {
    const { name } = request.params;
    const ip = request.headers['x-forwarded-for'] as string ?? request.headers['x-real-ip'] as string ?? 'unknown';
    if (!checkRateLimit(name, ip)) {
      return reply.code(429).send({ error: 'Rate limit exceeded' });
    }

    // Support both 'input' (our schema) and 'arguments' (standard MCP) field names
    const body = request.body as MCPRequest & { arguments?: Record<string, unknown> };
    if (body.arguments && !body.input) {
      body.input = body.arguments;
    }

    const handler = mcpHandlers[name];
    const result = await handler(body);

    if (result.error) {
      const status = result.error.includes('Signature rejected') ? 401
        : result.error.includes('Unknown tool') ? 400
        : result.error.includes('requires signed') ? 401
        : 500;
      return reply.code(status).send(result);
    }

    return result;
  });
}
