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

const VALID_DOMAINS: Set<string> = new Set([
  "development", "content", "research", "consulting", "design", "mixed",
]);

const SYSTEM_PROMPT = `You are a project decomposition expert. You break complex tasks into clear, non-overlapping workstreams with realistic estimates.

Return ONLY a valid JSON array — no markdown, no explanation. Each workstream object has these fields:
- title (string): short descriptive name
- description (string): what needs to be done
- domain (string): one of "development", "content", "research", "consulting", "design", "mixed"
- complexityTier (number 1-5): 1=trivial, 2=simple, 3=moderate, 4=complex, 5=very complex
- dependencies (string[]): titles of workstreams this depends on ([] if none)
- successCriteria (string[]): specific, verifiable conditions for completion

Here are two examples of good decompositions:

Example 1 — Task: "Build a landing page with email signup and analytics"
[
  {"title":"Design Landing Page","description":"Create wireframes and visual mockups for the landing page including hero section, feature highlights, and CTA","domain":"design","complexityTier":2,"dependencies":[],"successCriteria":["Figma mockup approved","Mobile and desktop variants designed"]},
  {"title":"Implement Frontend","description":"Build the responsive landing page from approved designs using HTML/CSS/JS","domain":"development","complexityTier":2,"dependencies":["Design Landing Page"],"successCriteria":["Page matches mockups","Lighthouse score above 90","Responsive on mobile and desktop"]},
  {"title":"Email Signup Integration","description":"Set up email collection form connected to Mailchimp/SendGrid with double opt-in","domain":"development","complexityTier":1,"dependencies":["Implement Frontend"],"successCriteria":["Form submits successfully","Confirmation email sent","Subscriber appears in email platform"]},
  {"title":"Analytics Setup","description":"Integrate Google Analytics 4 and set up conversion tracking for signups","domain":"development","complexityTier":1,"dependencies":["Implement Frontend"],"successCriteria":["GA4 tracking verified","Signup conversion event fires","Dashboard shows real-time data"]}
]

Example 2 — Task: "Research competitive landscape and write a strategy report"
[
  {"title":"Competitor Identification","description":"Identify top 10 direct and indirect competitors through market research","domain":"research","complexityTier":2,"dependencies":[],"successCriteria":["10+ competitors identified","Each has company profile with key metrics","Sources documented"]},
  {"title":"Feature Comparison Analysis","description":"Create detailed feature matrix comparing our product against identified competitors","domain":"research","complexityTier":3,"dependencies":["Competitor Identification"],"successCriteria":["Feature matrix with 20+ dimensions","Pricing comparison included","Gaps and advantages highlighted"]},
  {"title":"Strategy Recommendations","description":"Synthesize research into actionable strategic recommendations with prioritized initiatives","domain":"consulting","complexityTier":3,"dependencies":["Feature Comparison Analysis"],"successCriteria":["3-5 strategic initiatives proposed","Each has effort/impact assessment","90-day action plan included"]},
  {"title":"Final Report","description":"Write and format the complete competitive analysis report for executive audience","domain":"content","complexityTier":2,"dependencies":["Strategy Recommendations"],"successCriteria":["Executive summary under 1 page","Report under 20 pages","Charts and visuals included"]}
]`;

export async function decomposeTask(input: DecompositionInput): Promise<DecompositionResult> {
  const prompt = `Decompose the following task into workstreams.

Task: ${input.description}
${input.clientContext ? `Client context: ${input.clientContext}` : ""}

Return a JSON array of workstreams following the schema and examples from your instructions.`;

  const result = await callLLM({
    prompt,
    taskType: "complex",
    userId: input.userId,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.3,
  });

  let parsed: LLMWorkstream[] = parseLLMResponse(result.response, input.description);
  parsed = sanitizeWorkstreams(parsed);
  parsed = removeDependencyCycles(parsed);

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

function parseLLMResponse(response: string, fallbackDescription: string): LLMWorkstream[] {
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  const toParse = jsonMatch ? jsonMatch[0] : response;

  try {
    const parsed = JSON.parse(toParse);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* fallback below */ }

  return [
    {
      title: "Full task execution",
      description: fallbackDescription,
      domain: "mixed" as WorkstreamDomain,
      complexityTier: 3,
      dependencies: [],
      successCriteria: ["Task completed as described"],
    },
  ];
}

export function sanitizeWorkstreams(workstreams: LLMWorkstream[]): LLMWorkstream[] {
  return workstreams
    .filter((ws) => ws.title && ws.title.trim().length > 0)
    .map((ws) => ({
      ...ws,
      title: ws.title.trim(),
      description: ws.description?.trim() || ws.title,
      domain: (VALID_DOMAINS.has(ws.domain) ? ws.domain : "mixed") as WorkstreamDomain,
      complexityTier: Math.min(5, Math.max(1, Math.round(typeof ws.complexityTier === "number" ? ws.complexityTier : 3))),
      dependencies: Array.isArray(ws.dependencies) ? ws.dependencies.filter(Boolean) : [],
      successCriteria: Array.isArray(ws.successCriteria) && ws.successCriteria.length > 0
        ? ws.successCriteria.filter(Boolean)
        : ["Task completed successfully"],
    }));
}

export function removeDependencyCycles(workstreams: LLMWorkstream[]): LLMWorkstream[] {
  const titles = new Set(workstreams.map((ws) => ws.title));

  const cleaned = workstreams.map((ws) => ({
    ...ws,
    dependencies: ws.dependencies.filter((d) => titles.has(d)),
  }));

  const adjList = new Map<string, string[]>();
  for (const ws of cleaned) {
    adjList.set(ws.title, ws.dependencies);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const backEdges = new Set<string>();

  function dfs(node: string): void {
    visited.add(node);
    inStack.add(node);

    for (const dep of adjList.get(node) ?? []) {
      if (inStack.has(dep)) {
        backEdges.add(`${node}->${dep}`);
      } else if (!visited.has(dep)) {
        dfs(dep);
      }
    }

    inStack.delete(node);
  }

  for (const ws of cleaned) {
    if (!visited.has(ws.title)) {
      dfs(ws.title);
    }
  }

  if (backEdges.size === 0) return cleaned;

  return cleaned.map((ws) => ({
    ...ws,
    dependencies: ws.dependencies.filter(
      (dep) => !backEdges.has(`${ws.title}->${dep}`)
    ),
  }));
}
