import { NextRequest, NextResponse } from "next/server";

const USDC_TOKEN_ID = process.env.HEDERA_USDC_TOKEN ?? "0.0.429274";
const BLOCKY402_URL =
  process.env.BLOCKY402_URL ?? "https://api.testnet.blocky402.com";

// ---------------------------------------------------------------------------
// POST /api/initiate-payment — Start an x402 payment flow
//
// Client calls this to get payment requirements before constructing
// the X-PAYMENT header for the actual resource endpoint.
//
// Body: { resourceName: string, resourceType: string, amount?: string }
// Returns: x402 payment requirements + a unique payment ID
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resourceName, resourceType, amount } = body as {
      resourceName?: string;
      resourceType?: string;
      amount?: string;
    };

    if (!resourceName) {
      return NextResponse.json(
        { error: "resourceName is required" },
        { status: 400 },
      );
    }

    // Determine price based on resource type
    const paymentAmount = amount ?? getDefaultPrice(resourceType);
    const paymentId = crypto.randomUUID();

    return NextResponse.json({
      paymentId,
      requirements: {
        network: "hedera-testnet",
        token: USDC_TOKEN_ID,
        amount: paymentAmount,
        facilitator: BLOCKY402_URL,
        feePayer: "0.0.7162784",
      },
      resource: {
        name: resourceName,
        type: resourceType ?? "unknown",
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}

function getDefaultPrice(resourceType?: string): string {
  switch (resourceType) {
    case "gpu":
      return "0.05";
    case "agent":
      return "0.02";
    case "human":
      return "25.00";
    default:
      return "0.01";
  }
}
