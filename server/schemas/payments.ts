import { z } from 'zod';

export const InitiatePaymentSchema = z.object({
  resourceName: z.string().min(1),
  resourceType: z.enum(['gpu', 'agent', 'human', 'depin']),
  amount: z.string().optional(),
});

export const PaymentBodySchema = z.object({
  resourceName: z.string().optional(),
}).optional();
