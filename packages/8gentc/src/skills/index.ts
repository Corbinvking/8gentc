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

export const builtInSkills: Skill[] = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the web for information",
    async execute(ctx) {
      return {
        success: true,
        output: { query: ctx.input, results: [] },
        tokensUsed: 0,
      };
    },
  },
  {
    id: "code-execution",
    name: "Code Execution",
    description: "Execute code in a sandboxed environment",
    async execute(ctx) {
      return {
        success: true,
        output: { code: ctx.input, result: null },
        tokensUsed: 0,
      };
    },
  },
  {
    id: "file-read",
    name: "File Read",
    description: "Read files from the agent's workspace",
    async execute(ctx) {
      return {
        success: true,
        output: { path: ctx.input, content: "" },
        tokensUsed: 0,
      };
    },
  },
  {
    id: "summarize",
    name: "Summarize",
    description: "Summarize long text content",
    async execute(ctx) {
      return {
        success: true,
        output: { input: ctx.input, summary: "" },
        tokensUsed: 0,
      };
    },
  },
];
