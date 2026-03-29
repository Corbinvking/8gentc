import Redis from "ioredis";
import { EventEmitter } from "events";

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string | null;
  type: AgentMessageType;
  payload: unknown;
  sessionId: string;
  timestamp: number;
}

export type AgentMessageType =
  | "task-assignment"
  | "status-update"
  | "result-submission"
  | "intervention"
  | "request"
  | "response"
  | "broadcast";

export class AgentComms extends EventEmitter {
  private pub: Redis;
  private sub: Redis;
  private subscriptions = new Set<string>();

  constructor(redisUrl: string) {
    super();
    this.pub = new Redis(redisUrl);
    this.sub = new Redis(redisUrl);

    this.sub.on("message", (channel: string, raw: string) => {
      try {
        const message: AgentMessage = JSON.parse(raw);
        this.emit("message", { channel, message });
        this.emit(`message:${message.type}`, message);
      } catch {
        // ignore malformed messages
      }
    });
  }

  private channelKey(sessionId: string): string {
    return `8gentc:comms:${sessionId}`;
  }

  private agentChannelKey(agentId: string): string {
    return `8gentc:comms:agent:${agentId}`;
  }

  async send(message: AgentMessage): Promise<void> {
    const channel = message.toAgentId
      ? this.agentChannelKey(message.toAgentId)
      : this.channelKey(message.sessionId);

    await this.pub.publish(channel, JSON.stringify(message));
  }

  async broadcast(sessionId: string, message: AgentMessage): Promise<void> {
    const channel = this.channelKey(sessionId);
    await this.pub.publish(channel, JSON.stringify({ ...message, type: "broadcast" }));
  }

  async subscribe(sessionId: string): Promise<void> {
    const channel = this.channelKey(sessionId);
    if (this.subscriptions.has(channel)) return;
    await this.sub.subscribe(channel);
    this.subscriptions.add(channel);
  }

  async subscribeAgent(agentId: string): Promise<void> {
    const channel = this.agentChannelKey(agentId);
    if (this.subscriptions.has(channel)) return;
    await this.sub.subscribe(channel);
    this.subscriptions.add(channel);
  }

  async unsubscribe(sessionId: string): Promise<void> {
    const channel = this.channelKey(sessionId);
    if (!this.subscriptions.has(channel)) return;
    await this.sub.unsubscribe(channel);
    this.subscriptions.delete(channel);
  }

  async unsubscribeAgent(agentId: string): Promise<void> {
    const channel = this.agentChannelKey(agentId);
    if (!this.subscriptions.has(channel)) return;
    await this.sub.unsubscribe(channel);
    this.subscriptions.delete(channel);
  }

  async disconnect(): Promise<void> {
    for (const channel of this.subscriptions) {
      await this.sub.unsubscribe(channel);
    }
    this.subscriptions.clear();
    this.pub.disconnect();
    this.sub.disconnect();
  }
}
