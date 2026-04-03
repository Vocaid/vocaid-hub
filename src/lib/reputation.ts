import { keccak256, toBytes } from "viem";
import { addresses, REPUTATION_REGISTRY_ABI } from "./contracts";
import { getPublicClient, getWalletClient, getReputationSummary } from "./og-chain";

/**
 * ERC-8004 Reputation Registry helpers.
 * Used by Agent 11 (Lens agent) to write feedback and by UI to read scores.
 */

export type ReputationTag = "starred" | "uptime" | "successRate" | "responseTime";

export interface ReputationScore {
  agentId: string;
  tag: ReputationTag;
  count: number;
  averageValue: number;
  decimals: number;
}

export async function giveFeedback(params: {
  agentId: bigint;
  value: number;
  decimals?: number;
  tag1: ReputationTag;
  tag2?: string;
  endpoint?: string;
  feedbackURI?: string;
}) {
  const {
    agentId,
    value,
    decimals = 2,
    tag1,
    tag2 = "",
    endpoint = "",
    feedbackURI = "",
  } = params;

  const feedbackHash = keccak256(
    toBytes(`${agentId}-${tag1}-${value}-${Date.now()}`),
  );

  const wallet = getWalletClient();
  const txHash = await wallet.writeContract({
    address: addresses.reputationRegistry(),
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "giveFeedback",
    args: [
      agentId,
      BigInt(Math.round(value * 10 ** decimals)),
      decimals,
      tag1,
      tag2,
      endpoint,
      feedbackURI,
      feedbackHash,
    ],
  });

  const client = getPublicClient();
  await client.waitForTransactionReceipt({ hash: txHash });
  return { txHash, feedbackHash };
}

export async function getReputation(
  agentId: bigint,
  tag: ReputationTag | "" = "",
): Promise<ReputationScore> {
  const { count, summaryValue, decimals } = await getReputationSummary(
    agentId,
    tag,
    "",
  );

  return {
    agentId: agentId.toString(),
    tag: (tag || "starred") as ReputationTag,
    count: Number(count),
    averageValue: Number(summaryValue) / 10 ** decimals,
    decimals,
  };
}

export async function getAllReputationScores(agentId: bigint): Promise<ReputationScore[]> {
  const tags: ReputationTag[] = ["starred", "uptime", "successRate", "responseTime"];
  const results = await Promise.allSettled(
    tags.map((tag) => getReputation(agentId, tag)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<ReputationScore> => r.status === "fulfilled")
    .map((r) => r.value);
}
