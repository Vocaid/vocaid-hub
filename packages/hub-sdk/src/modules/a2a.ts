import { HubConnectionError } from "../errors.js";
import type { AgentCard, AgentCapability, AgentSkill } from "../types/index.js";
import type { SharedConfig } from "./shared.js";

interface CreateAgentCardInput {
  name: string;
  description: string;
  url: string;
  skills: Array<{ id: string; name: string; description: string; tags?: string[] }>;
  capabilities?: Partial<AgentCapability>;
  authentication?: AgentCard["authentication"];
}

const HUB_SKILLS: AgentSkill[] = [
  {
    id: "hiring-signals",
    name: "Hiring Signals",
    description: "Get BULLISH/NEUTRAL/BEARISH hiring market signals by domain",
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    tags: ["hiring", "signals", "market"],
  },
  {
    id: "prediction-markets",
    name: "Prediction Markets",
    description: "Trade binary prediction markets on hiring outcomes",
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    tags: ["prediction", "trading", "markets"],
  },
  {
    id: "agent-marketplace",
    name: "Agent Marketplace",
    description: "Discover and hire third-party agents for hiring tasks",
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    tags: ["marketplace", "agents", "services"],
  },
  {
    id: "inference",
    name: "Inference",
    description: "Model-agnostic LLM inference routed through multi-provider backend",
    inputModes: ["application/json"],
    outputModes: ["application/json"],
    tags: ["inference", "llm", "ai"],
  },
];

export class A2AModule {
  private readonly config: SharedConfig;

  constructor(config: SharedConfig) {
    this.config = config;
  }

  createAgentCard(input: CreateAgentCardInput): AgentCard {
    return {
      name: input.name,
      description: input.description,
      url: input.url,
      version: "0.1.0",
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
        ...input.capabilities,
      },
      skills: input.skills.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        inputModes: ["application/json"],
        outputModes: ["application/json"],
        tags: s.tags,
      })),
      defaultInputModes: ["application/json"],
      defaultOutputModes: ["application/json"],
      authentication: input.authentication,
    };
  }

  getHubAgentCard(): AgentCard {
    return {
      name: "vocaid-hub",
      description: "Vocaid Hub — hiring signal gateway, prediction markets, and agent marketplace",
      url: this.config.hubUrl,
      version: "0.1.0",
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      skills: HUB_SKILLS,
      defaultInputModes: ["application/json"],
      defaultOutputModes: ["application/json"],
      authentication: {
        schemes: ["bearer"],
        credentials: "erc8004",
      },
      provider: {
        organization: "Vocaid",
        url: "https://vocaid.ai",
      },
    };
  }

  async discoverAgent(baseUrl: string): Promise<AgentCard> {
    const url = `${baseUrl.replace(/\/$/, "")}/.well-known/agent.json`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new HubConnectionError(
        `Agent discovery failed: ${response.status} ${response.statusText} at ${url}`,
      );
    }

    return (await response.json()) as AgentCard;
  }
}
