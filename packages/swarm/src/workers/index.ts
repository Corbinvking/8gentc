import { EventEmitter } from "events";
import type { SwarmMessage } from "../messaging/index.js";
import type { SwarmRole } from "../templates/index.js";

export type WorkerStatus = "idle" | "working" | "completed" | "failed";

export interface WorkerResult {
  workerId: string;
  roleId: string;
  output: unknown;
  tokensUsed: number;
  durationMs: number;
  status: "success" | "failure";
  error?: string;
}

export interface WorkerConfig {
  id: string;
  sessionId: string;
  role: SwarmRole;
  taskDescription: string;
  context?: unknown;
  llmGatewayUrl: string;
  userId: string;
}

export class SwarmWorker extends EventEmitter {
  readonly id: string;
  readonly sessionId: string;
  readonly role: SwarmRole;
  private status: WorkerStatus = "idle";
  private taskDescription: string;
  private context: unknown;
  private llmGatewayUrl: string;
  private userId: string;

  constructor(config: WorkerConfig) {
    super();
    this.id = config.id;
    this.sessionId = config.sessionId;
    this.role = config.role;
    this.taskDescription = config.taskDescription;
    this.context = config.context;
    this.llmGatewayUrl = config.llmGatewayUrl;
    this.userId = config.userId;
  }

  async execute(input?: unknown): Promise<WorkerResult> {
    this.status = "working";
    this.emit("status", { workerId: this.id, status: this.status });

    const start = Date.now();

    try {
      const prompt = this.buildPrompt(input);

      const response = await fetch(`${this.llmGatewayUrl}/llm/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          taskType: this.role.modelPreference ?? "standard",
          userId: this.userId,
          agentId: this.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM call failed: ${response.status}`);
      }

      const data = await response.json();
      this.status = "completed";

      const result: WorkerResult = {
        workerId: this.id,
        roleId: this.role.id,
        output: data.response,
        tokensUsed: (data.inputTokens ?? 0) + (data.outputTokens ?? 0),
        durationMs: Date.now() - start,
        status: "success",
      };

      this.emit("completed", result);
      return result;
    } catch (err) {
      this.status = "failed";
      const result: WorkerResult = {
        workerId: this.id,
        roleId: this.role.id,
        output: null,
        tokensUsed: 0,
        durationMs: Date.now() - start,
        status: "failure",
        error: (err as Error).message,
      };
      this.emit("failed", result);
      return result;
    }
  }

  getStatus(): WorkerStatus {
    return this.status;
  }

  handleMessage(message: SwarmMessage): void {
    if (message.type === "intervention") {
      this.emit("intervention", message);
    }
  }

  private buildPrompt(input?: unknown): string {
    const parts: string[] = [
      `You are a ${this.role.name}: ${this.role.description}`,
      `\nTask: ${this.taskDescription}`,
    ];

    if (this.context) {
      parts.push(`\nContext: ${JSON.stringify(this.context)}`);
    }

    if (input) {
      parts.push(`\nInput from previous step: ${JSON.stringify(input)}`);
    }

    return parts.join("\n");
  }
}
