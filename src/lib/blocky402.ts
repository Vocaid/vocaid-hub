// ---------------------------------------------------------------------------
// Blocky402 — x402 Facilitator Client for Hedera Testnet
// https://api.testnet.blocky402.com
// ---------------------------------------------------------------------------

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
  const res = await fetch(`${BLOCKY402_BASE}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment: paymentHeader }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blocky402 /verify failed (${res.status}): ${text}`);
  }

  return (await res.json()) as PaymentVerification;
}

// ---------------------------------------------------------------------------
// Settle — execute the payment on-chain after resource delivery
// ---------------------------------------------------------------------------

export async function settlePayment(
  paymentPayload: string,
): Promise<PaymentSettlement> {
  const res = await fetch(`${BLOCKY402_BASE}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment: paymentPayload }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blocky402 /settle failed (${res.status}): ${text}`);
  }

  return (await res.json()) as PaymentSettlement;
}

// ---------------------------------------------------------------------------
// Supported Networks — confirm hedera-testnet is available
// ---------------------------------------------------------------------------

export async function getSupportedNetworks(): Promise<SupportedNetwork[]> {
  const res = await fetch(`${BLOCKY402_BASE}/supported`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blocky402 /supported failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { networks: SupportedNetwork[] };
  return data.networks;
}
