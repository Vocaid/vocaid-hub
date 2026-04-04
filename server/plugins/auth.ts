import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';

interface SessionUser {
  id: string;
  walletAddress?: string;
  username?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    session: { user: SessionUser | null };
  }
}

/**
 * Auth plugin — decodes NextAuth JWT from cookie or Authorization header.
 * Decorates request.session with { user } or { user: null }.
 */
async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('session', { user: null });

  app.addHook('onRequest', async (request: FastifyRequest) => {
    const token =
      request.cookies?.['next-auth.session-token'] ??
      request.cookies?.['__Secure-next-auth.session-token'] ??
      extractBearerToken(request.headers.authorization);

    if (!token) {
      request.session = { user: null };
      return;
    }

    try {
      const { decode } = await import('next-auth/jwt');
      const decoded = await decode({
        token,
        secret: process.env.NEXTAUTH_SECRET!,
        salt: 'next-auth.session-token',
      });

      if (decoded) {
        request.session = {
          user: {
            id: (decoded.sub ?? decoded.id ?? '') as string,
            walletAddress: (decoded.walletAddress ?? decoded.sub ?? '') as string,
            username: (decoded.name ?? '') as string,
          },
        };
      } else {
        request.session = { user: null };
      }
    } catch {
      request.session = { user: null };
    }
  });
}

function extractBearerToken(header?: string): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7);
}

export default fp(authPlugin, { name: 'auth' });
