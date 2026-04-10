import { HubChainError, HubPaymentError } from "../errors.js";
import type { SupportedChain } from "../types/index.js";
import type { SharedConfig } from "./shared.js";

export type MarketStatus = "open" | "resolved_yes" | "resolved_no" | "cancelled";

export interface Market {
  id: string;
  question: string;
  description: string;
  chain: SupportedChain;
  status: MarketStatus;
  yesPrice: number;
  noPrice: number;
  totalVolume: string;
  resolutionDate: string;
  createdAt: string;
  takerFeeBps: number;
}

export interface CreateMarketInput {
  question: string;
  description: string;
  chain?: SupportedChain;
  resolutionDate: string;
  initialLiquidity?: string;
  takerFeeBps?: number;
}

export interface PlaceBetInput {
  marketId: string;
  outcome: "YES" | "NO";
  amount: string;
  chain?: SupportedChain;
}

export interface BetReceipt {
  marketId: string;
  outcome: "YES" | "NO";
  amount: string;
  shares: string;
  pricePerShare: number;
  fee: string;
  transactionId?: string;
}

export interface MarketResolution {
  marketId: string;
  outcome: "YES" | "NO";
  evidence: string;
  resolvedBy: string;
  resolvedAt: string;
}

// Probability-weighted taker fee (Polymarket model)
// Peak at 50% probability, lower near certainty
function calculateTakerFee(probability: number, baseBps: number): number {
  const weight = 4 * probability * (1 - probability); // peaks at 0.5
  return Math.round(baseBps * weight);
}

export class MarketModule {
  private readonly config: SharedConfig;
  private readonly markets: Map<string, Market> = new Map();

  constructor(config: SharedConfig) {
    this.config = config;
  }

  createMarket(input: CreateMarketInput): Market {
    const chain = input.chain ?? this.getDefaultChain();
    const id = `mkt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const takerFeeBps = input.takerFeeBps ?? 200; // 2% default

    const market: Market = {
      id,
      question: input.question,
      description: input.description,
      chain,
      status: "open",
      yesPrice: 0.5,
      noPrice: 0.5,
      totalVolume: input.initialLiquidity ?? "0",
      resolutionDate: input.resolutionDate,
      createdAt: new Date().toISOString(),
      takerFeeBps,
    };

    this.markets.set(id, market);
    return market;
  }

  getMarket(marketId: string): Market | undefined {
    return this.markets.get(marketId);
  }

  listMarkets(filter?: { status?: MarketStatus; chain?: SupportedChain }): Market[] {
    let markets = Array.from(this.markets.values());
    if (filter?.status) markets = markets.filter((m) => m.status === filter.status);
    if (filter?.chain) markets = markets.filter((m) => m.chain === filter.chain);
    return markets;
  }

  placeBet(input: PlaceBetInput): BetReceipt {
    const market = this.markets.get(input.marketId);
    if (!market) {
      throw new HubPaymentError(`Market ${input.marketId} not found`);
    }
    if (market.status !== "open") {
      throw new HubPaymentError(`Market ${input.marketId} is ${market.status}, not open`);
    }

    const amount = parseFloat(input.amount);
    const price = input.outcome === "YES" ? market.yesPrice : market.noPrice;
    const shares = amount / price;
    const feeBps = calculateTakerFee(price, market.takerFeeBps);
    const fee = (amount * feeBps) / 10_000;

    // Update market prices (simple CPMM-style)
    const shift = amount / (parseFloat(market.totalVolume) + amount + 1) * 0.1;
    if (input.outcome === "YES") {
      market.yesPrice = Math.min(0.99, market.yesPrice + shift);
      market.noPrice = Math.max(0.01, 1 - market.yesPrice);
    } else {
      market.noPrice = Math.min(0.99, market.noPrice + shift);
      market.yesPrice = Math.max(0.01, 1 - market.noPrice);
    }

    market.totalVolume = (parseFloat(market.totalVolume) + amount).toFixed(2);

    return {
      marketId: input.marketId,
      outcome: input.outcome,
      amount: input.amount,
      shares: shares.toFixed(4),
      pricePerShare: price,
      fee: fee.toFixed(6),
    };
  }

  resolveMarket(resolution: MarketResolution): Market {
    const market = this.markets.get(resolution.marketId);
    if (!market) {
      throw new HubPaymentError(`Market ${resolution.marketId} not found`);
    }
    if (market.status !== "open") {
      throw new HubPaymentError(`Market ${resolution.marketId} already resolved`);
    }

    market.status = resolution.outcome === "YES" ? "resolved_yes" : "resolved_no";
    market.yesPrice = resolution.outcome === "YES" ? 1.0 : 0.0;
    market.noPrice = resolution.outcome === "NO" ? 1.0 : 0.0;

    return market;
  }

  estimateFee(marketId: string, outcome: "YES" | "NO", amount: string): string {
    const market = this.markets.get(marketId);
    if (!market) return "0";

    const price = outcome === "YES" ? market.yesPrice : market.noPrice;
    const feeBps = calculateTakerFee(price, market.takerFeeBps);
    const fee = (parseFloat(amount) * feeBps) / 10_000;
    return fee.toFixed(6);
  }

  private getDefaultChain(): SupportedChain {
    const chains = Object.keys(this.config.chains) as SupportedChain[];
    if (chains.length === 0) throw new HubChainError("none", "No chains configured");
    return chains[0];
  }
}
