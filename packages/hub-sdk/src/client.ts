import { HubConfigError } from "./errors.js";
import { A2AModule } from "./modules/a2a.js";
import { IdentityModule } from "./modules/identity.js";
import { VocaidModule } from "./modules/vocaid.js";
import type { HubClientOptions, ChainMap } from "./types/index.js";

const DEFAULT_HUB_URL = "https://vocaid-hub.vercel.app";

export class HubClient {
  readonly a2a: A2AModule;
  readonly identity: IdentityModule;
  readonly vocaid: VocaidModule;
  readonly hubUrl: string;
  readonly chains: ChainMap;

  constructor(options: HubClientOptions) {
    const apiKey =
      options.vocaidApiKey ||
      (typeof process !== "undefined" ? process.env?.VOCAID_API_KEY : undefined) ||
      "";

    if (!apiKey) {
      throw new HubConfigError(
        "No API key provided. Pass vocaidApiKey in options or set VOCAID_API_KEY env var.",
      );
    }
    if (!apiKey.startsWith("voc_")) {
      throw new HubConfigError("Invalid API key format. Keys must start with 'voc_'.");
    }

    this.hubUrl = options.hubUrl ?? DEFAULT_HUB_URL;
    this.chains = options.chains;

    const shared = { apiKey, hubUrl: this.hubUrl, chains: this.chains };

    this.a2a = new A2AModule(shared);
    this.identity = new IdentityModule(shared);
    this.vocaid = new VocaidModule(shared);
  }
}
