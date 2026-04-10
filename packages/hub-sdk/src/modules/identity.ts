import type { SupportedChain } from "../types/index.js";
import type { SharedConfig } from "./shared.js";

interface RegistrationInput {
  name: string;
  description: string;
  capabilities: string[];
  chain: SupportedChain;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface RegistrationMetadata {
  name: string;
  description: string;
  capabilities: string[];
  owner: string;
  registeredAt: string;
  version: string;
}

interface MetadataInput {
  name: string;
  description: string;
  capabilities: string[];
  owner: string;
}

export class IdentityModule {
  private readonly config: SharedConfig;

  constructor(config: SharedConfig) {
    this.config = config;
  }

  validateRegistration(input: RegistrationInput): ValidationResult {
    const errors: string[] = [];

    if (!input.name || input.name.trim() === "") {
      errors.push("name is required");
    }

    if (!input.capabilities || input.capabilities.length === 0) {
      errors.push("at least one capability is required");
    }

    if (!this.config.chains[input.chain]) {
      errors.push(`chain '${input.chain}' is not configured`);
    }

    return { valid: errors.length === 0, errors };
  }

  buildRegistrationMetadata(input: MetadataInput): RegistrationMetadata {
    return {
      name: input.name,
      description: input.description,
      capabilities: input.capabilities,
      owner: input.owner,
      registeredAt: new Date().toISOString(),
      version: "0.1.0",
    };
  }
}
