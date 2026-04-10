import { HubPaymentError } from "../errors.js";
import type { X402PaymentHeader } from "../modules/payment.js";

/**
 * Wraps native fetch to handle HTTP 402 Payment Required responses.
 *
 * When a server returns 402, the wrapper extracts payment requirements
 * from the response and calls the provided payment handler. If payment
 * succeeds, the original request is retried with the X-PAYMENT header.
 */
export interface X402FetchOptions {
  onPaymentRequired: (requirements: PaymentRequirements) => Promise<X402PaymentHeader>;
  maxRetries?: number;
}

export interface PaymentRequirements {
  amount: string;
  currency: string;
  recipient: string;
  chain?: string;
  memo?: string;
}

export function createX402Fetch(options: X402FetchOptions) {
  const maxRetries = options.maxRetries ?? 1;

  return async function x402Fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const response = await fetch(input, init);

    if (response.status !== 402) {
      return response;
    }

    // Extract payment requirements from 402 response
    let requirements: PaymentRequirements;
    try {
      const body = (await response.json()) as {
        payment_required?: PaymentRequirements;
      };
      if (!body.payment_required) {
        throw new HubPaymentError("402 response missing payment_required field");
      }
      requirements = body.payment_required;
    } catch (err) {
      if (err instanceof HubPaymentError) throw err;
      throw new HubPaymentError("Failed to parse 402 payment requirements");
    }

    // Attempt payment and retry
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const paymentHeader = await options.onPaymentRequired(requirements);
      const encoded = Buffer.from(JSON.stringify(paymentHeader)).toString("base64");

      const retryResponse = await fetch(input, {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init?.headers).entries()),
          "X-PAYMENT": encoded,
        },
      });

      if (retryResponse.status !== 402) {
        return retryResponse;
      }
    }

    throw new HubPaymentError(
      `Payment failed after ${maxRetries} attempts`,
      { amount: requirements.amount },
    );
  };
}
