import type { ContainerManager } from "../provisioner/container-manager.js";
import { EventEmitter } from "events";

export interface ScalingMetrics {
  totalContainers: number;
  runningContainers: number;
  averageCpuPercent: number;
  averageMemoryPercent: number;
  containersByUser: Map<string, number>;
}

export interface ScalingAlert {
  type: "high_density" | "low_utilization" | "user_limit_approaching";
  message: string;
  severity: "info" | "warning" | "critical";
  timestamp: Date;
}

export class Scaler extends EventEmitter {
  private containerManager: ContainerManager;
  private highDensityThreshold: number;
  private lowUtilizationThreshold: number;

  constructor(
    containerManager: ContainerManager,
    opts?: { highDensityThreshold?: number; lowUtilizationThreshold?: number }
  ) {
    super();
    this.containerManager = containerManager;
    this.highDensityThreshold = opts?.highDensityThreshold ?? 80;
    this.lowUtilizationThreshold = opts?.lowUtilizationThreshold ?? 10;
  }

  async evaluate(): Promise<ScalingAlert[]> {
    const containers = this.containerManager.listAll();
    const alerts: ScalingAlert[] = [];

    const running = containers.filter((c) => c.status === "running");

    const byUser = new Map<string, number>();
    for (const c of containers) {
      byUser.set(c.userId, (byUser.get(c.userId) ?? 0) + 1);
    }

    if (running.length > this.highDensityThreshold) {
      alerts.push({
        type: "high_density",
        message: `Container count (${running.length}) exceeds threshold (${this.highDensityThreshold}). Consider provisioning additional infrastructure.`,
        severity: "warning",
        timestamp: new Date(),
      });
    }

    if (running.length > 0 && running.length < this.lowUtilizationThreshold) {
      alerts.push({
        type: "low_utilization",
        message: `Only ${running.length} containers running. Consider consolidating resources.`,
        severity: "info",
        timestamp: new Date(),
      });
    }

    for (const alert of alerts) {
      this.emit("alert", alert);
    }

    return alerts;
  }

  getMetrics(): ScalingMetrics {
    const containers = this.containerManager.listAll();
    const running = containers.filter((c) => c.status === "running");

    const byUser = new Map<string, number>();
    for (const c of containers) {
      byUser.set(c.userId, (byUser.get(c.userId) ?? 0) + 1);
    }

    return {
      totalContainers: containers.length,
      runningContainers: running.length,
      averageCpuPercent: 0,
      averageMemoryPercent: 0,
      containersByUser: byUser,
    };
  }
}
