import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage, Server } from "http";
import { EventEmitter } from "events";
import { nanoid } from "nanoid";

export interface GatewayMessage {
  type: string;
  agentId?: string;
  payload: unknown;
  timestamp: number;
}

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  userId: string;
  subscribedAgents: Set<string>;
}

export class AgentGateway extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ConnectedClient>();
  private userClients = new Map<string, Set<string>>();

  start(server: Server, path = "/ws"): void {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      const userId = this.extractUserId(req);
      if (!userId) {
        ws.close(4001, "Unauthorized");
        return;
      }

      const clientId = nanoid();
      const client: ConnectedClient = {
        id: clientId,
        ws,
        userId,
        subscribedAgents: new Set(),
      };

      this.clients.set(clientId, client);
      if (!this.userClients.has(userId)) {
        this.userClients.set(userId, new Set());
      }
      this.userClients.get(userId)!.add(clientId);

      this.emit("client:connected", { clientId, userId });

      ws.on("message", (data: Buffer) => {
        try {
          const msg: GatewayMessage = JSON.parse(data.toString());
          this.handleMessage(client, msg);
        } catch {
          this.sendToClient(client, {
            type: "error",
            payload: { message: "Invalid message format" },
            timestamp: Date.now(),
          });
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        this.userClients.get(userId)?.delete(clientId);
        if (this.userClients.get(userId)?.size === 0) {
          this.userClients.delete(userId);
        }
        this.emit("client:disconnected", { clientId, userId });
      });

      this.sendToClient(client, {
        type: "connected",
        payload: { clientId },
        timestamp: Date.now(),
      });
    });
  }

  broadcastToUser(userId: string, message: GatewayMessage): void {
    const clientIds = this.userClients.get(userId);
    if (!clientIds) return;
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client) this.sendToClient(client, message);
    }
  }

  broadcastAgentUpdate(
    userId: string,
    agentId: string,
    update: unknown
  ): void {
    this.broadcastToUser(userId, {
      type: "agent:update",
      agentId,
      payload: update,
      timestamp: Date.now(),
    });
  }

  broadcastAgentOutput(
    userId: string,
    agentId: string,
    output: unknown
  ): void {
    this.broadcastToUser(userId, {
      type: "agent:output",
      agentId,
      payload: output,
      timestamp: Date.now(),
    });
  }

  getConnectedUserIds(): string[] {
    return Array.from(this.userClients.keys());
  }

  getClientCount(): number {
    return this.clients.size;
  }

  stop(): void {
    for (const client of this.clients.values()) {
      client.ws.close(1000, "Server shutting down");
    }
    this.clients.clear();
    this.userClients.clear();
    this.wss?.close();
    this.wss = null;
  }

  private handleMessage(client: ConnectedClient, msg: GatewayMessage): void {
    switch (msg.type) {
      case "subscribe:agent":
        if (msg.agentId) client.subscribedAgents.add(msg.agentId);
        break;
      case "unsubscribe:agent":
        if (msg.agentId) client.subscribedAgents.delete(msg.agentId);
        break;
      case "agent:command":
        this.emit("agent:command", {
          userId: client.userId,
          agentId: msg.agentId,
          command: msg.payload,
        });
        break;
      default:
        this.emit("message", { userId: client.userId, message: msg });
    }
  }

  private sendToClient(client: ConnectedClient, msg: GatewayMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(msg));
    }
  }

  private extractUserId(req: IncomingMessage): string | null {
    const url = new URL(req.url ?? "", "http://localhost");
    return url.searchParams.get("userId");
  }
}
