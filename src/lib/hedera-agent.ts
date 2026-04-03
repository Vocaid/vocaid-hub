import {
  HederaAIToolkit,
  coreTokenPlugin,
  coreConsensusPlugin,
  coreConsensusQueryPlugin,
  coreTokenQueryPlugin,
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

let _toolkit: HederaAIToolkit | null = null;

/**
 * Returns a singleton HederaAIToolkit with HTS + Consensus plugins loaded.
 * The agent operates in AUTONOMOUS mode (executes transactions directly).
 */
export function getHederaToolkit(): HederaAIToolkit {
  if (_toolkit) return _toolkit;

  const client = initClient();

  _toolkit = new HederaAIToolkit({
    // Cast needed: root @hashgraph/sdk and agent-kit's bundled version have duplicate private types
    client: client as unknown as ConstructorParameters<typeof HederaAIToolkit>[0]["client"],
    configuration: {
      context: {
        accountId: HEDERA_ACCOUNT_ID,
        mode: AgentMode.AUTONOMOUS,
      },
      plugins: [
        coreTokenPlugin,
        coreTokenQueryPlugin,
        coreConsensusPlugin,
        coreConsensusQueryPlugin,
      ],
    },
  });

  return _toolkit;
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
  params: Record<string, unknown>,
): Promise<unknown> {
  const toolkit = getHederaToolkit();
  const tool = (toolkit.tools as unknown as Record<string, (p: Record<string, unknown>) => unknown>)[method];
  if (!tool) throw new Error(`Unknown agent-kit method: ${method}`);
  return tool(params);
}
