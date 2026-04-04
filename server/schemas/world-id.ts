import { z } from 'zod';
import { AddressSchema } from './common';

/** POST /api/rp-signature */
export const RpSignatureBodySchema = z.object({
  action: z.string().min(1),
});

/** POST /api/verify-proof */
export const VerifyProofBodySchema = z.object({
  payload: z.object({
    merkle_root: z.string().optional(),
    nullifier_hash: z.string().optional(),
    proof: z.string().optional(),
    verification_level: z.string().optional(),
    credential_type: z.string().optional(),
  }),
  action: z.string(),
  signal: z.string().optional(),
});

/** GET /api/world-id/check */
export const WorldIdCheckQuerySchema = z.object({
  address: AddressSchema,
});
