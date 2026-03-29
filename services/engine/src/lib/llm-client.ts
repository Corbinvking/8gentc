const LLM_GATEWAY_URL = process.env.LLM_GATEWAY_URL ?? "http://localhost:3002";

export interface LLMCallOptions {
  prompt: string;
  systemPrompt?: string;
  context?: string;
  taskType?: string;
  userId: string;
  agentId?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCallResult {
  response: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  cacheHit: boolean;
}

export async function callLLM(opts: LLMCallOptions): Promise<LLMCallResult> {
  const res = await fetch(`${LLM_GATEWAY_URL}/llm/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: opts.prompt,
      systemPrompt: opts.systemPrompt,
      context: opts.context,
      taskType: opts.taskType,
      userId: opts.userId,
      agentId: opts.agentId,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM Gateway error (${res.status}): ${err}`);
  }

  return res.json();
}

export async function* streamLLM(
  opts: LLMCallOptions
): AsyncGenerator<{ type: string; content?: string; [key: string]: unknown }> {
  const res = await fetch(`${LLM_GATEWAY_URL}/llm/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: opts.prompt,
      systemPrompt: opts.systemPrompt,
      context: opts.context,
      taskType: opts.taskType,
      userId: opts.userId,
      agentId: opts.agentId,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM Gateway streaming error (${res.status}): ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body for streaming");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6));
        } catch { /* skip malformed SSE lines */ }
      }
    }
  }

  if (buffer.startsWith("data: ")) {
    try {
      yield JSON.parse(buffer.slice(6));
    } catch { /* skip */ }
  }
}
