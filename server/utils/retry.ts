// server/utils/retry.ts

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3). */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 500). Doubles each attempt. */
  baseDelay?: number;
  /** Maximum delay cap in ms (default: 10_000). */
  maxDelay?: number;
  /** Custom predicate — return true to retry, false to throw immediately. */
  retryOn?: (error: unknown) => boolean;
}

/**
 * Execute an async function with exponential backoff retry.
 *
 * Delay formula: min(baseDelay * 2^attempt + jitter, maxDelay)
 * Jitter: random 0-200ms to prevent thundering herd.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 500,
    maxDelay = 10_000,
    retryOn = isRetryable,
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !retryOn(error)) throw error;

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 200,
        maxDelay,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Unreachable — loop always returns or throws
  throw new Error('withRetry: unreachable');
}

/**
 * Default retryable error predicate.
 * Retries: network errors, 5xx, 429 rate limit.
 * Does NOT retry: AbortError (timeout), 4xx client errors, non-Error values.
 */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return false;

  const msg = error.message;
  // Network errors
  if (msg.includes('ECONNREFUSED')) return true;
  if (msg.includes('ETIMEDOUT')) return true;
  if (msg.includes('ENOTFOUND')) return true;
  if (msg.includes('ECONNRESET')) return true;
  if (msg.includes('fetch failed')) return true;
  // HTTP 5xx
  if (msg.includes('500')) return true;
  if (msg.includes('502')) return true;
  if (msg.includes('503')) return true;
  if (msg.includes('504')) return true;
  // Rate limited
  if (msg.includes('429')) return true;
  // Hedera BUSY status
  if (msg.includes('BUSY')) return true;

  return false;
}

/**
 * Pre-configured retry policies per service.
 */
export const RETRY_POLICIES = {
  /** Hedera SDK transactions — 2 retries, 1s base (BUSY/network errors) */
  HEDERA_TX: { maxRetries: 2, baseDelay: 1000 } satisfies RetryOptions,
  /** Blocky402 verify — 2 retries, 500ms base */
  BLOCKY402_VERIFY: { maxRetries: 2, baseDelay: 500 } satisfies RetryOptions,
  /** Blocky402 settle — 1 retry only (idempotency risk) */
  BLOCKY402_SETTLE: { maxRetries: 1, baseDelay: 1000 } satisfies RetryOptions,
  /** World ID verify — 1 retry, 500ms base */
  WORLD_ID: { maxRetries: 1, baseDelay: 500 } satisfies RetryOptions,
  /** 0G broker inference — 1 retry, 2s base (slow) */
  OG_INFERENCE: { maxRetries: 1, baseDelay: 2000 } satisfies RetryOptions,
  /** Mirror Node query — 2 retries, 500ms base */
  MIRROR_NODE: { maxRetries: 2, baseDelay: 500 } satisfies RetryOptions,
  /** ethers contract read — 2 retries, 500ms base */
  RPC_READ: { maxRetries: 2, baseDelay: 500 } satisfies RetryOptions,
  /** NEVER retry contract writes (nonce risk) */
  RPC_WRITE: { maxRetries: 0 } satisfies RetryOptions,
} as const;
