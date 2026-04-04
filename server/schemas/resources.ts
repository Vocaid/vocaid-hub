import { z } from 'zod';

export const ResourceQuerySchema = z.object({
  sort: z.enum(['quality', 'cost', 'latency', 'uptime']).default('quality'),
  type: z.enum(['gpu', 'agent', 'human', 'depin']).optional(),
});
