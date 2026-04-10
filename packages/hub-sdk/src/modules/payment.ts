import { HubPaymentError, HubChainError } from "../errors.js";
import type { SupportedChain } from "../types/index.js";
import type { SharedConfig } from "./shared.js";

export interface X402PaymentRequest {
  amount: string;
  currency: string;
  chain: SupportedChain;
  recipient: string;
  memo?: string;
}

export interface X402PaymentReceipt {
  transactionId: string;
  chain: SupportedChain;
  amount: string;
  currency: string;
  status: "confirmed" | "pending" | "failed";
  timestamp: string;
}

export interface X402PaymentHeader {
  version: "x402-v2";
  chain: SupportedChain;
  transactionId: string;
  amount: string;
  currency: string;
}

const FACILITATORS: Partial<Record<SupportedChain, string>> = {
  hedera: "https://api.testnet.blocky402.com",
  base: "https://x402.base.org",
  arbitrum: "https://x402.arbitrum.io",
};

const USDC_TOKENS: Partial<Record<SupportedChain, string>> = {
  hedera: "0.0.456858",
  base: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  arbitrum: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

export class PaymentModule {
  private readonly config: SharedConfig;

  constructor(config: SharedConfig) {
    this.config = config;
  }

  getSupportedChains(): SupportedChain[] {
    return Object.keys(this.config.chains) as SupportedChain[];
  }

  getFacilitatorUrl(chain: SupportedChain): string | undefined {
    return FACILITATORS[chain];
  }

  getUsdcToken(chain: SupportedChain): string | undefined {
    return USDC_TOKENS[chain];
  }

  createPaymentRequest(input: {
    amount: string;
    chain?: SupportedChain;
    recipient: string;
    memo?: string;
  }): X402PaymentRequest {
    const chain = input.chain ?? this.selectCheapestChain();

    if (!this.config.chains[chain]) {
      throw new HubChainError(chain, `Chain '${chain}' is not configured`);
    }

    const usdcToken = USDC_TOKENS[chain];
    if (!usdcToken) {
      throw new HubPaymentError(`No USDC token configured for chain '${chain}'`, {
        chain,
        amount: input.amount,
      });
    }

    return {
      amount: input.amount,
      currency: "USDC",
      chain,
      recipient: input.recipient,
      memo: input.memo,
    };
  }

  buildPaymentHeader(receipt: X402PaymentReceipt): X402PaymentHeader {
    return {
      version: "x402-v2",
      chain: receipt.chain,
      transactionId: receipt.transactionId,
      amount: receipt.amount,
      currency: receipt.currency,
    };
  }

  encodePaymentHeader(header: X402PaymentHeader): string {
    return Buffer.from(JSON.stringify(header)).toString("base64");
  }

  decodePaymentHeader(encoded: string): X402PaymentHeader {
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      return JSON.parse(decoded) as X402PaymentHeader;
    } catch {
      throw new HubPaymentError("Invalid X-PAYMENT header: failed to decode");
    }
  }

  async verifyPayment(
    header: X402PaymentHeader,
  ): Promise<{ verified: boolean; error?: string }> {
    const facilitator = FACILITATORS[header.chain];
    if (!facilitator) {
      return { verified: false, error: `No facilitator for chain '${header.chain}'` };
    }

    try {
      const response = await fetch(`${facilitator}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: header.transactionId,
          amount: header.amount,
          currency: header.currency,
        }),
      });

      if (!response.ok) {
        return { verified: false, error: `Facilitator returned ${response.status}` };
      }

      const result = (await response.json()) as { verified: boolean };
      return { verified: result.verified };
    } catch (err) {
      return {
        verified: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  estimateSettlementFee(amount: string, feeRate = 0.003): string {
    const fee = parseFloat(amount) * feeRate;
    return fee.toFixed(6);
  }

  private selectCheapestChain(): SupportedChain {
    const configured = this.getSupportedChains();
    // Priority: hedera (cheapest gas) > base > arbitrum > others
    const priority: SupportedChain[] = ["hedera", "base", "arbitrum", "optimism", "polygon", "ethereum"];
    for (const chain of priority) {
      if (configured.includes(chain)) return chain;
    }
    if (configured.length > 0) return configured[0];
    throw new HubPaymentError("No chains configured for payment");
  }
}
