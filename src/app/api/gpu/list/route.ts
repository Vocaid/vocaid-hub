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

  const address = req.nextUrl.searchParams.get('address');

  try {

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
    console.warn('[api/gpu/list] Falling back to demo data:', message);

    // Demo fallback: return mock data when 0G testnet is unreachable
    if (address) {
      return NextResponse.json({
        service: {
          provider: address,
          model: 'NVIDIA H100 80GB',
          url: 'https://inference.0g.ai/v1',
          teeSignerAcknowledged: true,
          verifiability: 'TDX',
        },
        _demo: true,
      });
    }

    return NextResponse.json({
      providers: [
        {
          provider: '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE',
          model: 'NVIDIA H100 80GB',
          url: 'https://inference.0g.ai/v1',
          inputPrice: '50000',
          outputPrice: '50000',
          verifiability: 'TDX',
          teeSignerAcknowledged: true,
        },
      ],
      _demo: true,
    });
  }
}
