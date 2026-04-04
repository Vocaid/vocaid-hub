import type { FastifyInstance } from 'fastify';

const NEXT_URL = process.env.NEXT_URL ?? 'http://localhost:3000';

/**
 * Auth routes — proxy to Next.js for NextAuth flow + session endpoint.
 */
export default async function authRoutes(app: FastifyInstance) {
  // ── GET /api/auth/session — return decoded JWT from Fastify auth plugin ──
  app.get('/auth/session', async (request, reply) => {
    if (!request.session?.user?.id) {
      return reply.code(401).send({ user: null });
    }
    return { user: request.session.user };
  });

  // ── Proxy all other /api/auth/* to Next.js ──
  app.all('/auth/*', async (request, reply) => {
    const path = (request.params as { '*': string })['*'];
    // Skip the session endpoint we handle above
    if (path === 'session') return;

    const targetUrl = `${NEXT_URL}/api/auth/${path}`;
    const headers: Record<string, string> = {};

    // Forward relevant headers
    for (const key of ['content-type', 'cookie', 'authorization', 'accept']) {
      const val = request.headers[key];
      if (val) headers[key] = Array.isArray(val) ? val[0] : val;
    }

    try {
      const res = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: ['POST', 'PUT', 'PATCH'].includes(request.method)
          ? JSON.stringify(request.body)
          : undefined,
      });

      // Forward response headers
      const setCookie = res.headers.getSetCookie?.();
      if (setCookie?.length) {
        for (const c of setCookie) {
          reply.header('set-cookie', c);
        }
      }

      reply.code(res.status);
      reply.header('content-type', res.headers.get('content-type') ?? 'application/json');
      const body = await res.text();
      return reply.send(body);
    } catch (err) {
      request.log.error({ err }, 'Auth proxy failed');
      return reply.code(502).send({ error: 'Auth service unavailable' });
    }
  });
}
