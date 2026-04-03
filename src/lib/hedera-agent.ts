import {
  HederaAgentAPI,
  coreTokenPlugin,
  coreConsensusPlugin,
  coreConsensusQueryPlugin,
  coreTokenQueryPlugin,
  type Context,
  type Plugin,
  AgentMode,
} from "@hashgraph/hedera-agent-kit";
import { initClient } from "./hedera";

// ---------------------------------------------------------------------------
// Hedera Agent Kit — AI/Agentic Payments track ($6k)
//
// Wraps the official @hashgraph/hedera-agent-kit so that AI agents can
// execute Hedera operations (HTS, HCS) via the Agent Kit framework.
// This is explicitly listed as a requirement for the AI/Agentic track.
// ---------------------------------------------------------------------------

const HEDERA_ACCOUNT_ID =
  process.env.HEDERA_OPERATOR_ID ?? process.env.HEDERA_ACCOUNT_ID ?? "0.0.8368570";

let _agent: HederaAgentAPI | null = null;

/**
 * Returns a singleton HederaAgentAPI with HTS + Consensus plugins loaded.
 * The agent operates in AUTONOMOUS mode (executes transactions directly).
 */
export function getHederaAgent(): HederaAgentAPI {
  if (_agent) return _agent;

  const client = initClient();

  const context: Context = {
    accountId: HEDERA_ACCOUNT_ID,
    mode: AgentMode.AUTONOMOUS,
  };

  const plugins: Plugin[] = [
    coreTokenPlugin,
    coreTokenQueryPlugin,
    coreConsensusPlugin,
    coreConsensusQueryPlugin,
  ];

  // Collect tools from all plugins
  const tools = plugins.flatMap((p) => p.tools);

  _agent = new HederaAgentAPI(client, context, tools);
  return _agent;
}

/**
 * Execute a named Hedera operation through the Agent Kit.
 * Method names come from plugin tool definitions, e.g.:
 *   - "submit_topic_message" (HCS)
 *   - "create_topic" (HCS)
 *   - "associate_token" (HTS)
 *   - "transfer_token" (HTS)
 *   - "mint_nft" (HTS)
 */
export async function executeAgentAction(
  method: string,
  params: unknown,
): Promise<string> {
  const agent = getHederaAgent();
  return agent.run(method, params);
}
