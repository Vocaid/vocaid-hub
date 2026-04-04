import { z } from 'zod';

export const AgentListQuerySchema = z.object({
  agentId: z.coerce.bigint().optional(),
});

export const AgentNameParamsSchema = z.object({
  name: z.enum(['seer', 'edge', 'shield', 'lens']),
});

export const AgentRegisterSchema = z.object({
  agentURI: z.string().min(1),
  operatorWorldId: z.string().min(1),
  operatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  role: z.string().min(1),
  agentkitId: z.string().optional(),
});

export const A2ATaskSchema = z.object({
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const McpToolCallSchema = z.object({
  tool: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).optional(),
});
