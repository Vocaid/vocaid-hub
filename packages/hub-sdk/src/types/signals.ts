export const VALID_DOMAINS = [
  "ai_engineer", "backend", "frontend",
  "data_science", "devops", "product", "design",
] as const;

export type SignalDomain = (typeof VALID_DOMAINS)[number];

export type SignalInterpretation = "BULLISH" | "NEUTRAL" | "BEARISH";

export type TimeWindow = "7d" | "30d" | "90d";

export const SIGNAL_WEIGHTS = {
  demand: 0.5,
  supply: 0.3,
  quality: 0.2,
} as const;

export interface DemandSignal {
  openPositions: number;
  newPostings: number;
  trend: "increasing" | "stable";
  trendPct: number;
}

export interface SupplySignal {
  totalInterviews: number;
  avgScore: number;
  passRate: number;
}

export interface HiringSignal {
  domain: SignalDomain;
  timeWindow: TimeWindow;
  generatedAt: string;
  compositeScore: number;
  interpretation: SignalInterpretation;
  demand: DemandSignal;
  supply: SupplySignal;
}
