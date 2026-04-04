/**
 * Type declarations for server utility modules.
 * These modules live in server/ (excluded from Next.js tsconfig)
 * but are imported by shared lib/ code that runs in Fastify context.
 */

declare module '../../server/utils/retry' {
  export function withRetry<T>(
    fn: () => Promise<T>,
    policy?: { maxRetries: number; baseDelayMs: number },
  ): Promise<T>;
  export function isRetryable(err: unknown): boolean;
  export const RETRY_POLICIES: Record<string, { maxRetries: number; baseDelayMs: number }>;
}

declare module '../../server/utils/fetch-with-timeout' {
  export function fetchWithTimeout(
    url: string,
    options?: RequestInit & { timeout?: number },
  ): Promise<Response>;
  export const TIMEOUT_BUDGETS: Record<string, number>;
}
