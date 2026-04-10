/**
 * Seer — Hiring Signal Oracle
 *
 * Reads hiring data from Vocaid API, computes BULLISH/NEUTRAL/BEARISH
 * signals per domain, and logs to HCS audit trail.
 * Frequency: every 60 minutes.
 */
import type { HubClient } from "../client.js";
import type { HiringSignal, SignalDomain } from "../types/index.js";
import { VALID_DOMAINS } from "../types/index.js";

export interface SeerHeartbeatResult {
  signals: HiringSignal[];
  generatedAt: string;
  auditSequenceNumbers: string[];
}

export async function seerHeartbeat(
  hub: HubClient,
  options?: {
    domains?: SignalDomain[];
    timeWindow?: "7d" | "30d" | "90d";
    auditTopicId?: string;
  },
): Promise<SeerHeartbeatResult> {
  const domains = options?.domains ?? [...VALID_DOMAINS];
  const timeWindow = options?.timeWindow ?? "30d";
  const auditSequenceNumbers: string[] = [];

  // Fetch raw data from Vocaid Connect
  const jobs = await hub.vocaid.client.jobs.list().toArray();
  const interviews = await hub.vocaid.client.interviews.list().toArray();

  // Compute signal per domain
  const signals: HiringSignal[] = domains.map((domain) => {
    const domainJobs = jobs.map((j) => ({
      status: j.status?.toLowerCase() ?? "active",
      created_at: j.created_at,
    }));

    const domainInterviews = interviews.map((i) => ({
      score: i.score,
      created_at: i.created_at,
    }));

    return hub.vocaid.computeSignal({
      domain,
      timeWindow,
      jobs: domainJobs,
      interviews: domainInterviews,
    });
  });

  // Log to HCS if configured
  if (options?.auditTopicId && hub.hedera.isConfigured) {
    for (const signal of signals) {
      const seq = await hub.hedera.logAudit(options.auditTopicId, {
        agentId: "seer",
        action: "signal_computed",
        details: {
          domain: signal.domain,
          interpretation: signal.interpretation,
          compositeScore: signal.compositeScore,
        },
      });
      auditSequenceNumbers.push(seq);
    }
  }

  return {
    signals,
    generatedAt: new Date().toISOString(),
    auditSequenceNumbers,
  };
}
