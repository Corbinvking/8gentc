import Docker from "dockerode";
import { EventEmitter } from "events";
import { nanoid } from "nanoid";

export interface ContainerConfig {
  userId: string;
  agentId: string;
  image: string;
  memoryMb: number;
  cpuShares: number;
  env: Record<string, string>;
}

export interface ManagedContainer {
  id: string;
  containerId: string;
  userId: string;
  agentId: string;
  status: "creating" | "running" | "paused" | "stopped" | "error";
  createdAt: Date;
  lastHealthCheck?: Date;
}

export class ContainerManager extends EventEmitter {
  private docker: Docker;
  private containers = new Map<string, ManagedContainer>();

  constructor(socketPath?: string) {
    super();
    this.docker = new Docker(socketPath ? { socketPath } : undefined);
  }

  async spawn(config: ContainerConfig): Promise<ManagedContainer> {
    const id = nanoid();

    try {
      const container = await this.docker.createContainer({
        Image: config.image,
        name: `8gent-agent-${config.agentId}-${id.slice(0, 8)}`,
        Env: Object.entries(config.env).map(([k, v]) => `${k}=${v}`),
        HostConfig: {
          Memory: config.memoryMb * 1024 * 1024,
          CpuShares: config.cpuShares,
          NetworkMode: "bridge",
          RestartPolicy: { Name: "on-failure", MaximumRetryCount: 3 },
        },
        Labels: {
          "8gent.user-id": config.userId,
          "8gent.agent-id": config.agentId,
          "8gent.managed-id": id,
        },
      });

      await container.start();

      const managed: ManagedContainer = {
        id,
        containerId: container.id,
        userId: config.userId,
        agentId: config.agentId,
        status: "running",
        createdAt: new Date(),
      };

      this.containers.set(id, managed);
      this.emit("container:spawned", managed);
      return managed;
    } catch (err) {
      const managed: ManagedContainer = {
        id,
        containerId: "",
        userId: config.userId,
        agentId: config.agentId,
        status: "error",
        createdAt: new Date(),
      };
      this.containers.set(id, managed);
      this.emit("container:error", { managed, error: err });
      throw err;
    }
  }

  async pause(managedId: string): Promise<void> {
    const managed = this.requireContainer(managedId);
    const container = this.docker.getContainer(managed.containerId);
    await container.pause();
    managed.status = "paused";
    this.emit("container:paused", managed);
  }

  async unpause(managedId: string): Promise<void> {
    const managed = this.requireContainer(managedId);
    const container = this.docker.getContainer(managed.containerId);
    await container.unpause();
    managed.status = "running";
    this.emit("container:resumed", managed);
  }

  async destroy(managedId: string): Promise<void> {
    const managed = this.requireContainer(managedId);
    try {
      const container = this.docker.getContainer(managed.containerId);
      await container.stop({ t: 10 });
      await container.remove();
    } catch {
      // container may already be stopped
    }
    managed.status = "stopped";
    this.containers.delete(managedId);
    this.emit("container:destroyed", managed);
  }

  async restart(managedId: string): Promise<void> {
    const managed = this.requireContainer(managedId);
    const container = this.docker.getContainer(managed.containerId);
    await container.restart({ t: 10 });
    managed.status = "running";
    this.emit("container:restarted", managed);
  }

  async getContainerStats(managedId: string): Promise<{
    cpuPercent: number;
    memoryUsedMb: number;
    memoryLimitMb: number;
  }> {
    const managed = this.requireContainer(managedId);
    const container = this.docker.getContainer(managed.containerId);
    const stats = await container.stats({ stream: false });

    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * 100 : 0;

    return {
      cpuPercent,
      memoryUsedMb: stats.memory_stats.usage / (1024 * 1024),
      memoryLimitMb: stats.memory_stats.limit / (1024 * 1024),
    };
  }

  getContainer(managedId: string): ManagedContainer | undefined {
    return this.containers.get(managedId);
  }

  listByUser(userId: string): ManagedContainer[] {
    return Array.from(this.containers.values()).filter((c) => c.userId === userId);
  }

  listAll(): ManagedContainer[] {
    return Array.from(this.containers.values());
  }

  async destroyAll(): Promise<void> {
    for (const [id] of this.containers) {
      await this.destroy(id).catch(() => {});
    }
  }

  private requireContainer(managedId: string): ManagedContainer {
    const managed = this.containers.get(managedId);
    if (!managed) throw new Error(`Container ${managedId} not found`);
    return managed;
  }
}
