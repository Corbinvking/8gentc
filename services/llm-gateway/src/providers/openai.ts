import OpenAI from "openai";
import type { LLMProviderAdapter, LLMRequest, LLMResponse, LLMProviderHealth } from "./base.js";

export class OpenAIProvider implements LLMProviderAdapter {
  readonly name = "openai";
  readonly models = ["gpt-4o", "gpt-4o-mini", "gpt-4.5-preview"];

  private client: OpenAI;
  private health: LLMProviderHealth = {
    available: true,
    latencyMs: 0,
    errorRate: 0,
    lastChecked: new Date(),
  };
  private totalCalls = 0;
  private errorCalls = 0;

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model ?? "gpt-4o";
    const start = Date.now();
    this.totalCalls++;

    try {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        messages: [
          ...(request.systemPrompt
            ? [{ role: "system" as const, content: request.systemPrompt }]
            : []),
          { role: "user" as const, content: request.prompt },
        ],
      });

      this.health.latencyMs = Date.now() - start;
      this.health.available = true;
      this.health.errorRate = this.errorCalls / this.totalCalls;
      this.health.lastChecked = new Date();

      return {
        text: response.choices[0]?.message?.content ?? "",
        model,
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        finishReason: response.choices[0]?.finish_reason ?? "stop",
      };
    } catch (err) {
      this.errorCalls++;
      this.health.errorRate = this.errorCalls / this.totalCalls;
      this.health.lastError = (err as Error).message;
      throw err;
    }
  }

  async *stream(request: LLMRequest): AsyncGenerator<string, LLMResponse> {
    const model = request.model ?? "gpt-4o";
    this.totalCalls++;

    try {
      const stream = await this.client.chat.completions.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        stream: true,
        messages: [
          ...(request.systemPrompt
            ? [{ role: "system" as const, content: request.systemPrompt }]
            : []),
          { role: "user" as const, content: request.prompt },
        ],
      });

      let fullText = "";
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          yield delta;
        }
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? 0;
          outputTokens = chunk.usage.completion_tokens ?? 0;
        }
      }

      this.health.available = true;
      this.health.lastChecked = new Date();

      return {
        text: fullText,
        model,
        inputTokens,
        outputTokens,
        finishReason: "stop",
      };
    } catch (err) {
      this.errorCalls++;
      this.health.errorRate = this.errorCalls / this.totalCalls;
      this.health.lastError = (err as Error).message;
      throw err;
    }
  }

  async healthCheck(): Promise<LLMProviderHealth> {
    try {
      const start = Date.now();
      await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 5,
        messages: [{ role: "user", content: "ping" }],
      });
      this.health.available = true;
      this.health.latencyMs = Date.now() - start;
    } catch (err) {
      this.health.available = false;
      this.health.lastError = (err as Error).message;
    }
    this.health.lastChecked = new Date();
    return { ...this.health };
  }
}
