// ---------------------------------------------------------------------------
// Blocky402 — x402 Facilitator Client for Hedera Testnet
// https://api.testnet.blocky402.com
// ---------------------------------------------------------------------------

import { fetchWithTimeout, TIMEOUT_BUDGETS } from '../../server/utils/fetch-with-timeout';
import { withRetry, RETRY_POLICIES } from '../../server/utils/retry';

const BLOCKY402_BASE =
  process.env.BLOCKY402_URL ?? "https://api.testnet.blocky402.com";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentVerification {
  valid: boolean;
  network: string;
  payer: string;
  amount: string;
  token: string;
}

export interface PaymentSettlement {
  settled: boolean;
  txHash: string;
  network: string;
}

export interface SupportedNetwork {
  network: string;
  tokens: string[];
  feePayer: string;
}

// ---------------------------------------------------------------------------
// Verify — confirm a payment header is valid before serving content
// ---------------------------------------------------------------------------

export async function verifyPayment(
  paymentHeader: string,
): Promise<PaymentVerification> {
  return withRetry(async () => {
    const res = await fetchWithTimeout(`${BLOCKY402_BASE}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentHeader }),
      timeout: TIMEOUT_BUDGETS.BLOCKY402,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Blocky402 /verify failed (${res.status}): ${text}`);
    }

    return (await res.json()) as PaymentVerification;
  }, RETRY_POLICIES.BLOCKY402_VERIFY);
}

// ---------------------------------------------------------------------------
// Settle — execute the payment on-chain after resource delivery
// ---------------------------------------------------------------------------

export async function settlePayment(
  paymentPayload: string,
): Promise<PaymentSettlement> {
  return withRetry(async () => {
    const res = await fetchWithTimeout(`${BLOCKY402_BASE}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentPayload }),
      timeout: TIMEOUT_BUDGETS.BLOCKY402,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Blocky402 /settle failed (${res.status}): ${text}`);
    }

    return (await res.json()) as PaymentSettlement;
  }, RETRY_POLICIES.BLOCKY402_SETTLE);
}

// ---------------------------------------------------------------------------
// Supported Networks — confirm hedera-testnet is available
// ---------------------------------------------------------------------------

export async function getSupportedNetworks(): Promise<SupportedNetwork[]> {
  const res = await fetchWithTimeout(`${BLOCKY402_BASE}/supported`, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeout: TIMEOUT_BUDGETS.BLOCKY402,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blocky402 /supported failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { networks: SupportedNetwork[] };
  return data.networks;
}
