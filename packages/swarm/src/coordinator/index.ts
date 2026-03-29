import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import { SwarmMessaging, type SwarmMessage } from "../messaging/index.js";
import { SwarmWorker, type WorkerResult, type WorkerConfig } from "../workers/index.js";
import { getTemplate, type SwarmTemplate, type SwarmWorkflowStep } from "../templates/index.js";

export type CoordinatorStatus = "initializing" | "running" | "paused" | "completed" | "failed";

export interface SwarmConfig {
  templateId: string;
  taskDescription: string;
  context?: unknown;
  ownerId: string;
  llmGatewayUrl: string;
  redisUrl: string;
}

export interface SwarmState {
  sessionId: string;
  status: CoordinatorStatus;
  template: SwarmTemplate;
  workers: Map<string, SwarmWorker>;
  results: Map<string, WorkerResult>;
  startedAt: Date;
  completedAt?: Date;
}

export class SwarmCoordinator extends EventEmitter {
  private sessionId: string;
  private status: CoordinatorStatus = "initializing";
  private template: SwarmTemplate;
  private workers = new Map<string, SwarmWorker>();
  private results = new Map<string, WorkerResult>();
  private messaging: SwarmMessaging;
  private config: SwarmConfig;
  private startedAt: Date;

  constructor(config: SwarmConfig) {
    super();
    this.config = config;
    this.sessionId = nanoid();
    this.startedAt = new Date();

    const template = getTemplate(config.templateId);
    if (!template) throw new Error(`Template "${config.templateId}" not found`);
    this.template = template;

    this.messaging = new SwarmMessaging(config.redisUrl);
  }

  async initialize(): Promise<void> {
    await this.messaging.subscribe(this.sessionId);

    this.messaging.on("message", (msg: SwarmMessage) => {
      if (msg.type === "intervention") {
        this.handleIntervention(msg);
      }
    });

    for (const role of this.template.roles) {
      const workerConfig: WorkerConfig = {
        id: nanoid(),
        sessionId: this.sessionId,
        role,
        taskDescription: this.config.taskDescription,
        context: this.config.context,
        llmGatewayUrl: this.config.llmGatewayUrl,
        userId: this.config.ownerId,
      };

      const worker = new SwarmWorker(workerConfig);
      this.workers.set(role.id, worker);
    }

    this.status = "initializing";
    this.emit("initialized", { sessionId: this.sessionId, template: this.template.id });
  }

  async run(): Promise<Map<string, WorkerResult>> {
    this.status = "running";
    this.emit("started", { sessionId: this.sessionId });

    const completed = new Set<string>();

    for (const step of this.template.workflow) {
      if (this.status === "paused" || this.status === "failed") break;

      await this.waitForDependencies(step, completed);

      const worker = this.workers.get(step.roleId);
      if (!worker) continue;

      const dependencyOutputs = this.gatherDependencyOutputs(step);

      await this.messaging.publish(
        this.messaging.createMessage(
          this.sessionId,
          "coordinator",
          "task-assignment",
          { roleId: step.roleId, input: dependencyOutputs },
          worker.id
        )
      );

      const result = await worker.execute(dependencyOutputs);
      this.results.set(step.roleId, result);
      completed.add(step.roleId);

      await this.messaging.publish(
        this.messaging.createMessage(
          this.sessionId,
          worker.id,
          result.status === "success" ? "result-submission" : "error",
          result
        )
      );

      this.emit("step:completed", { roleId: step.roleId, result });

      if (result.status === "failure") {
        this.status = "failed";
        this.emit("failed", { sessionId: this.sessionId, failedStep: step.roleId });
        break;
      }
    }

    if (this.status === "running") {
      this.status = "completed";
      this.emit("completed", {
        sessionId: this.sessionId,
        results: Object.fromEntries(this.results),
      });
    }

    return this.results;
  }

  pause(): void {
    this.status = "paused";
    this.emit("paused", { sessionId: this.sessionId });
  }

  resume(): void {
    if (this.status === "paused") {
      this.status = "running";
      this.emit("resumed", { sessionId: this.sessionId });
    }
  }

  async shutdown(): Promise<void> {
    await this.messaging.unsubscribe(this.sessionId);
    await this.messaging.disconnect();
  }

  getState(): {
    sessionId: string;
    status: CoordinatorStatus;
    templateId: string;
    workerCount: number;
    completedSteps: number;
    totalSteps: number;
  } {
    return {
      sessionId: this.sessionId,
      status: this.status,
      templateId: this.template.id,
      workerCount: this.workers.size,
      completedSteps: this.results.size,
      totalSteps: this.template.workflow.length,
    };
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getWorkerIds(): string[] {
    return Array.from(this.workers.values()).map((w) => w.id);
  }

  private async waitForDependencies(
    step: SwarmWorkflowStep,
    completed: Set<string>
  ): Promise<void> {
    for (const dep of step.dependsOn) {
      while (!completed.has(dep)) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  private gatherDependencyOutputs(step: SwarmWorkflowStep): unknown {
    if (step.dependsOn.length === 0) return undefined;
    const outputs: Record<string, unknown> = {};
    for (const dep of step.dependsOn) {
      const result = this.results.get(dep);
      if (result) outputs[dep] = result.output;
    }
    return outputs;
  }

  private handleIntervention(msg: SwarmMessage): void {
    this.emit("intervention", msg);
  }
}
