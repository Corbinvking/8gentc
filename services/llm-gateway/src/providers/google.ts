import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProviderAdapter, LLMRequest, LLMResponse, LLMProviderHealth } from "./base.js";

export class GoogleProvider implements LLMProviderAdapter {
  readonly name = "google";
  readonly models = ["gemini-2.0-flash", "gemini-2.5-pro-preview-05-06"];

  private client: GoogleGenerativeAI;
  private health: LLMProviderHealth = {
    available: true,
    latencyMs: 0,
    errorRate: 0,
    lastChecked: new Date(),
  };
  private totalCalls = 0;
  private errorCalls = 0;

  constructor(apiKey?: string) {
    this.client = new GoogleGenerativeAI(apiKey ?? process.env.GOOGLE_AI_API_KEY ?? "");
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const modelName = request.model ?? "gemini-2.0-flash";
    const start = Date.now();
    this.totalCalls++;

    try {
      const model = this.client.getGenerativeModel({
        model: modelName,
        systemInstruction: request.systemPrompt,
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          maxOutputTokens: request.maxTokens ?? 4096,
          temperature: request.temperature ?? 0.7,
        },
      });

      const response = result.response;
      const usage = response.usageMetadata;

      this.health.latencyMs = Date.now() - start;
      this.health.available = true;
      this.health.errorRate = this.errorCalls / this.totalCalls;
      this.health.lastChecked = new Date();

      return {
        text: response.text() ?? "",
        model: modelName,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
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
      const model = this.client.getGenerativeModel({ model: "gemini-2.0-flash" });
      await model.generateContent("ping");
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
