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

// Health check
app.get('/health', async () => ({
  status: 'ok',
  wasm: true,
  port: process.env.BACKEND_PORT ?? 5001,
  uptime: process.uptime(),
}));

// Route imports (added in Wave 3)
// await app.register(worldIdRoutes, { prefix: '/api' });

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
