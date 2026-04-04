import { NextRequest, NextResponse } from 'next/server';
import { registerOnChain } from '@/lib/world-id';
import { mintCredential, logAuditMessage } from '@/lib/hedera';
import type { Address } from 'viem';

interface IRequestPayload {
  payload: {
    // v4 fields
    protocol_version?: string;
    nonce?: string;
    action?: string;
    responses?: unknown[];
    // v2 legacy fields (when allow_legacy_proofs: true)
    merkle_root?: string;
    nullifier_hash?: string;
    proof?: string;
    [key: string]: unknown;
  };
  action: string;
  signal: string | undefined;
}

interface IVerifyResponse {
  success: boolean;
  [key: string]: unknown;
}

/**
 * POST /api/verify-proof
 *
 * Validates World ID ZK proof server-side via Developer Portal API.
 * World ID 4.0 uses v4 endpoint with rp_id; falls back to v2 with app_id.
 * On success: registers on CredentialGate (World Chain) + mints VCRED (Hedera).
 *
 * @see https://docs.world.org/mini-apps/commands/verify#verifying-the-proof
 * @see node_modules/@worldcoin/idkit-core/README.md (lines 91-98)
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { payload, action, signal } = body as IRequestPayload;
  const rp_id = process.env.RP_ID ?? process.env.WORLD_RP_ID;
  const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;

  // World ID 4.0: v4 endpoint with rp_id; legacy: v2 with app_id
  const verifyUrl = rp_id
    ? `https://developer.worldcoin.org/api/v4/verify/${rp_id}`
    : `https://developer.worldcoin.org/api/v2/verify/${app_id}`;

  // v4: forward completion.result directly; v2: spread with action + signal
  const verifyBody = rp_id
    ? JSON.stringify(payload)
    : JSON.stringify({ ...payload, action, signal });

  const response = await fetch(verifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: verifyBody,
  });

  let verifyRes = (await response.json()) as IVerifyResponse;

  // v4→v2 fallback: if v4 fails (invalid_action, etc.), retry with v2
  if (!verifyRes.success && rp_id) {
    console.warn('[verify-proof] v4 failed, retrying with v2:', verifyRes);
    const v2Url = `https://developer.worldcoin.org/api/v2/verify/${app_id}`;
    const v2Body = JSON.stringify({ ...payload, action, signal });
    const v2Response = await fetch(v2Url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: v2Body,
    });
    verifyRes = (await v2Response.json()) as IVerifyResponse;
  }

  if (verifyRes.success) {
    // Register on-chain via CredentialGate (only with v2 legacy proof fields)
    let onChainResult = null;
    if (signal && process.env.CREDENTIAL_GATE && payload.merkle_root && payload.proof) {
      try {
        const proofArray = decodeProof(payload.proof);
        onChainResult = await registerOnChain(
          signal as Address,
          BigInt(payload.merkle_root),
          BigInt(payload.nullifier_hash!),
          proofArray,
        );
      } catch (err) {
        console.error('On-chain registration failed:', err);
      }
    }

    // Mint VCRED credential NFT on Hedera after successful verification
    let credentialResult = null;
    const credentialTokenId = process.env.HEDERA_CREDENTIAL_TOKEN;
    if (credentialTokenId && signal) {
      try {
        const shortAddr = `${signal.slice(0, 8)}...${signal.slice(-4)}`;
        const metadata = new TextEncoder().encode(
          `wid:${shortAddr}:${Date.now()}`,
        );
        const serials = await mintCredential(credentialTokenId, [metadata]);
        credentialResult = { tokenId: credentialTokenId, serials };

        const auditTopic = process.env.HEDERA_AUDIT_TOPIC;
        if (auditTopic) {
          logAuditMessage(auditTopic, JSON.stringify({
            type: 'credential_minted',
            tokenId: credentialTokenId,
            serials,
            address: signal,
            timestamp: new Date().toISOString(),
          })).catch(console.error);
        }
      } catch (err) {
        console.error('Hedera credential mint failed:', err);
      }
    }

    return NextResponse.json({ verifyRes, onChainResult, credentialResult, status: 200 });
  } else {
    return NextResponse.json({ verifyRes, status: 400 });
  }
}

/** Decode ABI-encoded proof string into 8-element bigint tuple */
function decodeProof(proof: string): readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] {
  const packed = proof.startsWith('0x') ? proof.slice(2) : proof;
  const result: bigint[] = [];
  for (let i = 0; i < 8; i++) {
    result.push(BigInt('0x' + packed.slice(i * 64, (i + 1) * 64)));
  }
  return result as unknown as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}
