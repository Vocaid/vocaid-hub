import { z } from 'zod';

/** Ethereum address (0x-prefixed, 42 chars) */
export const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

/** Pagination query params */
export const PaginationSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Standard error response */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  fields: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
});

/** Standard success response */
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  txHash: z.string().optional(),
});

/** Agent ID (uint256 as string or number) */
export const AgentIdSchema = z.coerce.number().int().min(0);

/** Market side for prediction bets */
export const MarketSideSchema = z.enum(['yes', 'no']);

/** A0GI amount (positive number, min 0.001) */
export const AmountSchema = z.coerce.number().positive().min(0.001);
