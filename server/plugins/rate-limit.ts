import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply } from 'fastify';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  retryAfter: number;
  limit: number;
  resetAt: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    checkRateLimit: (
      ip: string,
      path: string,
      max: number,
      windowMs: number,
    ) => RateLimitResult | null;
  }
}

/**
 * Rate limit plugin — in-memory sliding window per IP+path.
 * Returns null if allowed, or { retryAfter, limit, resetAt } if blocked.
 * Stale entry cleanup every 5 minutes.
 */
async function rateLimitPlugin(app: FastifyInstance) {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup stale entries every 5 minutes
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);

  app.addHook('onClose', () => clearInterval(cleanup));

  app.decorate('checkRateLimit', (ip: string, path: string, max: number, windowMs: number): RateLimitResult | null => {
    const key = `${ip}:${path}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return null;
    }

    entry.count++;

    if (entry.count > max) {
      return {
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        limit: max,
        resetAt: entry.resetAt,
      };
    }

    return null;
  });
}

/** Helper to send 429 response from a rate limit result */
export function sendRateLimited(reply: FastifyReply, result: RateLimitResult) {
  return reply
    .code(429)
    .headers({
      'Retry-After': String(result.retryAfter),
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    })
    .send({ error: 'Too many requests. Try again later.' });
}

export default fp(rateLimitPlugin, { name: 'rate-limit' });
