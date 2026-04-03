import { NextRequest, NextResponse } from "next/server";
import { verifyPayment, settlePayment } from "@/lib/blocky402";
import { logAuditMessage } from "@/lib/hedera";
import { executeAgentAction } from "@/lib/hedera-agent";

// USDC token on Hedera testnet
const USDC_TOKEN_ID = process.env.HEDERA_USDC_TOKEN ?? "0.0.429274";
const AUDIT_TOPIC_ID = process.env.HEDERA_AUDIT_TOPIC ?? "";

// ---------------------------------------------------------------------------
// POST /api/payments — x402 USDC payment via Blocky402 facilitator
//
// Flow:
//   1. Client sends request with `X-PAYMENT` header (x402 signed payload)
//   2. We verify with Blocky402
//   3. If valid, settle the payment on-chain
//   4. Log the transaction to HCS audit trail
//   5. Return success + resource
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const paymentHeader = req.headers.get("X-PAYMENT");

  // No payment header → 402 Payment Required (x402 protocol)
  if (!paymentHeader) {
    return NextResponse.json(
      {
        error: "Payment Required",
        accepts: {
          network: "hedera-testnet",
          token: USDC_TOKEN_ID,
          facilitator: "https://api.testnet.blocky402.com",
        },
      },
      {
        status: 402,
        headers: {
          "X-PAYMENT-REQUIRED": JSON.stringify({
            network: "hedera-testnet",
            token: USDC_TOKEN_ID,
            amount: "0.01",
            facilitator: "https://api.testnet.blocky402.com",
          }),
        },
      },
    );
  }

  try {
    // Step 1: Verify the payment with Blocky402
    const verification = await verifyPayment(paymentHeader);

    if (!verification.valid) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 402 },
      );
    }

    // Step 2: Settle the payment on-chain
    const settlement = await settlePayment(paymentHeader);

    // Step 3: Log to HCS audit trail (best-effort, don't block response)
    if (AUDIT_TOPIC_ID) {
      logAuditMessage(
        AUDIT_TOPIC_ID,
        JSON.stringify({
          type: "payment_settled",
          payer: verification.payer,
          amount: verification.amount,
          token: verification.token,
          txHash: settlement.txHash,
          timestamp: new Date().toISOString(),
        }),
      ).catch((err) =>
        console.error("Failed to log audit message:", err),
      );
    }

    // Step 4: Return the paid resource
    return NextResponse.json({
      success: true,
      payment: {
        settled: settlement.settled,
        txHash: settlement.txHash,
        payer: verification.payer,
        amount: verification.amount,
        network: verification.network,
      },
      resource: {
        message: "Payment received. Access granted.",
      },
    });
  } catch (err) {
    console.error("Payment processing error:", err);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 },
    );
  }
}
