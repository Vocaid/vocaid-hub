import { z } from 'zod';

export const ResourceQuerySchema = z.object({
  sort: z.enum(['quality', 'cost', 'latency', 'uptime']).default('quality'),
  type: z.enum(['gpu', 'agent', 'human', 'depin']).optional(),
});

export const HederaAuditQuerySchema = z.object({
  topicId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ProposalQuerySchema = z.object({
  agentId: z.coerce.number().int().optional(),
});

export const ProposalActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('submit'),
    agentId: z.number().int(),
    proposalType: z.enum(['bet', 'create_market']),
    marketId: z.number().int().optional(),
    side: z.enum(['yes', 'no']).optional(),
    amount: z.number().positive().optional(),
    question: z.string().optional(),
    resolutionTime: z.number().int().positive().optional(),
  }),
  z.object({
    action: z.literal('approve'),
    proposalId: z.number().int(),
    value: z.number().optional(),
  }),
  z.object({
    action: z.literal('reject'),
    proposalId: z.number().int(),
  }),
]);
