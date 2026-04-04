import { signRequest, IDKit } from '@worldcoin/idkit';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SIGNING_KEY = process.env.RP_SIGNING_KEY;
const RP_ID = process.env.RP_ID ?? process.env.WORLD_RP_ID ?? 'rp_21826eb5449cc811';

// Initialize WASM once (required before signRequest can run server-side)
let wasmReady: Promise<void> | null = null;
function ensureWasm() {
  if (!wasmReady) wasmReady = IDKit.initServer();
  return wasmReady;
}

export async function POST(req: Request) {
  if (!SIGNING_KEY) {
    return NextResponse.json(
      { error: 'RP_SIGNING_KEY not configured' },
      { status: 500 },
    );
  }

  try {
    await ensureWasm();

    const { action } = await req.json();
    const sig = signRequest(action, SIGNING_KEY);

    return NextResponse.json({
      rp_id: RP_ID,
      sig: sig.sig,
      nonce: sig.nonce,
      created_at: Number(sig.createdAt),
      expires_at: Number(sig.expiresAt),
    });
  } catch (err) {
    console.error('[rp-signature] Error:', err);
    return NextResponse.json(
      { error: 'Signing failed' },
      { status: 500 },
    );
  }
}
