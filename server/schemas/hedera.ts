import { z } from 'zod';

export const HederaAuditQuerySchema = z.object({
  topicId: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid Hedera topic ID format').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
