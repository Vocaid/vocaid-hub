import { z } from 'zod';
import { AddressSchema } from './common';

/** POST /api/gpu/register */
export const GpuRegisterSchema = z.object({
  providerAddress: AddressSchema,
  gpuModel: z.string().min(1),
  endpoint: z.string().url().optional(),
});

/** GET /api/gpu/list */
export const GpuListQuerySchema = z.object({
  address: AddressSchema.optional(),
});
