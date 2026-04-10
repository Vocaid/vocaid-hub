import { HubConnectionError } from "../errors.js";
import type { SharedConfig } from "./shared.js";

export interface InferenceProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  type: "litellm" | "openrouter" | "together" | "replicate" | "ritual" | "custom";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  verified?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  verified: boolean;
}

export interface EmbedResponse {
  embedding: number[];
  model: string;
  provider: string;
}

export interface CostEstimate {
  model: string;
  provider: string;
  estimatedCost: string;
  currency: string;
}

const DEFAULT_MODELS: Record<string, string> = {
  litellm: "llama-3-70b",
  openrouter: "openai/gpt-4o",
  together: "meta-llama/Llama-3-70b-chat-hf",
  replicate: "meta/llama-3-70b-instruct",
  ritual: "llama-3-70b",
  custom: "default",
};

export class InferenceModule {
  private providers: InferenceProvider[] = [];

  constructor(_config: SharedConfig) {}

  addProvider(provider: InferenceProvider): void {
    this.providers.push(provider);
  }

  getProviders(): InferenceProvider[] {
    return [...this.providers];
  }

  private selectProvider(options?: ChatOptions): InferenceProvider {
    if (this.providers.length === 0) {
      throw new HubConnectionError("No inference providers configured. Call addProvider() first.");
    }

    if (options?.verified) {
      const ritual = this.providers.find((p) => p.type === "ritual");
      if (ritual) return ritual;
    }

    return this.providers[0];
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const provider = this.selectProvider(options);
    const model = options?.model ?? DEFAULT_MODELS[provider.type] ?? "default";

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
    };
    if (options?.maxTokens) body.max_tokens = options.maxTokens;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (provider.apiKey) {
      headers["Authorization"] = `Bearer ${provider.apiKey}`;
    }

    const response = await fetch(`${provider.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown error");
      throw new HubConnectionError(
        `Inference request failed: ${response.status} from ${provider.name} — ${text}`,
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model ?? model,
      provider: provider.name,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      verified: provider.type === "ritual",
    };
  }

  async embed(input: string, options?: { model?: string }): Promise<EmbedResponse> {
    const provider = this.selectProvider();
    const model = options?.model ?? "text-embedding-3-small";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (provider.apiKey) {
      headers["Authorization"] = `Bearer ${provider.apiKey}`;
    }

    const response = await fetch(`${provider.baseUrl}/v1/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, input }),
    });

    if (!response.ok) {
      throw new HubConnectionError(
        `Embedding request failed: ${response.status} from ${provider.name}`,
      );
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
      model: string;
    };

    return {
      embedding: data.data[0]?.embedding ?? [],
      model: data.model ?? model,
      provider: provider.name,
    };
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): CostEstimate {
    // Rough per-million-token pricing
    const pricing: Record<string, { input: number; output: number }> = {
      "llama-3-70b": { input: 0.9, output: 0.9 },
      "gpt-4o": { input: 2.5, output: 10.0 },
      "claude-sonnet": { input: 3.0, output: 15.0 },
      default: { input: 1.0, output: 1.0 },
    };

    const rates = pricing[model] ?? pricing["default"];
    const cost = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;

    return {
      model,
      provider: this.providers[0]?.name ?? "unknown",
      estimatedCost: cost.toFixed(6),
      currency: "USD",
    };
  }
}
