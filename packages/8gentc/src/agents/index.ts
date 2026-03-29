import { nanoid } from "nanoid";
import type { Agent, AgentStatus } from "@8gent/shared";
import { EventEmitter } from "events";

export interface AgentConfig {
  name: string;
  ownerId: string;
  skills?: string[];
  modelPreference?: string;
  heartbeatIntervalMs?: number;
  maxBudgetTokens?: number;
  config?: Record<string, unknown>;
}

interface ManagedAgent {
  agent: Agent;
  heartbeatTimer?: ReturnType<typeof setInterval>;
  onHeartbeat?: () => Promise<void>;
}

const VALID_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  idle: ["running", "terminated"],
  running: ["paused", "idle", "error", "terminated"],
  paused: ["running", "terminated"],
  error: ["running", "terminated"],
  terminated: [],
};

export class AgentManager extends EventEmitter {
  private agents = new Map<string, ManagedAgent>();

  create(config: AgentConfig): Agent {
    const agent: Agent = {
      id: nanoid(),
      name: config.name,
      ownerId: config.ownerId,
      status: "idle",
      skills: config.skills ?? [],
      config: {
        modelPreference: config.modelPreference ?? "auto",
        heartbeatIntervalMs: config.heartbeatIntervalMs ?? 300_000,
        maxBudgetTokens: config.maxBudgetTokens ?? 1_000_000,
        ...config.config,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.agents.set(agent.id, { agent });
    this.emit("agent:created", agent);
    return agent;
  }

  start(agentId: string, onHeartbeat?: () => Promise<void>): Agent {
    const managed = this.requireAgent(agentId);
    this.transition(managed, "running");

    managed.onHeartbeat = onHeartbeat;
    const intervalMs =
      (managed.agent.config.heartbeatIntervalMs as number) ?? 300_000;

    managed.heartbeatTimer = setInterval(async () => {
      if (managed.agent.status !== "running") return;
      try {
        this.emit("agent:heartbeat", managed.agent);
        await managed.onHeartbeat?.();
      } catch (err) {
        this.emit("agent:error", managed.agent, err);
        this.transition(managed, "error");
      }
    }, intervalMs);

    this.emit("agent:started", managed.agent);
    return managed.agent;
  }

  pause(agentId: string): Agent {
    const managed = this.requireAgent(agentId);
    this.clearHeartbeat(managed);
    this.transition(managed, "paused");
    this.emit("agent:paused", managed.agent);
    return managed.agent;
  }

  resume(agentId: string): Agent {
    const managed = this.requireAgent(agentId);
    this.transition(managed, "running");

    const intervalMs =
      (managed.agent.config.heartbeatIntervalMs as number) ?? 300_000;
    managed.heartbeatTimer = setInterval(async () => {
      if (managed.agent.status !== "running") return;
      try {
        this.emit("agent:heartbeat", managed.agent);
        await managed.onHeartbeat?.();
      } catch (err) {
        this.emit("agent:error", managed.agent, err);
        this.transition(managed, "error");
      }
    }, intervalMs);

    this.emit("agent:resumed", managed.agent);
    return managed.agent;
  }

  destroy(agentId: string): void {
    const managed = this.requireAgent(agentId);
    this.clearHeartbeat(managed);
    this.transition(managed, "terminated");
    this.emit("agent:destroyed", managed.agent);
    this.agents.delete(agentId);
  }

  getStatus(agentId: string): AgentStatus {
    return this.requireAgent(agentId).agent.status;
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId)?.agent;
  }

  listByOwner(ownerId: string): Agent[] {
    return Array.from(this.agents.values())
      .filter((m) => m.agent.ownerId === ownerId)
      .map((m) => m.agent);
  }

  listAll(): Agent[] {
    return Array.from(this.agents.values()).map((m) => m.agent);
  }

  updateConfig(agentId: string, config: Partial<Record<string, unknown>>): Agent {
    const managed = this.requireAgent(agentId);
    managed.agent.config = { ...managed.agent.config, ...config };
    managed.agent.updatedAt = new Date();
    this.emit("agent:updated", managed.agent);
    return managed.agent;
  }

  destroyAll(): void {
    for (const [id] of this.agents) {
      this.destroy(id);
    }
  }

  private requireAgent(agentId: string): ManagedAgent {
    const managed = this.agents.get(agentId);
    if (!managed) throw new Error(`Agent ${agentId} not found`);
    return managed;
  }

  private transition(managed: ManagedAgent, to: AgentStatus): void {
    const from = managed.agent.status;
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new Error(`Invalid transition: ${from} -> ${to}`);
    }
    managed.agent.status = to;
    managed.agent.updatedAt = new Date();
  }

  private clearHeartbeat(managed: ManagedAgent): void {
    if (managed.heartbeatTimer) {
      clearInterval(managed.heartbeatTimer);
      managed.heartbeatTimer = undefined;
    }
  }
}
