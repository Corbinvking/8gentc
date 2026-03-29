import Redis from "ioredis";
import { EventEmitter } from "events";
import { nanoid } from "nanoid";

export interface SwarmMessage {
  id: string;
  sessionId: string;
  fromAgentId: string;
  toAgentId?: string;
  type: SwarmMessageType;
  payload: unknown;
  timestamp: number;
}

export type SwarmMessageType =
  | "task-assignment"
  | "status-update"
  | "result-submission"
  | "intervention"
  | "coordination"
  | "error";

export class SwarmMessaging extends EventEmitter {
  private pub: Redis;
  private sub: Redis;
  private activeChannels = new Set<string>();

  constructor(redisUrl: string) {
    super();
    this.pub = new Redis(redisUrl);
    this.sub = new Redis(redisUrl);

    this.sub.on("message", (_channel: string, raw: string) => {
      try {
        const msg: SwarmMessage = JSON.parse(raw);
        this.emit("message", msg);
        this.emit(`message:${msg.type}`, msg);
        if (msg.toAgentId) {
          this.emit(`agent:${msg.toAgentId}`, msg);
        }
      } catch {
        // malformed
      }
    });
  }

  private channelKey(sessionId: string): string {
    return `swarm:session:${sessionId}`;
  }

  createMessage(
    sessionId: string,
    fromAgentId: string,
    type: SwarmMessageType,
    payload: unknown,
    toAgentId?: string
  ): SwarmMessage {
    return {
      id: nanoid(),
      sessionId,
      fromAgentId,
      toAgentId,
      type,
      payload,
      timestamp: Date.now(),
    };
  }

  async publish(message: SwarmMessage): Promise<void> {
    const channel = this.channelKey(message.sessionId);
    await this.pub.publish(channel, JSON.stringify(message));
  }

  async subscribe(sessionId: string): Promise<void> {
    const channel = this.channelKey(sessionId);
    if (this.activeChannels.has(channel)) return;
    await this.sub.subscribe(channel);
    this.activeChannels.add(channel);
  }

  async unsubscribe(sessionId: string): Promise<void> {
    const channel = this.channelKey(sessionId);
    if (!this.activeChannels.has(channel)) return;
    await this.sub.unsubscribe(channel);
    this.activeChannels.delete(channel);
  }

  async disconnect(): Promise<void> {
    for (const channel of this.activeChannels) {
      await this.sub.unsubscribe(channel);
    }
    this.activeChannels.clear();
    this.pub.disconnect();
    this.sub.disconnect();
  }
}
