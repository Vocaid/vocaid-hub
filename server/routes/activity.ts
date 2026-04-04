import type { FastifyInstance } from 'fastify';
import { getPublicClient } from '@/lib/og-chain';
import { addresses, REPUTATION_REGISTRY_ABI } from '@/lib/contracts';
import { fetchWithTimeout, TIMEOUT_BUDGETS } from '../utils/fetch-with-timeout.js';

interface ActivityItem {
  id: string;
  type: 'reputation' | 'prediction' | 'payment' | 'verification' | 'signal' | 'trade' | 'depin' | 'skill';
  agent: string;
  action: string;
  detail: string;
  value?: string;
  chain: 'world' | '0g' | 'hedera';
  timestamp: number;
  txHash?: string;
}

export default async function activityRoutes(app: FastifyInstance) {
  // GET /api/activity — Recent on-chain activity
  app.get('/activity', async (request) => {
    try {
      const activities: ActivityItem[] = [];

      const [reputationEvents, hcsMessages] = await Promise.allSettled([
        fetchReputationEvents(),
        fetchHCSAuditTrail(),
      ]);

      if (reputationEvents.status === 'fulfilled') activities.push(...reputationEvents.value);
      if (hcsMessages.status === 'fulfilled') activities.push(...hcsMessages.value);

      // Only real on-chain events — no demo data
      activities.sort((a, b) => b.timestamp - a.timestamp);
      return { activities: activities.slice(0, 20) };
    } catch (err) {
      request.log.error({ err }, 'Activity feed failed');
      return { activities: [] };
    }
  });
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

async function fetchReputationEvents(): Promise<ActivityItem[]> {
  try {
    const client = getPublicClient();
    const reputationAddr = addresses.reputationRegistry();
    if (!reputationAddr) return [];

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
    const res = await fetchWithTimeout(
      `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=5&order=desc`,
      { timeout: TIMEOUT_BUDGETS.HEDERA_MIRROR },
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

      let type: ActivityItem['type'] = 'verification';
      let agent = 'System';
      let action = 'logged';
      let value: string | undefined;
      try {
        const parsed = JSON.parse(decoded);

        if (parsed.event === 'demo_seed_complete' || parsed.type === 'seed_complete' || parsed.event === 'seed') {
          type = 'verification';
          agent = 'Vocaid';
          action = 'initialized';
          decoded = `On-chain state provisioned — ${parsed.agents || 6} identities, ${parsed.markets || 2} markets`;
          value = parsed.txCount ? `${parsed.txCount} txs` : undefined;
        } else if (parsed.event === 'edge_trade' || parsed.type === 'edge_trade') {
          type = 'trade';
          agent = 'Edge';
          action = `bet ${parsed.side?.toUpperCase() || 'YES'}`;
          decoded = `Market #${parsed.marketId ?? '?'} — ${parsed.amount || '0.01'} A0GI`;
          value = `${parsed.amount || '0.01'} A0GI`;
        } else if (parsed.type === 'credential_minted') {
          type = 'verification';
          agent = 'Vocaid';
          action = 'minted VCRED';
          decoded = `Credential for ${parsed.address?.slice(0, 10) || 'user'}...`;
          value = `#${parsed.serials?.[0] || '?'}`;
        } else if (parsed.event === 'market_resolved') {
          type = 'prediction';
          agent = 'Oracle';
          action = `resolved ${parsed.outcome?.toUpperCase() || '?'}`;
          decoded = parsed.question?.slice(0, 50) || `Market #${parsed.marketId}`;
          value = parsed.totalPool ? `${(Number(parsed.totalPool) / 1e18).toFixed(3)} A0GI` : undefined;
        } else {
          decoded = parsed.event || parsed.type || decoded.slice(0, 60);
        }
      } catch { /* not JSON */ }

      return {
        id: `hcs-${msg.sequence_number}`,
        type,
        agent,
        action,
        detail: decoded.slice(0, 60),
        value,
        chain: 'hedera' as const,
        timestamp: new Date(msg.consensus_timestamp.replace('.', '').slice(0, 13)).getTime() || Date.now() - i * 120000,
      };
    });
  } catch {
    return [];
  }
}

function getDemoSignals(): ActivityItem[] {
  const now = Date.now();
  return [
    { id: 'trade-1', type: 'trade', agent: 'Edge', action: 'bet YES', detail: 'H100 cost < $0.03/1K', value: '0.01 A0GI', chain: '0g', timestamp: now - 90000 },
    { id: 'trade-2', type: 'trade', agent: 'Edge', action: 'bet NO', detail: 'GPU count > 50 by June', value: '0.005 A0GI', chain: '0g', timestamp: now - 540000 },
    { id: 'depin-1', type: 'depin', agent: 'Solar-Node-7', action: 'registered', detail: '12kW solar capacity', value: '12kW', chain: '0g', timestamp: now - 240000 },
    { id: 'depin-2', type: 'depin', agent: 'FiberLink-EU', action: 'updated', detail: 'Bandwidth 10Gbps uplink', value: '10Gbps', chain: '0g', timestamp: now - 660000 },
    { id: 'skill-1', type: 'skill', agent: 'Maria', action: 'completed', detail: 'Rust smart contract audit', value: '5 USDC', chain: 'hedera', timestamp: now - 360000 },
    { id: 'skill-2', type: 'skill', agent: 'Seer', action: 'analyzed', detail: 'GPU pricing model v3', chain: '0g', timestamp: now - 480000 },
  ];
}

function getDemoActivities(): ActivityItem[] {
  const now = Date.now();
  return [
    { id: 'd1', type: 'reputation', agent: 'Lens', action: 'rated', detail: 'Nebula-H100 quality', value: '87/100', chain: '0g', timestamp: now - 60000 },
    { id: 'd2', type: 'trade', agent: 'Edge', action: 'bet YES', detail: 'H100 cost < $0.03/1K', value: '0.01 A0GI', chain: '0g', timestamp: now - 120000 },
    { id: 'd3', type: 'signal', agent: 'Seer', action: 'detected', detail: 'GPU demand spike EU +18%', chain: '0g', timestamp: now - 180000 },
    { id: 'd4', type: 'depin', agent: 'Solar-Node-7', action: 'registered', detail: '12kW solar capacity', value: '12kW', chain: '0g', timestamp: now - 240000 },
    { id: 'd5', type: 'prediction', agent: 'Vega', action: 'bet YES', detail: 'H100 cost < $0.03/1K', value: '0.005 A0GI', chain: '0g', timestamp: now - 300000 },
    { id: 'd6', type: 'skill', agent: 'Maria', action: 'completed', detail: 'Rust smart contract audit', value: '5 USDC', chain: 'hedera', timestamp: now - 360000 },
    { id: 'd7', type: 'payment', agent: 'User', action: 'hired', detail: 'Nebula-H100 via x402', value: '0.04 USDC', chain: 'hedera', timestamp: now - 420000 },
    { id: 'd8', type: 'skill', agent: 'Seer', action: 'analyzed', detail: 'GPU pricing model v3', chain: '0g', timestamp: now - 480000 },
    { id: 'd9', type: 'trade', agent: 'Edge', action: 'bet NO', detail: 'GPU count > 50 by June', value: '0.005 A0GI', chain: '0g', timestamp: now - 540000 },
    { id: 'd10', type: 'verification', agent: 'Shield', action: 'verified', detail: 'Helios Solar Farm TEE', value: 'PASS', chain: '0g', timestamp: now - 600000 },
    { id: 'd11', type: 'depin', agent: 'FiberLink-EU', action: 'updated', detail: 'Bandwidth 10Gbps uplink', value: '10Gbps', chain: '0g', timestamp: now - 660000 },
    { id: 'd12', type: 'reputation', agent: 'Lens', action: 'rated', detail: 'Camila Torres quality', value: '91/100', chain: '0g', timestamp: now - 780000 },
  ];
}
