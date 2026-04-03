import { listProviders, getProviderMetadata, verifyProvider } from '@/lib/og-compute';
import { requireWorldId } from '@/lib/world-id';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/gpu/list
 *
 * Query params:
 *   ?address=0x... — return the specific service matching this provider address
 *   (no address)   — return all services from the 0G compute network
 */
export async function GET(req: NextRequest) {
  const gate = await requireWorldId();
  if (gate instanceof NextResponse) return gate;

  try {
    const address = req.nextUrl.searchParams.get('address');

    if (address) {
      // Look up a specific provider and enrich with metadata + verification
      const [metadata, verification] = await Promise.all([
        getProviderMetadata(address),
        verifyProvider(address),
      ]);

      return NextResponse.json({
        service: {
          provider: address,
          model: metadata.model,
          url: metadata.endpoint,
          teeSignerAcknowledged: verification.success,
          verifiability: verification.teeVerifier,
        },
      });
    }

    // List all providers
    const providers = await listProviders();

    return NextResponse.json({ providers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[api/gpu/list]', message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
