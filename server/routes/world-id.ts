import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { isAddress, type Address } from 'viem';
import { sendRateLimited } from '../plugins/rate-limit';
import {
  RpSignatureBodySchema,
  VerifyProofBodySchema,
  WorldIdCheckQuerySchema,
} from '../schemas/world-id';

/**
 * World ID routes — rp-signature, verify-proof, world-id/check
 */
export default async function worldIdRoutes(app: FastifyInstance) {
  const f = app.withTypeProvider<ZodTypeProvider>();

  // ── POST /api/rp-signature ─────────────────────────────────────────────
  f.post(
    '/rp-signature',
    { schema: { body: RpSignatureBodySchema } },
    async (request, reply) => {
      const rl = app.checkRateLimit(request.ip, '/api/rp-signature', 30, 60_000);
      if (rl) return sendRateLimited(reply, rl);

      const SIGNING_KEY = process.env.RP_SIGNING_KEY;
      if (!SIGNING_KEY) {
        return reply.code(500).send({ error: 'RP_SIGNING_KEY not configured' });
      }

      const RP_ID = process.env.RP_ID ?? process.env.WORLD_RP_ID ?? 'rp_21826eb5449cc811';
      const { action } = request.body;

      try {
        const { signRequest } = await import('@worldcoin/idkit');
        const sig = signRequest(action, SIGNING_KEY);

        return {
          rp_id: RP_ID,
          sig: sig.sig,
          nonce: sig.nonce,
          created_at: Number(sig.createdAt),
          expires_at: Number(sig.expiresAt),
        };
      } catch (err) {
        request.log.error({ err }, 'signRequest failed');
        return reply.code(500).send({ error: 'Signing failed' });
      }
    },
  );

  // ── POST /api/verify-proof ─────────────────────────────────────────────
  f.post(
    '/verify-proof',
    { schema: { body: VerifyProofBodySchema } },
    async (request, reply) => {
      const rl = app.checkRateLimit(request.ip, '/api/verify-proof', 10, 60_000);
      if (rl) return sendRateLimited(reply, rl);

      const { payload, action, signal } = request.body;
      const rp_id = process.env.RP_ID ?? process.env.WORLD_RP_ID;
      const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;

      // World ID 4.0: v4 endpoint with rp_id; legacy: v2 with app_id
      const verifyUrl = rp_id
        ? `https://developer.worldcoin.org/api/v4/verify/${rp_id}`
        : `https://developer.worldcoin.org/api/v2/verify/${app_id}`;

      const verifyBody = rp_id
        ? JSON.stringify(payload)
        : JSON.stringify({ ...payload, action, signal });

      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: verifyBody,
      });

      let verifyRes = (await response.json()) as { success: boolean; [k: string]: unknown };

      // v4→v2 fallback
      if (!verifyRes.success && rp_id) {
        request.log.warn({ verifyRes }, 'v4 failed, retrying with v2');
        const v2Url = `https://developer.worldcoin.org/api/v2/verify/${app_id}`;
        const v2Body = JSON.stringify({ ...payload, action, signal });
        const v2Response = await fetch(v2Url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: v2Body,
        });
        verifyRes = (await v2Response.json()) as { success: boolean; [k: string]: unknown };
      }

      if (!verifyRes.success) {
        return reply.code(400).send({ verifyRes, status: 400 });
      }

      // Validate signal is a valid Ethereum address
      if (signal && !isAddress(signal)) {
        return reply.code(400).send({ error: 'Invalid signal — must be a valid Ethereum address' });
      }

      // Register on-chain via CredentialGate (only with v2 legacy proof fields)
      let onChainResult = null;
      if (signal && process.env.CREDENTIAL_GATE && payload.merkle_root && payload.proof) {
        try {
          const { registerOnChain } = await import('@/lib/world-id');
          const proofArray = decodeProof(payload.proof);
          onChainResult = await registerOnChain(
            signal as Address,
            BigInt(payload.merkle_root),
            BigInt(payload.nullifier_hash!),
            proofArray,
          );
        } catch (err) {
          request.log.error({ err }, 'On-chain registration failed');
        }
      }

      // Mint VCRED credential NFT on Hedera
      let credentialResult = null;
      const credentialTokenId = process.env.HEDERA_CREDENTIAL_TOKEN;
      if (credentialTokenId && signal) {
        try {
          const { mintCredential, logAuditMessage } = await import('@/lib/hedera');
          const shortAddr = `${signal.slice(0, 8)}...${signal.slice(-4)}`;
          const metadata = new TextEncoder().encode(`wid:${shortAddr}:${Date.now()}`);
          const serials = await mintCredential(credentialTokenId, [metadata]);
          credentialResult = { tokenId: credentialTokenId, serials };

          const auditTopic = process.env.HEDERA_AUDIT_TOPIC;
          if (auditTopic) {
            logAuditMessage(
              auditTopic,
              JSON.stringify({
                type: 'credential_minted',
                tokenId: credentialTokenId,
                serials,
                address: signal,
                timestamp: new Date().toISOString(),
              }),
            ).catch((e) => request.log.error({ err: e }, 'HCS audit failed'));
          }
        } catch (err) {
          request.log.error({ err }, 'Hedera credential mint failed');
        }
      }

      return { verifyRes, onChainResult, credentialResult, status: 200 };
    },
  );

  // ── GET /api/world-id/check ────────────────────────────────────────────
  f.get(
    '/world-id/check',
    { schema: { querystring: WorldIdCheckQuerySchema } },
    async (request, reply) => {
      if (!request.session?.user?.id) {
        return reply.code(401).send({ verified: false, error: 'Authentication required' });
      }

      const { address } = request.query;

      try {
        const { isVerifiedOnChain } = await import('@/lib/world-id');
        const verified = await isVerifiedOnChain(address as Address);
        return { verified, address };
      } catch (err) {
        request.log.error({ err }, 'world-id/check failed');
        return reply.code(500).send({ verified: false, error: 'Verification check failed' });
      }
    },
  );
}

/** Decode ABI-encoded proof string into 8-element bigint tuple */
function decodeProof(
  proof: string,
): readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] {
  const packed = proof.startsWith('0x') ? proof.slice(2) : proof;
  if (packed.length !== 512 || !/^[0-9a-fA-F]+$/.test(packed)) {
    throw new Error('Invalid proof: expected 512 hex characters');
  }
  const result: bigint[] = [];
  for (let i = 0; i < 8; i++) {
    result.push(BigInt('0x' + packed.slice(i * 64, (i + 1) * 64)));
  }
  return result as unknown as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}
