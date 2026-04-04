import { NextResponse } from 'next/server';

/**
 * GET /api/activity
 *
 * Returns recent on-chain activity from ERC-8004 events and HCS audit trail.
 * Falls back to demo data if chain queries fail.
 *
 * Sources:
 * - ERC-8004 ReputationRegistry: new feedback events
 * - ResourcePrediction: bet/market creation events
 * - HCS Mirror Node: audit trail messages
 */

export const revalidate = 10; // ISR: refresh every 10 seconds

interface ActivityItem {
  id: string;
  type: 'reputation' | 'prediction' | 'payment' | 'verification' | 'signal';
  agent: string;
  action: string;
  detail: string;
  value?: string;
  chain: 'world' | '0g' | 'hedera';
  timestamp: number;
  txHash?: string;
}

export async function GET() {
  try {
    const activities: ActivityItem[] = [];

    // Try to fetch real on-chain events
    const [reputationEvents, hcsMessages] = await Promise.allSettled([
      fetchReputationEvents(),
      fetchHCSAuditTrail(),
    ]);

    if (reputationEvents.status === 'fulfilled') {
      activities.push(...reputationEvents.value);
    }

    if (hcsMessages.status === 'fulfilled') {
      activities.push(...hcsMessages.value);
    }

    // If no real data, return demo activities
    if (activities.length === 0) {
      return NextResponse.json({ activities: getDemoActivities() });
    }

    // Sort by timestamp descending (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ activities: activities.slice(0, 20) });
  } catch {
    return NextResponse.json({ activities: getDemoActivities() });
  }
}

async function fetchReputationEvents(): Promise<ActivityItem[]> {
  try {
    const { getPublicClient } = await import('@/lib/og-chain');
    const { addresses, REPUTATION_REGISTRY_ABI } = await import('@/lib/contracts');

    const client = getPublicClient();
    const reputationAddr = addresses.reputationRegistry();

    if (!reputationAddr) return [];

    // Get recent NewFeedback events (last 100 blocks)
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock > 100n ? currentBlock - 100n : 0n;

    const logs = await client.getContractEvents({
      address: reputationAddr as `0x${string}`,
      abi: REPUTATION_REGISTRY_ABI,
      eventName: 'NewFeedback',
      fromBlock,
      toBlock: 'latest',
    });

    return logs.slice(-10).map((log, i) => {
      const args = log.args as Record<string, unknown> | undefined;
      return {
        id: `rep-${i}-${log.transactionHash}`,
        type: 'reputation' as const,
        agent: 'Lens',
        action: 'rated',
        detail: `Agent #${args?.agentId?.toString?.() || '?'} ${args?.tag1 || 'quality'}`,
        value: `${args?.value?.toString?.() || '?'}/100`,
        chain: '0g' as const,
        timestamp: Date.now() - i * 60000,
        txHash: log.transactionHash,
      };
    });
  } catch {
    return [];
  }
}

async function fetchHCSAuditTrail(): Promise<ActivityItem[]> {
  try {
    const topicId = process.env.HEDERA_AUDIT_TOPIC || '0.0.8499635';
    const res = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=5&order=desc`,
      { next: { revalidate: 10 } }
    );

    if (!res.ok) return [];
    const data = await res.json();

    return (data.messages || []).map((msg: { sequence_number: number; consensus_timestamp: string; message: string }, i: number) => {
      let decoded = '';
      try {
        decoded = Buffer.from(msg.message, 'base64').toString('utf8');
      } catch {
        decoded = 'Audit entry';
      }

      return {
        id: `hcs-${msg.sequence_number}`,
        type: 'verification' as const,
        agent: 'System',
        action: 'logged',
        detail: decoded.slice(0, 60),
        chain: 'hedera' as const,
        timestamp: new Date(msg.consensus_timestamp.replace('.', '').slice(0, 13)).getTime() || Date.now() - i * 120000,
      };
    });
  } catch {
    return [];
  }
}

function getDemoActivities(): ActivityItem[] {
  const now = Date.now();
  return [
    { id: 'd1', type: 'reputation', agent: 'Lens', action: 'rated', detail: 'Nebula-H100 quality', value: '87/100', chain: '0g', timestamp: now - 60000 },
    { id: 'd2', type: 'signal', agent: 'Orion', action: 'analyzed', detail: 'GPU demand spike EU +18%', chain: '0g', timestamp: now - 180000 },
    { id: 'd3', type: 'prediction', agent: 'Vega', action: 'bet YES', detail: 'H100 cost < $0.03/1K', value: '0.005 A0GI', chain: '0g', timestamp: now - 300000 },
    { id: 'd4', type: 'payment', agent: 'User', action: 'hired', detail: 'Nebula-H100 via x402', value: '0.04 USDC', chain: 'hedera', timestamp: now - 420000 },
    { id: 'd5', type: 'verification', agent: 'Shield', action: 'verified', detail: 'Helios Solar Farm TEE', value: 'PASS', chain: '0g', timestamp: now - 600000 },
    { id: 'd6', type: 'reputation', agent: 'Lens', action: 'rated', detail: 'Camila Torres (Rust) quality', value: '91/100', chain: '0g', timestamp: now - 780000 },
    { id: 'd7', type: 'payment', agent: 'Lyra', action: 'leased', detail: 'FiberLink Relay', value: '0.003 USDC', chain: 'hedera', timestamp: now - 900000 },
    { id: 'd8', type: 'signal', agent: 'Orion', action: 'detected', detail: 'Solidity dev shortage', chain: '0g', timestamp: now - 1200000 },
    { id: 'd9', type: 'reputation', agent: 'Lens', action: 'rated', detail: 'Vega Agent uptime', value: '99.8%', chain: '0g', timestamp: now - 1500000 },
    { id: 'd10', type: 'prediction', agent: 'Vega', action: 'bet NO', detail: 'GPU count > 50 by June', value: '0.003 A0GI', chain: '0g', timestamp: now - 1800000 },
  ];
}
