import { VocaidClient } from "@vocaid/connect";
import { computeHiringSignal } from "../utils/signals.js";
import type { HiringSignal, SignalDomain, TimeWindow } from "../types/index.js";
import type { SharedConfig } from "./shared.js";

interface ComputeSignalInput {
  domain: SignalDomain;
  timeWindow: TimeWindow;
  jobs: Array<{ status: string; created_at: string }>;
  interviews: Array<{ score: number | null; created_at: string }>;
}

export class VocaidModule {
  readonly client: VocaidClient;
  readonly hubUrl: string;

  constructor(config: SharedConfig) {
    this.hubUrl = config.hubUrl;
    this.client = new VocaidClient({ apiKey: config.apiKey });
  }

  computeSignal(input: ComputeSignalInput): HiringSignal {
    return computeHiringSignal(input);
  }
}
