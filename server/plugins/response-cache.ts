import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

interface CacheEntry {
  body: string;
  expiresAt: number;
}

/**
 * In-memory response cache for GET endpoints.
 * Cache key = path + sorted query string.
 */
export class ResponseCache {
  private store = new Map<string, CacheEntry>();

  private key(path: string, query: string): string {
    return `${path}?${query}`;
  }

  get(path: string, query: string): string | undefined {
    const entry = this.store.get(this.key(path, query));
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(this.key(path, query));
      return undefined;
    }
    return entry.body;
  }

  set(path: string, query: string, body: string, ttlMs: number): void {
    this.store.set(this.key(path, query), {
      body,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(pathPrefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(pathPrefix)) {
        this.store.delete(key);
      }
    }
  }

  getCacheControl(ttlMs: number): string {
    if (ttlMs <= 0) return 'no-store';
    const maxAge = Math.round(ttlMs / 1000);
    return `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`;
  }
}

/** Per-route cache TTL configuration. 0 = no cache. */
export const ROUTE_CACHE_TTL: Record<string, number> = {
  '/api/resources':                  30_000,
  '/api/agents':                    300_000,
  '/api/predictions':                10_000,
  '/api/activity':                   10_000,
  '/api/agent-decision':             30_000,
  '/api/hedera/audit':               15_000,
  '/api/proposals':                  15_000,
  '/.well-known/agent-card.json':   300_000,
};

declare module 'fastify' {
  interface FastifyInstance {
    responseCache: ResponseCache;
  }
}

async function responseCachePlugin(app: FastifyInstance) {
  const cache = new ResponseCache();
  app.decorate('responseCache', cache);

  // Cleanup expired entries every 2 minutes
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of (cache as unknown as { store: Map<string, CacheEntry> }).store) {
      if (now > entry.expiresAt) {
        (cache as unknown as { store: Map<string, CacheEntry> }).store.delete(key);
      }
    }
  }, 2 * 60 * 1000);

  app.addHook('onClose', () => clearInterval(cleanup));

  // Cache GET responses
  app.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') return;

    const ttl = ROUTE_CACHE_TTL[request.routeOptions?.url ?? ''] ?? 0;
    if (ttl <= 0) return;

    const query = new URL(request.url, 'http://localhost').search.slice(1);
    const cached = cache.get(request.routeOptions?.url ?? request.url, query);

    if (cached) {
      reply
        .header('Content-Type', 'application/json')
        .header('Cache-Control', cache.getCacheControl(ttl))
        .header('X-Cache', 'HIT')
        .send(cached);
    }
  });

  app.addHook('onSend', async (request, reply, payload) => {
    if (request.method !== 'GET') return payload;
    if (reply.statusCode !== 200) return payload;

    const routeUrl = request.routeOptions?.url ?? '';
    const ttl = ROUTE_CACHE_TTL[routeUrl] ?? 0;
    if (ttl <= 0) return payload;

    // Don't re-cache HIT responses
    if (reply.getHeader('X-Cache') === 'HIT') return payload;

    const query = new URL(request.url, 'http://localhost').search.slice(1);
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    cache.set(routeUrl, query, body, ttl);

    reply.header('Cache-Control', cache.getCacheControl(ttl));
    reply.header('X-Cache', 'MISS');

    return payload;
  });
}

export default fp(responseCachePlugin, { name: 'response-cache' });
