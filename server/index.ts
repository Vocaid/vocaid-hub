import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  },
}).withTypeProvider<ZodTypeProvider>();

// Zod validation
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// CORS
await app.register(cors, { origin: true, credentials: true });

// Cookie parsing (for NextAuth JWT)
await app.register(cookie);

// Plugins (Wave 2)
import authPlugin from './plugins/auth.js';
import worldIdGatePlugin from './plugins/world-id-gate.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import x402Plugin from './plugins/x402.js';
import responseCachePlugin from './plugins/response-cache.js';
import securityHeadersPlugin from './plugins/security-headers.js';

await app.register(errorHandlerPlugin);
await app.register(authPlugin);
await app.register(worldIdGatePlugin);
await app.register(rateLimitPlugin);
await app.register(x402Plugin);
await app.register(responseCachePlugin);
await app.register(securityHeadersPlugin);

// Health check
app.get('/health', async () => ({
  status: 'ok',
  wasm: true,
  port: process.env.BACKEND_PORT ?? 5001,
  uptime: process.uptime(),
  plugins: ['auth', 'world-id-gate', 'rate-limit', 'error-handler', 'x402', 'response-cache', 'security-headers'],
}));

// Wave 3A: World ID + Auth routes
import worldIdRoutes from './routes/world-id.js';
import authRoutes from './routes/auth.js';

await app.register(worldIdRoutes, { prefix: '/api' });
await app.register(authRoutes, { prefix: '/api' });

// Wave 3B: Chain Interaction routes
import predictionRoutes from './routes/predictions.js';
import gpuRoutes from './routes/gpu.js';
import edgeRoutes from './routes/edge.js';
import seerRoutes from './routes/seer.js';
import reputationRoutes from './routes/reputation.js';

await app.register(predictionRoutes, { prefix: '/api' });
await app.register(gpuRoutes, { prefix: '/api' });
await app.register(edgeRoutes, { prefix: '/api' });
await app.register(seerRoutes, { prefix: '/api' });
await app.register(reputationRoutes, { prefix: '/api' });

// Wave 3C: Agent + Payment + Discovery routes
import agentRoutes from './routes/agents.js';
import paymentRoutes from './routes/payments.js';
import resourceRoutes from './routes/resources.js';
import activityRoutes from './routes/activity.js';
import hederaRoutes from './routes/hedera.js';
import proposalRoutes from './routes/proposals.js';
import agentDecisionRoutes from './routes/agent-decision.js';
import wellKnownRoutes from './routes/well-known.js';

await app.register(agentRoutes, { prefix: '/api' });
await app.register(paymentRoutes, { prefix: '/api' });
await app.register(resourceRoutes, { prefix: '/api' });
await app.register(activityRoutes, { prefix: '/api' });
await app.register(hederaRoutes, { prefix: '/api' });
await app.register(proposalRoutes, { prefix: '/api' });
await app.register(agentDecisionRoutes, { prefix: '/api' });
await app.register(wellKnownRoutes);

// Graceful shutdown
const shutdownSignals = ['SIGTERM', 'SIGINT'] as const;
for (const signal of shutdownSignals) {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  });
}

// Start server after WASM initialization
async function start() {
  const PORT = Number(process.env.BACKEND_PORT ?? 5001);

  app.log.info('Initializing World ID WASM...');
  try {
    const { IDKit } = await import('@worldcoin/idkit');
    await IDKit.initServer();
    app.log.info('WASM initialized successfully');
  } catch (err) {
    app.log.warn({ err }, 'WASM init failed (non-fatal for non-World-ID routes)');
  }

  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`Fastify backend ready at http://localhost:${PORT}`);
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
