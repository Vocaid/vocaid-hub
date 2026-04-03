import GPUProviderRegistryABI from '@/abi/GPUProviderRegistry.json';
import { verifyProvider } from '@/lib/og-compute';
import { ethers } from 'ethers';
import { NextRequest, NextResponse } from 'next/server';

const OG_RPC_URL =
  process.env.NEXT_PUBLIC_OG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';

const GPU_REGISTRY_ADDRESS = process.env.GPU_REGISTRY_ADDRESS;

/**
 * POST /api/gpu/register
 *
 * Body: { providerAddress, gpuModel, endpoint }
 *
 * 1. Verify the provider via 0G broker TEE attestation
 * 2. Call GPUProviderRegistry.registerProvider() on 0G Chain
 * 3. Return the minted ERC-8004 NFT token ID + tx hash
 */
export async function POST(req: NextRequest) {
  try {
    const { providerAddress, gpuModel, endpoint } = await req.json();

    if (!providerAddress || !gpuModel) {
      return NextResponse.json(
        { error: 'providerAddress and gpuModel are required' },
        { status: 400 },
      );
    }

    if (!GPU_REGISTRY_ADDRESS) {
      return NextResponse.json(
        { error: 'GPU_REGISTRY_ADDRESS not configured' },
        { status: 500 },
      );
    }

    const pk = process.env.OG_BROKER_PRIVATE_KEY;
    if (!pk) {
      return NextResponse.json(
        { error: 'Server wallet not configured' },
        { status: 500 },
      );
    }

    // 1. Verify TEE attestation via broker
    const verification = await verifyProvider(providerAddress);

    // Generate attestation hash from verification data
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

    // 2. Register on GPUProviderRegistry (ERC-8004)
    const provider = new ethers.JsonRpcProvider(OG_RPC_URL);
    const wallet = new ethers.Wallet(pk, provider);
    const registry = new ethers.Contract(
      GPU_REGISTRY_ADDRESS,
      GPUProviderRegistryABI,
      wallet,
    );

    const agentURI = endpoint ?? `https://0g-provider.${providerAddress.slice(2, 10)}.eth`;

    const tx = await registry.registerProvider(
      agentURI,
      gpuModel,
      attestationHash,
    );

    const receipt = await tx.wait();

    // Extract tokenId from ProviderRegistered event
    const event = receipt.logs.find(
      (log: ethers.Log) => {
        try {
          return registry.interface.parseLog({
            topics: [...log.topics],
            data: log.data,
          })?.name === 'ProviderRegistered';
        } catch {
          return false;
        }
      },
    );

    let tokenId = '0';
    if (event) {
      const parsed = registry.interface.parseLog({
        topics: [...event.topics],
        data: event.data,
      });
      tokenId = parsed?.args?.[1]?.toString() ?? '0';
    }

    return NextResponse.json({
      tokenId,
      txHash: receipt.hash,
      attestationHash,
      verified: verification.success,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    console.error('[api/gpu/register]', message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
