import { EventEmitter } from "events";
import type { ContainerManager, ManagedContainer } from "../provisioner/container-manager.js";

export interface CrashEvent {
  managedId: string;
  agentId: string;
  userId: string;
  crashTime: Date;
  recoveryAttempt: number;
  recovered: boolean;
}

export class CrashRecovery extends EventEmitter {
  private containerManager: ContainerManager;
  private maxRecoveryAttempts: number;
  private recoveryAttempts = new Map<string, number>();
  private deadLetterQueue: CrashEvent[] = [];

  constructor(containerManager: ContainerManager, maxRecoveryAttempts = 3) {
    super();
    this.containerManager = containerManager;
    this.maxRecoveryAttempts = maxRecoveryAttempts;
  }

  async handleCrash(container: ManagedContainer): Promise<CrashEvent> {
    const attempts = (this.recoveryAttempts.get(container.id) ?? 0) + 1;
    this.recoveryAttempts.set(container.id, attempts);

    const event: CrashEvent = {
      managedId: container.id,
      agentId: container.agentId,
      userId: container.userId,
      crashTime: new Date(),
      recoveryAttempt: attempts,
      recovered: false,
    };

    if (attempts > this.maxRecoveryAttempts) {
      this.deadLetterQueue.push(event);
      this.emit("dead-letter", event);
      return event;
    }

    try {
      await this.containerManager.restart(container.id);
      event.recovered = true;
      this.emit("recovered", event);
    } catch (err) {
      this.emit("recovery-failed", { event, error: err });
    }

    return event;
  }

  getDeadLetterQueue(): CrashEvent[] {
    return [...this.deadLetterQueue];
  }

  clearDeadLetter(managedId: string): void {
    this.deadLetterQueue = this.deadLetterQueue.filter((e) => e.managedId !== managedId);
    this.recoveryAttempts.delete(managedId);
  }

  resetAttempts(managedId: string): void {
    this.recoveryAttempts.set(managedId, 0);
  }
}
