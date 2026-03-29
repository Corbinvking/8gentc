import type { FastifyInstance } from "fastify";

export function generateOpenAPISpec(app: FastifyInstance): object {
  return {
    openapi: "3.1.0",
    info: {
      title: "8gent Engine API",
      version: "1.0.0",
      description: "Platform C Engine API -- chat, agents, tasks, dispatch, telemetry, understanding, and metering",
    },
    servers: [
      { url: "http://localhost:3001", description: "Local development" },
    ],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": { description: "Service healthy", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, service: { type: "string" } } } } } },
          },
        },
      },
      "/chat/message": {
        post: {
          summary: "Send chat message (SSE streaming)",
          tags: ["Platform A"],
          requestBody: {
            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, workspaceId: { type: "string" }, conversationHistory: { type: "array", items: { type: "object", properties: { role: { type: "string" }, content: { type: "string" } } } } }, required: ["message", "workspaceId"] } } },
          },
          responses: { "200": { description: "SSE stream", content: { "text/event-stream": {} } } },
        },
      },
      "/agents": {
        get: { summary: "List agents", tags: ["Platform A"], responses: { "200": { description: "Agent list" } } },
        post: {
          summary: "Create agent",
          tags: ["Platform A"],
          requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, skills: { type: "array", items: { type: "string" } }, config: { type: "object" } }, required: ["name"] } } } },
          responses: { "201": { description: "Agent created" } },
        },
      },
      "/agents/{id}": {
        patch: { summary: "Update agent", tags: ["Platform A"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Agent updated" } } },
        delete: { summary: "Delete agent", tags: ["Platform A"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "204": { description: "Agent deleted" } } },
      },
      "/agents/{id}/pause": { post: { summary: "Pause agent", tags: ["Platform A"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Agent paused" } } } },
      "/agents/{id}/resume": { post: { summary: "Resume agent", tags: ["Platform A"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Agent resumed" } } } },
      "/agents/{id}/outputs": { get: { summary: "Get agent outputs", tags: ["Platform A"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Agent outputs" } } } },
      "/agents/{id}/status": { get: { summary: "Get agent status", tags: ["Platform A"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Agent status" } } } },
      "/understanding/notifications": { get: { summary: "Get understanding notifications", tags: ["Platform A"], responses: { "200": { description: "Notifications list" } } } },
      "/understanding/feedback": { post: { summary: "Submit understanding feedback", tags: ["Platform A"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { itemId: { type: "string" }, feedback: { type: "string", enum: ["helpful", "not_helpful", "dismissed"] } }, required: ["itemId", "feedback"] } } } }, responses: { "200": { description: "Feedback recorded" } } } },
      "/metering/usage": { get: { summary: "Get usage metrics", tags: ["Platform A"], parameters: [{ name: "from", in: "query", schema: { type: "string" } }, { name: "to", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Usage data" } } } },
      "/tasks/escalate": { post: { summary: "Escalate task", tags: ["Platform A"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, workspaceId: { type: "string" }, priority: { type: "string" } }, required: ["title", "description", "workspaceId"] } } } }, responses: { "201": { description: "Task created and decomposed" } } } },
      "/tasks/{id}/status": { get: { summary: "Get task status", tags: ["Platform A", "Platform B"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Task status with workstreams" } } } },
      "/tasks/{id}/deliverables": { get: { summary: "Get task deliverables", tags: ["Platform A"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deliverables list" } } } },
      "/dispatch/available-tasks": { get: { summary: "Get available tasks for contractor", tags: ["Platform B"], responses: { "200": { description: "Available offers" } } } },
      "/dispatch/accept": { post: { summary: "Accept dispatch offer", tags: ["Platform B"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { offerId: { type: "string" } }, required: ["offerId"] } } } }, responses: { "200": { description: "Offer accepted" } } } },
      "/dispatch/reject": { post: { summary: "Reject dispatch offer", tags: ["Platform B"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { offerId: { type: "string" } }, required: ["offerId"] } } } }, responses: { "200": { description: "Offer rejected" } } } },
      "/tasks/{id}/deliverable": { post: { summary: "Submit deliverable", tags: ["Platform B"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "201": { description: "Deliverable submitted" } } } },
      "/tasks/{id}/clarification": { post: { summary: "Send clarification", tags: ["Platform B"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "201": { description: "Clarification sent" } } } },
      "/tasks/{id}/clarifications": { get: { summary: "Get clarifications", tags: ["Platform A", "Platform B"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Clarifications list" } } } },
      "/telemetry/session": { post: { summary: "Ingest telemetry event", tags: ["Platform B"], responses: { "201": { description: "Event ingested" } } } },
      "/telemetry/scores/{contractorId}": { get: { summary: "Get contractor scores", tags: ["Platform B"], parameters: [{ name: "contractorId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Contractor scores" } } } },
      "/telemetry/benchmarks/{taskType}": { get: { summary: "Get quality benchmarks", tags: ["Platform B"], parameters: [{ name: "taskType", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Quality benchmarks" } } } },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}
