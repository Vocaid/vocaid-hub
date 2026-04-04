import { NextRequest, NextResponse } from "next/server";
import { isVerifiedOnChain } from "@/lib/world-id";
import { auth } from "@/auth";
import { isAddress, type Address } from "viem";

/**
 * GET /api/world-id/check?address=0x...
 *
 * Lightweight World ID verification status check.
 * Requires authenticated session to prevent address enumeration.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { verified: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json(
      { verified: false, error: "address query param required" },
      { status: 400 },
    );
  }

  if (!isAddress(address)) {
    return NextResponse.json(
      { verified: false, error: "Invalid Ethereum address" },
      { status: 400 },
    );
  }

  try {
    const verified = await isVerifiedOnChain(address as Address);
    return NextResponse.json({ verified, address });
  } catch (err) {
    console.error("[world-id/check]", err);
    return NextResponse.json(
      { verified: false, error: "Verification check failed" },
      { status: 500 },
    );
  }
}
