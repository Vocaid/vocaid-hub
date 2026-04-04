import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

/**
 * Error handler plugin — sanitizes error responses per P-080 pattern.
 * - ZodError → 400 with field-level details
 * - Fastify validation errors → 400
 * - Everything else → log server-side, return generic 500
 */
async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: Error & { statusCode?: number; validation?: unknown }, request: FastifyRequest, reply: FastifyReply) => {
    // Zod validation errors
    if (error instanceof ZodError) {
      const fields = error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return reply.code(400).send({
        error: 'Validation failed',
        fields,
      });
    }

    // Fastify built-in validation errors
    if (error.validation) {
      return reply.code(400).send({
        error: 'Invalid request',
        details: error.message,
      });
    }

    // Known HTTP errors (thrown by route handlers)
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: error.message,
      });
    }

    // Everything else — log full error, return generic message
    app.log.error({ err: error, url: request.url, method: request.method }, 'Unhandled error');
    return reply.code(500).send({
      error: 'Internal server error',
    });
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
