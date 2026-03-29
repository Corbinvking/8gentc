import { EventEmitter } from "events";
import type { ContainerManager, ManagedContainer } from "../provisioner/container-manager.js";

export interface HealthStatus {
  managedId: string;
  agentId: string;
  userId: string;
  containerStatus: string;
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  healthy: boolean;
  lastChecked: Date;
}

export class HealthMonitor extends EventEmitter {
  private containerManager: ContainerManager;
  private checkIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private consecutiveFailures = new Map<string, number>();

  constructor(containerManager: ContainerManager, checkIntervalMs = 30_000) {
    super();
    this.containerManager = containerManager;
    this.checkIntervalMs = checkIntervalMs;
  }

  start(): void {
    this.timer = setInterval(() => this.checkAll(), this.checkIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkAll(): Promise<HealthStatus[]> {
    const containers = this.containerManager.listAll();
    const statuses: HealthStatus[] = [];

    for (const container of containers) {
      const status = await this.checkOne(container);
      statuses.push(status);

      if (!status.healthy) {
        const failures = (this.consecutiveFailures.get(container.id) ?? 0) + 1;
        this.consecutiveFailures.set(container.id, failures);

        this.emit("unhealthy", { status, failures });

        if (failures >= 3) {
          this.emit("auto-restart", { managedId: container.id, failures });
          try {
            await this.containerManager.restart(container.id);
            this.consecutiveFailures.set(container.id, 0);
          } catch (err) {
            this.emit("restart-failed", { managedId: container.id, error: err });
          }
        }
      } else {
        this.consecutiveFailures.set(container.id, 0);
      }
    }

    return statuses;
  }

  private async checkOne(container: ManagedContainer): Promise<HealthStatus> {
    try {
      const stats = await this.containerManager.getContainerStats(container.id);
      const memoryUsagePercent = stats.memoryUsedMb / stats.memoryLimitMb;

      return {
        managedId: container.id,
        agentId: container.agentId,
        userId: container.userId,
        containerStatus: container.status,
        cpuPercent: stats.cpuPercent,
        memoryUsedMb: stats.memoryUsedMb,
        memoryLimitMb: stats.memoryLimitMb,
        healthy: container.status === "running" && memoryUsagePercent < 0.95,
        lastChecked: new Date(),
      };
    } catch {
      return {
        managedId: container.id,
        agentId: container.agentId,
        userId: container.userId,
        containerStatus: container.status,
        cpuPercent: 0,
        memoryUsedMb: 0,
        memoryLimitMb: 0,
        healthy: false,
        lastChecked: new Date(),
      };
    }
  }
}
