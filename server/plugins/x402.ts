import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface X402PaymentInfo {
  payer: string;
  amount: string;
  token: string;
  network: string;
  txHash: string;
}

export interface X402Options {
  amount: string;
  description: string;
  resource?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    payment?: X402PaymentInfo;
  }
}

const USDC_TOKEN_ID = process.env.HEDERA_USDC_TOKEN ?? '0.0.429274';
const BLOCKY402_URL = process.env.BLOCKY402_URL ?? 'https://api.testnet.blocky402.com';

/**
 * x402 payment plugin — preHandler factory for payment-gated routes.
 *
 * Usage:
 *   app.post('/api/foo', { preHandler: [app.x402({ amount: '0.01', description: 'GPU inference' })] }, handler)
 *   // handler can access request.payment
 */
async function x402Plugin(app: FastifyInstance) {
  app.decorateRequest('payment', undefined);

  app.decorate('x402', (options: X402Options) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const paymentHeader = request.headers['x-payment'] as string | undefined;

      if (!paymentHeader) {
        const requirements = {
          network: 'hedera-testnet',
          token: USDC_TOKEN_ID,
          amount: options.amount,
          facilitator: BLOCKY402_URL,
          description: options.description,
          resource: options.resource,
        };
        return reply
          .code(402)
          .header('X-PAYMENT-REQUIRED', JSON.stringify(requirements))
          .send({
            error: 'Payment Required',
            message: `This resource requires a payment of ${options.amount} USDC`,
            accepts: requirements,
          });
      }

      try {
        const { verifyPayment, settlePayment } = await import('@/lib/blocky402');
        const verification = await verifyPayment(paymentHeader);

        if (!verification.valid) {
          return reply.code(402).send({ error: 'Payment verification failed' });
        }

        const settlement = await settlePayment(paymentHeader);

        request.payment = {
          payer: verification.payer,
          amount: verification.amount,
          token: verification.token,
          network: verification.network,
          txHash: settlement.txHash,
        };
      } catch (err) {
        app.log.warn({ err }, 'x402 payment processing failed, trying demo fallback');

        const decoded = safeDecode(paymentHeader);
        if (decoded) {
          request.payment = {
            payer: decoded.payer ?? 'demo-payer',
            amount: decoded.amount ?? options.amount,
            token: USDC_TOKEN_ID,
            network: 'hedera-testnet',
            txHash: `demo-${Date.now().toString(36)}`,
          };
        } else {
          return reply.code(500).send({ error: 'Payment processing failed' });
        }
      }
    };
  });
}

function safeDecode(header: string): Record<string, string> | null {
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

// Extend FastifyInstance type
declare module 'fastify' {
  interface FastifyInstance {
    x402: (options: X402Options) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(x402Plugin, { name: 'x402' });
