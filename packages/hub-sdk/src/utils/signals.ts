import {
  SIGNAL_WEIGHTS,
  type HiringSignal,
  type SignalDomain,
  type SignalInterpretation,
  type TimeWindow,
} from "../types/index.js";

interface JobInput {
  status: string;
  created_at: string;
}

interface InterviewInput {
  score: number | null;
  created_at: string;
}

interface ComputeInput {
  domain: SignalDomain;
  timeWindow: TimeWindow;
  jobs: JobInput[];
  interviews: InterviewInput[];
}

function getWindowCutoff(window: TimeWindow): Date {
  const days = { "7d": 7, "30d": 30, "90d": 90 }[window];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

export function computeHiringSignal(input: ComputeInput): HiringSignal {
  const cutoff = getWindowCutoff(input.timeWindow);

  const activeJobs = input.jobs.filter((j) => j.status === "active");
  const openCount = activeJobs.length;
  const newPostings = activeJobs.filter((j) => new Date(j.created_at) >= cutoff).length;

  const recentInterviews = input.interviews.filter(
    (i) => new Date(i.created_at) >= cutoff,
  );
  const scores = recentInterviews
    .map((i) => i.score)
    .filter((s): s is number => s !== null && s !== undefined);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const demandScore = Math.min(1.0, openCount / 100);
  const supplyScore = Math.min(1.0, recentInterviews.length / 500);
  const qualityScore = avgScore / 100;

  const composite = Math.round(
    (demandScore * SIGNAL_WEIGHTS.demand +
      supplyScore * SIGNAL_WEIGHTS.supply +
      qualityScore * SIGNAL_WEIGHTS.quality) *
      100,
  ) / 100;

  const trend = newPostings > 0 ? "increasing" as const : "stable" as const;
  const trendPct =
    newPostings > 0
      ? Math.round((newPostings / Math.max(openCount, 1)) * 1000) / 10
      : 0;

  const interpretation: SignalInterpretation =
    composite > 0.6 ? "BULLISH" : composite < 0.3 ? "BEARISH" : "NEUTRAL";

  return {
    domain: input.domain,
    timeWindow: input.timeWindow,
    generatedAt: new Date().toISOString(),
    compositeScore: composite,
    interpretation,
    demand: {
      openPositions: openCount,
      newPostings,
      trend,
      trendPct,
    },
    supply: {
      totalInterviews: recentInterviews.length,
      avgScore: Math.round(avgScore * 10) / 10,
      passRate: avgScore > 0 ? Math.round((avgScore / 100) * 100) / 100 : 0,
    },
  };
}
