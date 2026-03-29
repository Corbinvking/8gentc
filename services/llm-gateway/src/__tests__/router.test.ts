import { describe, it, expect, beforeEach } from "vitest";
import { LLMRouter } from "../router/router.js";
import type { LLMProviderAdapter, LLMRequest, LLMResponse, LLMProviderHealth } from "../providers/base.js";

class MockProvider implements LLMProviderAdapter {
  readonly name: string;
  readonly models: string[];
  shouldFail: boolean;

  constructor(name: string, models: string[], shouldFail = false) {
    this.name = name;
    this.models = models;
    this.shouldFail = shouldFail;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (this.shouldFail) throw new Error(`${this.name} failed`);
    return {
      text: `Response from ${this.name}`,
      model: request.model ?? this.models[0],
      inputTokens: 10,
      outputTokens: 20,
      finishReason: "stop",
    };
  }

  async healthCheck(): Promise<LLMProviderHealth> {
    return { available: true, latencyMs: 100, errorRate: 0, lastChecked: new Date() };
  }
}

describe("LLMRouter", () => {
  let router: LLMRouter;

  beforeEach(() => {
    router = new LLMRouter();
    router.registerProvider(new MockProvider("anthropic", ["claude-sonnet-4-20250514"]));
    router.registerProvider(new MockProvider("openai", ["gpt-4o"]));
    router.registerProvider(new MockProvider("google", ["gemini-2.0-flash"]));
    router.setProviderPriority(["anthropic", "openai", "google"]);
  });

  it("routes to primary provider by default", () => {
    const decision = router.route("Hello");
    expect(decision.provider).toBe("anthropic");
    expect(decision.fallbackChain).toHaveLength(2);
  });

  it("executes against primary provider", async () => {
    const result = await router.execute({ prompt: "Hello" });
    expect(result.provider).toBe("anthropic");
    expect(result.response.text).toContain("anthropic");
  });

  it("falls back to secondary when primary fails", async () => {
    router = new LLMRouter();
    router.registerProvider(new MockProvider("anthropic", ["claude-sonnet-4-20250514"], true));
    router.registerProvider(new MockProvider("openai", ["gpt-4o"]));
    router.setProviderPriority(["anthropic", "openai"]);

    const result = await router.execute({ prompt: "Hello" });
    expect(result.provider).toBe("openai");
  });

  it("throws when all providers fail", async () => {
    router = new LLMRouter();
    router.registerProvider(new MockProvider("anthropic", ["claude-sonnet-4-20250514"], true));
    router.registerProvider(new MockProvider("openai", ["gpt-4o"], true));
    router.setProviderPriority(["anthropic", "openai"]);

    await expect(router.execute({ prompt: "Hello" })).rejects.toThrow("openai failed");
  });

  it("lists registered providers", () => {
    expect(router.listProviders()).toEqual(["anthropic", "openai", "google"]);
  });
});
