import type { LLMProviderAdapter, LLMRequest, LLMResponse } from "../providers/base.js";

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  backoffMultiplier: 2,
};

export async function executeWithRetry(
  provider: LLMProviderAdapter,
  request: LLMRequest,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<LLMResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await provider.complete(request);
    } catch (err) {
      lastError = err as Error;

      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelayMs
        );

        const jitter = delay * 0.1 * Math.random();
        await new Promise((r) => setTimeout(r, delay + jitter));
      }
    }
  }

  throw lastError ?? new Error("All retries exhausted");
}

export async function executeWithFallback(
  providers: Array<{ provider: LLMProviderAdapter; model: string }>,
  request: LLMRequest,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{ response: LLMResponse; providerName: string; attemptedProviders: string[] }> {
  const attemptedProviders: string[] = [];
  let lastError: Error | null = null;

  for (const { provider, model } of providers) {
    attemptedProviders.push(provider.name);

    try {
      const response = await executeWithRetry(
        provider,
        { ...request, model },
        retryConfig
      );

      return { response, providerName: provider.name, attemptedProviders };
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError ?? new Error("No providers available");
}
