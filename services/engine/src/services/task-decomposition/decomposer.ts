import { callLLM } from "../../lib/llm-client.js";
import { createWorkstream, type CreateWorkstreamInput } from "./workstream.js";
import { estimateWorkstream } from "./estimator.js";
import type { Workstream, WorkstreamDomain } from "@8gent/shared";

export interface DecompositionInput {
  taskId: string;
  description: string;
  clientContext?: string;
  userId: string;
}

export interface DecompositionResult {
  taskId: string;
  workstreams: Workstream[];
  totalEstimatedTokens: number;
  totalEstimatedDurationMinutes: number;
}

interface LLMWorkstream {
  title: string;
  description: string;
  domain: WorkstreamDomain;
  complexityTier: number;
  dependencies: string[];
  successCriteria: string[];
}

export async function decomposeTask(input: DecompositionInput): Promise<DecompositionResult> {
  const prompt = `Decompose the following task into workstreams.

Task: ${input.description}
${input.clientContext ? `Client context: ${input.clientContext}` : ""}

Return a JSON array of workstreams. Each workstream has:
- title: short name
- description: what needs to be done
- domain: one of "development", "content", "research", "consulting", "design", "mixed"
- complexityTier: 1-5 (1=trivial, 5=very complex)
- dependencies: array of workstream titles this depends on (use [] if none)
- successCriteria: array of verifiable conditions for completion

Return only valid JSON array, no markdown.`;

  const result = await callLLM({
    prompt,
    taskType: "complex",
    userId: input.userId,
    systemPrompt: "You are a project decomposition expert. Return only valid JSON arrays.",
    temperature: 0.3,
  });

  let parsed: LLMWorkstream[];
  try {
    parsed = JSON.parse(result.response);
    if (!Array.isArray(parsed)) parsed = [];
  } catch {
    parsed = [
      {
        title: "Full task execution",
        description: input.description,
        domain: "mixed",
        complexityTier: 3,
        dependencies: [],
        successCriteria: ["Task completed as described"],
      },
    ];
  }

  const titleToId = new Map<string, string>();
  const createdWorkstreams: Workstream[] = [];
  let totalTokens = 0;
  let totalDuration = 0;

  for (const ws of parsed) {
    const estimate = estimateWorkstream(ws.domain, ws.description, ws.complexityTier);

    const depIds = ws.dependencies
      .map((dep) => titleToId.get(dep))
      .filter((id): id is string => id !== undefined);

    const createInput: CreateWorkstreamInput = {
      taskId: input.taskId,
      title: ws.title,
      description: ws.description,
      domain: ws.domain,
      complexityTier: ws.complexityTier,
      estimatedTokens: estimate.tokens,
      estimatedDurationMinutes: estimate.durationMinutes,
      dependencies: depIds,
      successCriteria: ws.successCriteria,
    };

    const created = await createWorkstream(createInput);
    titleToId.set(ws.title, created.id);
    createdWorkstreams.push(created);

    totalTokens += estimate.tokens;
    totalDuration += estimate.durationMinutes;
  }

  return {
    taskId: input.taskId,
    workstreams: createdWorkstreams,
    totalEstimatedTokens: totalTokens,
    totalEstimatedDurationMinutes: totalDuration,
  };
}
