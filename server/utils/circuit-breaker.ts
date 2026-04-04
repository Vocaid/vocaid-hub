// server/utils/circuit-breaker.ts

type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface BreakerConfig {
  name: string;
  /** Number of failures before opening (default: 3). */
  maxFailures?: number;
  /** Duration in ms the breaker stays OPEN before transitioning to HALF_OPEN (default: 30_000). */
  openDurationMs?: number;
}

/**
 * Per-service circuit breaker with CLOSED → OPEN → HALF_OPEN state machine.
 *
 * - CLOSED: requests pass through normally
 * - OPEN: requests short-circuit to fallback (no network call)
 * - HALF_OPEN: one probe request allowed; success → CLOSED, failure → OPEN
 */
export class ServiceBreaker {
  readonly name: string;
  private readonly maxFailures: number;
  private readonly openDurationMs: number;
  private _failures = 0;
  private _openUntil = 0;

  constructor(config: BreakerConfig) {
    this.name = config.name;
    this.maxFailures = config.maxFailures ?? 3;
    this.openDurationMs = config.openDurationMs ?? 30_000;
  }

  get failures(): number {
    return this._failures;
  }

  get state(): BreakerState {
    if (this._failures < this.maxFailures) return 'CLOSED';
    if (Date.now() > this._openUntil) return 'HALF_OPEN';
    return 'OPEN';
  }

  get isOpen(): boolean {
    return this.state === 'OPEN';
  }

  recordFailure(): void {
    this._failures++;
    if (this._failures >= this.maxFailures) {
      this._openUntil = Date.now() + this.openDurationMs;
    }
  }

  recordSuccess(): void {
    this._failures = 0;
    this._openUntil = 0;
  }

  /**
   * Execute a function through the breaker.
   * Returns fallback immediately if OPEN. Records success/failure.
   */
  async execute<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (this.isOpen) return fallback;

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch {
      this.recordFailure();
      return fallback;
    }
  }
}

/**
 * Pre-configured breakers for each external service.
 * Import and use: `breakers['hedera'].execute(fn, fallback)`
 */
export const BREAKER_CONFIGS = {
  'hedera':      { name: 'hedera',      maxFailures: 3, openDurationMs: 30_000 },
  'blocky402':   { name: 'blocky402',   maxFailures: 3, openDurationMs: 60_000 },
  'og-broker':   { name: 'og-broker',   maxFailures: 3, openDurationMs: 30_000 },
  'og-rpc':      { name: 'og-rpc',      maxFailures: 5, openDurationMs: 15_000 },
  'world-id':    { name: 'world-id',    maxFailures: 3, openDurationMs: 30_000 },
  'mirror-node': { name: 'mirror-node', maxFailures: 5, openDurationMs: 20_000 },
} as const satisfies Record<string, BreakerConfig>;

/** Singleton breaker instances — shared across requests in the persistent Fastify process. */
const instances = new Map<string, ServiceBreaker>();

export function getBreaker(service: keyof typeof BREAKER_CONFIGS): ServiceBreaker {
  let breaker = instances.get(service);
  if (!breaker) {
    breaker = new ServiceBreaker(BREAKER_CONFIGS[service]);
    instances.set(service, breaker);
  }
  return breaker;
}
