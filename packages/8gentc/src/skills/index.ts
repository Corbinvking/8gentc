export interface SkillContext {
  agentId: string;
  userId: string;
  input: unknown;
  config: Record<string, unknown>;
}

export interface SkillResult {
  success: boolean;
  output: unknown;
  tokensUsed?: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  stub?: boolean;
  execute(context: SkillContext): Promise<SkillResult>;
}

export class SkillRegistry {
  private skills = new Map<string, Skill>();

  register(skill: Skill): void {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill "${skill.id}" is already registered`);
    }
    this.skills.set(skill.id, skill);
  }

  unregister(skillId: string): boolean {
    return this.skills.delete(skillId);
  }

  get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  has(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  listAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  listForAgent(agentSkillIds: string[]): Skill[] {
    return agentSkillIds
      .map((id) => this.skills.get(id))
      .filter((s): s is Skill => s !== undefined);
  }

  async execute(skillId: string, context: SkillContext): Promise<SkillResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return { success: false, output: `Skill "${skillId}" not found` };
    }
    return skill.execute(context);
  }
}

const LLM_GATEWAY_URL = process.env.LLM_GATEWAY_URL ?? "http://localhost:3002";

async function callGateway(
  prompt: string,
  systemPrompt: string,
  userId: string
): Promise<{ response: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(`${LLM_GATEWAY_URL}/llm/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      systemPrompt,
      userId,
      taskType: "simple",
      maxTokens: 2048,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM Gateway error: ${res.status}`);
  }

  const data = await res.json();
  return {
    response: (data as any).response,
    inputTokens: (data as any).inputTokens ?? 0,
    outputTokens: (data as any).outputTokens ?? 0,
  };
}

export const builtInSkills: Skill[] = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the web for information (stub — requires external search API integration)",
    stub: true,
    async execute(ctx) {
      return {
        success: false,
        output: { query: ctx.input, results: [], message: "Web search requires external API integration (e.g. Serper, SerpAPI). Not yet connected." },
        tokensUsed: 0,
      };
    },
  },
  {
    id: "code-execution",
    name: "Code Execution",
    description: "Execute code in a sandboxed environment (stub — requires sandbox environment)",
    stub: true,
    async execute(ctx) {
      return {
        success: false,
        output: { code: ctx.input, result: null, message: "Code execution requires a sandbox environment. Not yet connected." },
        tokensUsed: 0,
      };
    },
  },
  {
    id: "file-read",
    name: "File Read",
    description: "Read files from the agent's workspace (stub — requires agent workspace filesystem)",
    stub: true,
    async execute(ctx) {
      return {
        success: false,
        output: { path: ctx.input, content: "", message: "File read requires agent workspace filesystem. Not yet connected." },
        tokensUsed: 0,
      };
    },
  },
  {
    id: "summarize",
    name: "Summarize",
    description: "Summarize long text content using the LLM gateway",
    stub: false,
    async execute(ctx) {
      const text = typeof ctx.input === "string" ? ctx.input : JSON.stringify(ctx.input);

      if (!text || text.length < 10) {
        return { success: false, output: { message: "Input text too short to summarize" }, tokensUsed: 0 };
      }

      try {
        const result = await callGateway(
          text,
          "You are a summarization expert. Produce a clear, concise summary of the provided text. Preserve all key facts, numbers, and conclusions. Output only the summary, nothing else.",
          ctx.userId
        );

        return {
          success: true,
          output: { summary: result.response },
          tokensUsed: result.inputTokens + result.outputTokens,
        };
      } catch (err) {
        return {
          success: false,
          output: { message: (err as Error).message },
          tokensUsed: 0,
        };
      }
    },
  },
];
