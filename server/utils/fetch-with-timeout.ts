// server/utils/fetch-with-timeout.ts

export interface FetchWithTimeoutOptions extends RequestInit {
  /** Timeout in milliseconds. Default: 10_000 (10 seconds). */
  timeout?: number;
}

/**
 * Fetch wrapper that aborts after a configurable timeout.
 * Prevents indefinite hangs on external API calls.
 *
 * @throws DOMException with name 'AbortError' on timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeout = 10_000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pre-configured timeout budgets per external service.
 * Use these as the `timeout` value in fetchWithTimeout.
 */
export const TIMEOUT_BUDGETS = {
  WORLD_ID_API: 10_000,    // World Developer Portal verification
  HEDERA_MIRROR: 8_000,    // Mirror Node REST queries
  BLOCKY402: 15_000,        // Payment settlement (must complete)
  OG_INFERENCE: 30_000,     // AI inference (can be slow)
  OG_RPC: 10_000,           // Chain RPC reads
  INTERNAL: 5_000,          // Internal API calls
} as const;
