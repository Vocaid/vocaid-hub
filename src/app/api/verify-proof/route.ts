import { NextRequest, NextResponse } from 'next/server';
import { registerOnChain } from '@/lib/world-id';
import { mintCredential, logAuditMessage } from '@/lib/hedera';
import type { Address } from 'viem';

interface IRequestPayload {
  payload: {
    merkle_root: string;
    nullifier_hash: string;
    proof: string;
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
 * This route is used to verify the proof of the user
 * It is critical proofs are verified from the server side
 * Read More: https://docs.world.org/mini-apps/commands/verify#verifying-the-proof
 */
export async function POST(req: NextRequest) {
  const { payload, action, signal } = (await req.json()) as IRequestPayload;
  const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;

  const response = await fetch(
    `https://developer.worldcoin.org/api/v2/verify/${app_id}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, action, signal }),
    },
  );

  const verifyRes = (await response.json()) as IVerifyResponse;

  if (verifyRes.success) {
    // Register on-chain via CredentialGate if signal is a valid address
    let onChainResult = null;
    if (signal && process.env.CREDENTIAL_GATE) {
      try {
        const proofArray = decodeProof(payload.proof);
        onChainResult = await registerOnChain(
          signal as Address,
          BigInt(payload.merkle_root),
          BigInt(payload.nullifier_hash),
          proofArray,
        );
      } catch (err) {
        console.error('On-chain registration failed:', err);
        // API verification succeeded — return success even if on-chain fails
      }
    }

    // Mint VCRED credential NFT on Hedera after successful verification
    let credentialResult = null;
    const credentialTokenId = process.env.HEDERA_CREDENTIAL_TOKEN;
    if (credentialTokenId && signal) {
      try {
        const metadata = new TextEncoder().encode(
          JSON.stringify({
            type: 'world-id-verified',
            address: signal,
            nullifierHash: payload.nullifier_hash,
            verifiedAt: new Date().toISOString(),
          }),
        );
        const serials = await mintCredential(credentialTokenId, [metadata]);
        credentialResult = { tokenId: credentialTokenId, serials };

        // Log credential mint to HCS audit trail
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
