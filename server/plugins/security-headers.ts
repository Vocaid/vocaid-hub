import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

/**
 * Security headers plugin — helmet-style headers on every response.
 * Prevents clickjacking, MIME sniffing, and enforces HTTPS.
 */
async function securityHeadersPlugin(app: FastifyInstance) {
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '0');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  });
}

export default fp(securityHeadersPlugin, { name: 'security-headers' });
