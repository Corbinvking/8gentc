import Anthropic from "@anthropic-ai/sdk";
import type { LLMProviderAdapter, LLMRequest, LLMResponse, LLMProviderHealth } from "./base.js";

export class AnthropicProvider implements LLMProviderAdapter {
  readonly name = "anthropic";
  readonly models = [
    "claude-sonnet-4-20250514",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
  ];

  private client: Anthropic;
  private health: LLMProviderHealth = {
    available: true,
    latencyMs: 0,
    errorRate: 0,
    lastChecked: new Date(),
  };
  private totalCalls = 0;
  private errorCalls = 0;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model ?? "claude-sonnet-4-20250514";
    const start = Date.now();
    this.totalCalls++;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt ?? "",
        messages: [{ role: "user", content: request.prompt }],
      });

      this.health.latencyMs = Date.now() - start;
      this.health.available = true;
      this.health.errorRate = this.errorCalls / this.totalCalls;
      this.health.lastChecked = new Date();

      const textBlock = response.content.find((b) => b.type === "text");

      return {
        text: textBlock?.type === "text" ? textBlock.text : "",
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        finishReason: response.stop_reason ?? "end_turn",
      };
    } catch (err) {
      this.errorCalls++;
      this.health.errorRate = this.errorCalls / this.totalCalls;
      this.health.lastError = (err as Error).message;
      throw err;
    }
  }

  async *stream(request: LLMRequest): AsyncGenerator<string, LLMResponse> {
    const model = request.model ?? "claude-sonnet-4-20250514";
    this.totalCalls++;

    try {
      const stream = this.client.messages.stream({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt ?? "",
        messages: [{ role: "user", content: request.prompt }],
      });

      let fullText = "";

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          fullText += event.delta.text;
          yield event.delta.text;
        }
      }

      const finalMessage = await stream.finalMessage();
      this.health.available = true;
      this.health.lastChecked = new Date();

      return {
        text: fullText,
        model,
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
        finishReason: finalMessage.stop_reason ?? "end_turn",
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
      await this.client.messages.create({
        model: "claude-3-5-haiku-20241022",
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
