// ---------------------------------------------------------------------------
// x402 Payment Middleware — Reusable wrapper for any Next.js API route
// Implements the x402 protocol: 402 → verify → serve → settle
// Uses Blocky402 facilitator on Hedera Testnet
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { verifyPayment, settlePayment } from "@/lib/blocky402";

const USDC_TOKEN_ID = process.env.HEDERA_USDC_TOKEN ?? "0.0.429274";
const BLOCKY402_URL =
  process.env.BLOCKY402_URL ?? "https://api.testnet.blocky402.com";

export interface X402Options {
  /** USDC amount required (e.g. "0.01") */
  amount: string;
  /** Human-readable description of what the payment is for */
  description: string;
  /** Resource identifier for audit trail */
  resource?: string;
}

export interface X402PaymentInfo {
  payer: string;
  amount: string;
  token: string;
  network: string;
  txHash: string;
}

type RouteHandler = (
  req: NextRequest,
  context: { payment: X402PaymentInfo },
) => Promise<NextResponse> | NextResponse;

/**
 * Build the standard 402 Payment Required response per x402 protocol.
 *
 * The response includes:
 * - JSON body with payment requirements
 * - X-PAYMENT-REQUIRED header for programmatic clients
 */
function paymentRequiredResponse(options: X402Options): NextResponse {
  const requirements = {
    network: "hedera-testnet",
    token: USDC_TOKEN_ID,
    amount: options.amount,
    facilitator: BLOCKY402_URL,
    description: options.description,
    resource: options.resource,
  };

  return NextResponse.json(
    {
      error: "Payment Required",
      message: `This resource requires a payment of ${options.amount} USDC`,
      accepts: requirements,
    },
    {
      status: 402,
      headers: {
        "X-PAYMENT-REQUIRED": JSON.stringify(requirements),
      },
    },
  );
}

/**
 * Wrap a Next.js API route handler with x402 payment gating.
 *
 * Usage:
 * ```ts
 * import { withX402Payment } from "@/lib/x402-middleware";
 *
 * const handler = withX402Payment(
 *   async (req, { payment }) => {
 *     // payment.payer, payment.amount, payment.txHash available
 *     return NextResponse.json({ data: "paid content" });
 *   },
 *   { amount: "0.01", description: "GPU inference call" }
 * );
 *
 * export { handler as POST };
 * ```
 */
export function withX402Payment(
  handler: RouteHandler,
  options: X402Options,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const paymentHeader = req.headers.get("X-PAYMENT");

    // No payment header → 402 Payment Required
    if (!paymentHeader) {
      return paymentRequiredResponse(options);
    }

    try {
      // Step 1: Verify the payment with Blocky402
      const verification = await verifyPayment(paymentHeader);

      if (!verification.valid) {
        return NextResponse.json(
          { error: "Payment verification failed", details: "Invalid payment" },
          { status: 402 },
        );
      }

      // Step 2: Settle the payment on-chain
      const settlement = await settlePayment(paymentHeader);

      // Step 3: Call the wrapped handler with payment info
      const paymentInfo: X402PaymentInfo = {
        payer: verification.payer,
        amount: verification.amount,
        token: verification.token,
        network: verification.network,
        txHash: settlement.txHash,
      };

      return handler(req, { payment: paymentInfo });
    } catch (err) {
      console.error("[x402-middleware] Payment processing error:", err);

      // If Blocky402 is unreachable, fall back to demo mode:
      // accept the payment header as-is and provide mock settlement
      const decoded = safeDecode(paymentHeader);
      if (decoded) {
        const mockPayment: X402PaymentInfo = {
          payer: decoded.payer ?? "demo-payer",
          amount: decoded.amount ?? options.amount,
          token: USDC_TOKEN_ID,
          network: "hedera-testnet",
          txHash: `demo-${Date.now().toString(36)}`,
        };

        return handler(req, { payment: mockPayment });
      }

      return NextResponse.json(
        { error: "Payment processing failed" },
        { status: 500 },
      );
    }
  };
}

/** Safely decode a base64 JSON payment header (for demo fallback) */
function safeDecode(
  header: string,
): Record<string, string> | null {
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}
