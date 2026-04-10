/**
 * A2A Agent Card — per Google's Agent-to-Agent protocol spec.
 * @see https://a2a-protocol.org/latest/specification/#agent-card
 */
export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: AgentCapability;
  skills: AgentSkill[];
  defaultInputModes: string[];
  defaultOutputModes: string[];
  authentication?: AgentAuthentication;
  documentationUrl?: string;
  provider?: AgentProvider;
}

export interface AgentCapability {
  streaming: boolean;
  pushNotifications: boolean;
  stateTransitionHistory: boolean;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  inputModes: string[];
  outputModes: string[];
  tags?: string[];
}

export interface AgentAuthentication {
  schemes: string[];
  credentials?: string;
}

export interface AgentProvider {
  organization: string;
  url?: string;
}
