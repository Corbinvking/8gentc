import type { LLMProviderAdapter, LLMRequest, LLMResponse } from "../providers/base.js";
import { classifyComplexity, TIER_MODELS, type ComplexityTier } from "./classifier.js";

export interface RouteDecision {
  provider: string;
  model: string;
  tier: ComplexityTier;
  fallbackChain: Array<{ provider: string; model: string }>;
}

export class LLMRouter {
  private providers = new Map<string, LLMProviderAdapter>();
  private providerPriority: string[] = ["anthropic", "openai", "google"];

  registerProvider(provider: LLMProviderAdapter): void {
    this.providers.set(provider.name, provider);
  }

  setProviderPriority(order: string[]): void {
    this.providerPriority = order;
  }

  route(prompt: string, taskType?: string, contextLength?: number): RouteDecision {
    const tier = classifyComplexity({ prompt, taskType, contextLength });
    const models = TIER_MODELS[tier];

    const primary = this.providerPriority[0];
    const fallbacks = this.providerPriority.slice(1);

    return {
      provider: primary,
      model: models[primary] ?? Object.values(models)[0],
      tier,
      fallbackChain: fallbacks.map((p) => ({
        provider: p,
        model: models[p] ?? Object.values(models)[0],
      })),
    };
  }

  async execute(
    request: LLMRequest,
    taskType?: string,
    contextLength?: number
  ): Promise<{ response: LLMResponse; provider: string; tier: ComplexityTier }> {
    const decision = this.route(request.prompt, taskType, contextLength);

    const attempts = [
      { provider: decision.provider, model: decision.model },
      ...decision.fallbackChain,
    ];

    let lastError: Error | null = null;

    for (const attempt of attempts) {
      const adapter = this.providers.get(attempt.provider);
      if (!adapter) continue;

      try {
        const response = await adapter.complete({
          ...request,
          model: attempt.model,
        });
        return { response, provider: attempt.provider, tier: decision.tier };
      } catch (err) {
        lastError = err as Error;
      }
    }

    throw lastError ?? new Error("No providers available");
  }

  getProvider(name: string): LLMProviderAdapter | undefined {
    return this.providers.get(name);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
