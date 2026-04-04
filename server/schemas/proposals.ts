import { z } from 'zod';

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
  }).superRefine((data, ctx) => {
    if (data.proposalType === 'bet') {
      if (data.marketId === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'marketId is required for bet proposals', path: ['marketId'] });
      if (data.side === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'side is required for bet proposals', path: ['side'] });
      if (data.amount === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'amount is required for bet proposals', path: ['amount'] });
    } else {
      if (data.question === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'question is required for create_market proposals', path: ['question'] });
      if (data.resolutionTime === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'resolutionTime is required for create_market proposals', path: ['resolutionTime'] });
    }
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
