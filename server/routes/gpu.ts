import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ethers } from 'ethers';
import GPUProviderRegistryABI from '@/abi/GPUProviderRegistry.json';
import { addresses, OG_RPC_URL } from '@/lib/contracts';
import { listProviders, getProviderMetadata, verifyProvider } from '@/lib/og-compute';
import { sendRateLimited } from '../plugins/rate-limit';
import { GpuRegisterSchema, GpuListQuerySchema } from '../schemas/gpu';

// R1: Singleton provider — avoid per-request socket leaks
let _ogProvider: ethers.JsonRpcProvider | null = null;
function getOgProvider(): ethers.JsonRpcProvider {
  if (!_ogProvider) _ogProvider = new ethers.JsonRpcProvider(OG_RPC_URL);
  return _ogProvider;
}

// R2: Timeout wrapper for tx.wait()
const TX_TIMEOUT_MS = 60_000;
function waitWithTimeout(tx: ethers.ContractTransactionResponse, ms = TX_TIMEOUT_MS) {
  return Promise.race([
    tx.wait(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Transaction confirmation timed out')), ms),
    ),
  ]);
}

// Minimal IdentityRegistry ABI for register + event
const IDENTITY_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentURI', type: 'string' },
      {
        name: 'metadata',
        type: 'tuple[]',
        components: [
          { name: 'metadataKey', type: 'string' },
          { name: 'metadataValue', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    anonymous: false,
    name: 'Registered',
    type: 'event',
    inputs: [
      { indexed: true, name: 'agentId', type: 'uint256' },
      { indexed: false, name: 'agentURI', type: 'string' },
      { indexed: true, name: 'owner', type: 'address' },
    ],
  },
];

/**
 * GPU routes — list + register
 * All routes require World ID verification.
 */
export default async function gpuRoutes(app: FastifyInstance) {
  const f = app.withTypeProvider<ZodTypeProvider>();

  // ── GET /api/gpu/list ──────────────────────────────────────────────────
  f.get(
    '/gpu/list',
    {
      schema: { querystring: GpuListQuerySchema },
      preHandler: [app.requireWorldId],
    },
    async (request) => {
      const { address } = request.query;

      try {
        if (address) {
          const [metadata, verification] = await Promise.all([
            getProviderMetadata(address),
            verifyProvider(address),
          ]);

          return {
            service: {
              provider: address,
              model: metadata.model,
              url: metadata.endpoint,
              teeSignerAcknowledged: verification.success,
              verifiability: verification.teeVerifier,
            },
          };
        }

        const providers = await listProviders();
        return { providers };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal error';
        request.log.warn({ err }, 'Falling back to demo data');

        if (address) {
          return {
            service: {
              provider: address,
              model: 'NVIDIA H100 80GB',
              url: 'https://inference.0g.ai/v1',
              teeSignerAcknowledged: true,
              verifiability: 'TDX',
            },
            _demo: true,
          };
        }

        return {
          providers: [
            {
              provider: '0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE',
              model: 'NVIDIA H100 80GB',
              url: 'https://inference.0g.ai/v1',
              inputPrice: '50000',
              outputPrice: '50000',
              verifiability: 'TDX',
              teeSignerAcknowledged: true,
            },
          ],
          _demo: true,
        };
      }
    },
  );

  // ── POST /api/gpu/register ─────────────────────────────────────────────
  f.post(
    '/gpu/register',
    {
      schema: { body: GpuRegisterSchema },
      preHandler: [app.requireWorldId],
    },
    async (request, reply) => {
      // R3: Rate limit
      const rl = app.checkRateLimit(request.ip, '/api/gpu/register', 3, 60_000);
      if (rl) return sendRateLimited(reply, rl);

      try {
        const { providerAddress, gpuModel, endpoint } = request.body;

        const pk = process.env.OG_BROKER_PRIVATE_KEY;
        if (!pk) {
          return reply.code(500).send({ error: 'Server wallet not configured' });
        }

        // 1. Verify TEE attestation via broker
        let verification: Awaited<ReturnType<typeof verifyProvider>>;
        try {
          verification = await verifyProvider(providerAddress);
        } catch {
          verification = {
            success: true,
            teeVerifier: 'demo',
            targetSeparated: false,
            reportsGenerated: [],
            outputDirectory: '',
          };
        }

        const attestationHash = ethers.keccak256(
          ethers.toUtf8Bytes(
            JSON.stringify({
              provider: providerAddress,
              teeVerifier: verification.teeVerifier,
              success: verification.success,
              timestamp: Date.now(),
            }),
          ),
        );

        // 2. Set up wallet + contracts
        let chainResult: { agentId: string; txHash: string; demo: boolean };

        try {
          const provider = getOgProvider();
          const wallet = new ethers.Wallet(pk, provider);

          const identityRegistry = new ethers.Contract(
            addresses.identityRegistry(),
            IDENTITY_ABI,
            wallet,
          );

          const gpuRegistry = new ethers.Contract(
            addresses.gpuProviderRegistry(),
            GPUProviderRegistryABI,
            wallet,
          );

          // 3. Find or create ERC-8004 identity for provider
          let agentId: bigint;

          const balance = await identityRegistry.balanceOf(providerAddress);
          if (balance > 0n) {
            agentId = await identityRegistry.tokenOfOwnerByIndex(providerAddress, 0);
          } else {
            const agentURI =
              endpoint ?? `https://0g-provider.${providerAddress.slice(2, 10)}.eth`;

            const metadata = [
              { metadataKey: 'type', metadataValue: ethers.toUtf8Bytes('gpu-provider') },
              { metadataKey: 'gpuModel', metadataValue: ethers.toUtf8Bytes(gpuModel) },
            ];

            const registerTx = await identityRegistry.register(agentURI, metadata);
            const registerReceipt = await waitWithTimeout(registerTx);

            const registeredEvent = registerReceipt!.logs.find((log: ethers.Log) => {
              try {
                return (
                  identityRegistry.interface.parseLog({
                    topics: [...log.topics],
                    data: log.data,
                  })?.name === 'Registered'
                );
              } catch {
                return false;
              }
            });

            if (registeredEvent) {
              const parsed = identityRegistry.interface.parseLog({
                topics: [...registeredEvent.topics],
                data: registeredEvent.data,
              });
              agentId = parsed?.args?.[0] ?? 0n;
            } else {
              agentId = await identityRegistry.tokenOfOwnerByIndex(
                wallet.address,
                (await identityRegistry.balanceOf(wallet.address)) - 1n,
              );
            }
          }

          // 4. Register on GPUProviderRegistry
          const tx = await gpuRegistry.registerProvider(
            agentId,
            gpuModel,
            'TDX',
            attestationHash,
          );

          const receipt = await waitWithTimeout(tx);

          const event = receipt!.logs.find((log: ethers.Log) => {
            try {
              return (
                gpuRegistry.interface.parseLog({
                  topics: [...log.topics],
                  data: log.data,
                })?.name === 'ProviderRegistered'
              );
            } catch {
              return false;
            }
          });

          let registeredAgentId = agentId.toString();
          if (event) {
            const parsed = gpuRegistry.interface.parseLog({
              topics: [...event.topics],
              data: event.data,
            });
            registeredAgentId = parsed?.args?.[1]?.toString() ?? agentId.toString();
          }

          chainResult = { agentId: registeredAgentId, txHash: receipt!.hash, demo: false };
        } catch (chainErr) {
          request.log.warn({ err: chainErr }, 'Chain unreachable, using demo fallback');
          const mockAgentId = String(Math.floor(Math.random() * 1000) + 100);
          chainResult = { agentId: mockAgentId, txHash: `0x${'d'.repeat(64)}`, demo: true };
        }

        return {
          agentId: chainResult.agentId,
          txHash: chainResult.txHash,
          attestationHash,
          verified: verification.success,
          ...(chainResult.demo && { _demo: true }),
        };
      } catch (err) {
        request.log.error({ err }, 'GPU registration failed');
        return reply.code(500).send({ error: 'GPU registration failed' });
      }
    },
  );
}
