import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { InitiatePaymentSchema, PaymentBodySchema } from '../schemas/payments.js';
import { verifyPayment, settlePayment } from '@/lib/blocky402';
import { logAuditMessage } from '@/lib/hedera';
import { executeAgentAction } from '@/lib/hedera-agent';
import { giveFeedback } from '@/lib/reputation';
import { readPayments, addPayment } from '@/lib/payment-ledger';
import { isVerifiedOnChain } from '@/lib/world-id';

const USDC_TOKEN_ID = process.env.HEDERA_USDC_TOKEN ?? '0.0.429274';
const AUDIT_TOPIC_ID = process.env.HEDERA_AUDIT_TOPIC ?? '';
const BLOCKY402_URL = process.env.BLOCKY402_URL ?? 'https://api.testnet.blocky402.com';

function getDefaultPrice(resourceType?: string): string {
  switch (resourceType) {
    case 'gpu': return '0.05';
    case 'agent': return '0.02';
    case 'human': return '25.00';
    default: return '0.01';
  }
}

const paymentRoutes: FastifyPluginAsync = async (app) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/payments — List recent payments
  typed.get('/payments', async () => {
    return { payments: readPayments() };
  });

  // POST /api/payments — x402 USDC payment via Blocky402
  typed.post('/payments', {
    schema: { body: PaymentBodySchema },
  }, async (request, reply) => {
    // World ID gate (inline check — uses session from auth plugin if available)
    const session = (request as unknown as Record<string, unknown>).session as { user?: { id?: string; walletAddress?: string } } | undefined;
    if (session?.user?.walletAddress) {
      const verified = await isVerifiedOnChain(session.user.walletAddress as `0x${string}`);
      if (!verified) {
        return reply.status(403).send({ error: 'World ID verification required' });
      }
    }

    const paymentHeader = request.headers['x-payment'] as string | undefined;

    if (!paymentHeader) {
      return reply.status(402).header('X-PAYMENT-REQUIRED', JSON.stringify({
        network: 'hedera-testnet',
        token: USDC_TOKEN_ID,
        amount: '0.01',
        facilitator: BLOCKY402_URL,
      })).send({
        error: 'Payment Required',
        accepts: {
          network: 'hedera-testnet',
          token: USDC_TOKEN_ID,
          facilitator: BLOCKY402_URL,
        },
      });
    }

    try {
      const body = request.body as { resourceName?: string } | undefined;

      // Step 1: Verify the payment with Blocky402
      const verification = await verifyPayment(paymentHeader);
      if (!verification.valid) {
        return reply.status(402).send({ error: 'Payment verification failed' });
      }

      // Step 2: Settle the payment on-chain
      const settlement = await settlePayment(paymentHeader);

      // Step 3: Log to HCS audit trail via Hedera Agent Kit
      if (AUDIT_TOPIC_ID) {
        const auditPayload = JSON.stringify({
          type: 'agent_payment_settled',
          payer: verification.payer,
          amount: verification.amount,
          token: verification.token,
          txHash: settlement.txHash,
          timestamp: new Date().toISOString(),
        });

        executeAgentAction('submit_topic_message', {
          topicId: AUDIT_TOPIC_ID,
          message: auditPayload,
        }).catch((agentErr) => {
          request.log.error(agentErr, 'Agent Kit audit failed, using direct SDK');
          logAuditMessage(AUDIT_TOPIC_ID, auditPayload).catch((e) => request.log.error(e));
        });
      }

      // Step 4: Record in persistent ledger
      addPayment({
        id: crypto.randomUUID(),
        payer: verification.payer,
        amount: verification.amount,
        resource: body?.resourceName ?? 'unknown',
        txHash: settlement.txHash,
        network: verification.network,
        settledAt: new Date().toISOString(),
      });

      // Step 5: Lens agent reputation feedback
      try {
        const feedbackResult = await giveFeedback({
          agentId: 0n,
          value: 95,
          tag1: 'starred',
          tag2: 'payment-verified',
          endpoint: '/api/payments',
          feedbackURI: `hedera:${settlement.txHash}`,
        });

        if (AUDIT_TOPIC_ID) {
          logAuditMessage(AUDIT_TOPIC_ID, JSON.stringify({
            type: 'agent_feedback_submitted',
            agent: 'lens',
            action: 'giveFeedback',
            feedbackTxHash: feedbackResult.txHash,
            paymentTxHash: settlement.txHash,
            timestamp: new Date().toISOString(),
          })).catch((e) => request.log.error(e));
        }
      } catch (feedbackErr) {
        request.log.error(feedbackErr, 'Lens agent feedback failed');
      }

      return {
        success: true,
        payment: {
          settled: settlement.settled,
          txHash: settlement.txHash,
          payer: verification.payer,
          amount: verification.amount,
          network: verification.network,
        },
        resource: { message: 'Payment received. Access granted.' },
      };
    } catch (err) {
      request.log.error(err, 'Payment processing error');
      return reply.status(500).send({ error: 'Payment processing failed' });
    }
  });

  // POST /api/initiate-payment — Start x402 payment flow
  typed.post('/initiate-payment', {
    schema: { body: InitiatePaymentSchema },
  }, async (request) => {
    const { resourceName, resourceType, amount } = request.body;
    const paymentAmount = amount ?? getDefaultPrice(resourceType);
    const paymentId = crypto.randomUUID();

    return {
      paymentId,
      requirements: {
        network: 'hedera-testnet',
        token: USDC_TOKEN_ID,
        amount: paymentAmount,
        facilitator: BLOCKY402_URL,
        feePayer: '0.0.7162784',
      },
      resource: { name: resourceName, type: resourceType },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  });
};

export default paymentRoutes;
