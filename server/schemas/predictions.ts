import { z } from 'zod';

/** POST /api/predictions — create a new prediction market */
export const CreateMarketSchema = z.object({
  question: z.string().min(5).max(500),
  resolutionTime: z.number().int().positive(),
  initialSide: z.enum(['yes', 'no']).optional(),
  initialAmount: z.number().positive().optional(),
});

/** POST /api/predictions/:id/bet */
export const PlaceBetSchema = z.object({
  side: z.enum(['yes', 'no']),
  amount: z.number().min(0.001),
});

/** Route param for prediction market ID */
export const MarketIdParamsSchema = z.object({
  id: z.coerce.number().int().min(0),
});

/** POST /api/predictions/:id/resolve */
export const ResolveMarketSchema = z.object({
  outcome: z.enum(['yes', 'no']),
});
