"use server";

import { requireContractor } from "@/lib/auth";
import { captureLlmCall, capturePrompt } from "./telemetry";

const ENGINE_API_URL = process.env.ENGINE_API_URL ?? "http://localhost:3001";

interface LlmRequest {
  taskId: string;
  harnessType: string;
  prompt: string;
  model?: string;
}

interface LlmResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  cost: number;
}

export async function callLlmViaGateway(request: LlmRequest): Promise<LlmResponse> {
  const contractor = await requireContractor();

  await capturePrompt(request.taskId, request.harnessType, request.prompt);

  const startTime = Date.now();

  try {
    const res = await fetch(`${ENGINE_API_URL}/llm/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractorId: contractor.id,
        taskId: request.taskId,
        prompt: request.prompt,
        model: request.model ?? "claude-3.5-sonnet",
        harnessType: request.harnessType,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");

      if (res.status === 429) {
        return {
          content: "[Error] Rate limit reached. Please wait before sending another prompt.",
          model: request.model ?? "claude-3.5-sonnet",
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
        };
      }

      if (res.status === 402) {
        return {
          content: "[Error] Budget limit reached for this task. Contact support if you believe this is an error.",
          model: request.model ?? "claude-3.5-sonnet",
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
        };
      }

      throw new Error(`LLM Gateway error ${res.status}: ${errorBody}`);
    }

    const data = await res.json();
    const latencyMs = Date.now() - startTime;

    const result: LlmResponse = {
      content: data.content ?? data.text ?? "",
      model: data.model ?? request.model ?? "claude-3.5-sonnet",
      inputTokens: data.inputTokens ?? data.usage?.input_tokens ?? 0,
      outputTokens: data.outputTokens ?? data.usage?.output_tokens ?? 0,
      latencyMs,
      cost: data.cost ?? 0,
    };

    await captureLlmCall(request.taskId, {
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      cost: result.cost,
    });

    return result;
  } catch (err) {
    const latencyMs = Date.now() - startTime;

    return {
      content: `[Error] Failed to reach LLM Gateway: ${err instanceof Error ? err.message : "Unknown error"}. The gateway at ${ENGINE_API_URL} may not be running.`,
      model: request.model ?? "claude-3.5-sonnet",
      inputTokens: Math.ceil(request.prompt.length / 4),
      outputTokens: 0,
      latencyMs,
      cost: 0,
    };
  }
}
