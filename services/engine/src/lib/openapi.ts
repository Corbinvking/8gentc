import type { FastifyInstance } from "fastify";

const idParam = { name: "id", in: "path", required: true, schema: { type: "string" } };
const contractorIdParam = { name: "contractorId", in: "path", required: true, schema: { type: "string" } };
const taskTypeParam = { name: "taskType", in: "path", required: true, schema: { type: "string" } };
const serviceParam = { name: "service", in: "path", required: true, schema: { type: "string" } };
const jsonBody = (schema: object) => ({ content: { "application/json": { schema } } });
const jsonResponse = (desc: string, schema?: object) => ({
  description: desc,
  ...(schema ? { content: { "application/json": { schema } } } : {}),
});

export function generateOpenAPISpec(_app: FastifyInstance): object {
  return {
    openapi: "3.1.0",
    info: {
      title: "8gent Engine API",
      version: "1.0.0",
      description: "Platform C Engine API — chat, agents, tasks, dispatch, telemetry, understanding, and metering",
    },
    servers: [
      { url: "http://localhost:3001", description: "Local development" },
    ],
    paths: {
      "/health": {
        get: {
          summary: "Deep health check",
          security: [],
          responses: {
            "200": jsonResponse("Service health with dependency status", {
              type: "object",
              properties: {
                status: { type: "string", enum: ["ok", "degraded"] },
                service: { type: "string" },
                dependencies: {
                  type: "object",
                  properties: {
                    redis: { type: "boolean" },
                    database: { type: "boolean" },
                  },
                },
                workers: {
                  type: "object",
                  properties: {
                    heartbeat: { type: "boolean" },
                    understanding: { type: "boolean" },
                    dispatch: { type: "boolean" },
                    scoring: { type: "boolean" },
                    billing: { type: "boolean" },
                  },
                },
              },
            }),
          },
        },
      },
      "/openapi.json": {
        get: {
          summary: "OpenAPI specification",
          security: [],
          responses: { "200": jsonResponse("OpenAPI 3.1 specification document") },
        },
      },
      "/internal/circuits": {
        get: {
          summary: "Get circuit breaker states",
          tags: ["Internal"],
          security: [],
          responses: { "200": jsonResponse("Map of service name to circuit breaker state") },
        },
      },
      "/internal/circuits/{service}/reset": {
        post: {
          summary: "Reset a circuit breaker",
          tags: ["Internal"],
          security: [],
          parameters: [serviceParam],
          responses: { "200": jsonResponse("Circuit reset confirmation") },
        },
      },

      "/chat/message": {
        post: {
          summary: "Send chat message (SSE streaming)",
          tags: ["Platform A"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              message: { type: "string" },
              workspaceId: { type: "string" },
              conversationHistory: { type: "array", items: { type: "object", properties: { role: { type: "string" }, content: { type: "string" } } } },
            },
            required: ["message", "workspaceId"],
          }),
          responses: { "200": { description: "SSE stream of chat events", content: { "text/event-stream": {} } } },
        },
      },

      "/agents": {
        get: {
          summary: "List agents for authenticated user",
          tags: ["Platform A"],
          responses: { "200": jsonResponse("Array of agent objects") },
        },
        post: {
          summary: "Create agent",
          tags: ["Platform A"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              name: { type: "string" },
              skills: { type: "array", items: { type: "string" } },
              config: { type: "object" },
            },
            required: ["name"],
          }),
          responses: {
            "201": jsonResponse("Created agent with id"),
          },
        },
      },
      "/agents/{id}": {
        patch: { summary: "Update agent", tags: ["Platform A"], parameters: [idParam], requestBody: jsonBody({ type: "object", properties: { name: { type: "string" }, skills: { type: "array", items: { type: "string" } }, config: { type: "object" } } }), responses: { "200": jsonResponse("Updated agent"), "404": jsonResponse("Agent not found") } },
        delete: { summary: "Delete agent", tags: ["Platform A"], parameters: [idParam], responses: { "204": jsonResponse("Agent deleted"), "404": jsonResponse("Agent not found") } },
      },
      "/agents/{id}/pause": { post: { summary: "Pause agent", tags: ["Platform A"], parameters: [idParam], responses: { "200": jsonResponse("Agent paused") } } },
      "/agents/{id}/resume": { post: { summary: "Resume agent", tags: ["Platform A"], parameters: [idParam], responses: { "200": jsonResponse("Agent resumed") } } },
      "/agents/{id}/outputs": { get: { summary: "Get agent outputs", tags: ["Platform A"], parameters: [idParam], responses: { "200": jsonResponse("Array of agent output objects"), "404": jsonResponse("Agent not found") } } },
      "/agents/{id}/status": { get: { summary: "Get agent status", tags: ["Platform A"], parameters: [idParam], responses: { "200": jsonResponse("Agent status object", { type: "object", properties: { id: { type: "string" }, status: { type: "string" }, updatedAt: { type: "string", format: "date-time" } } }), "404": jsonResponse("Agent not found") } } },

      "/understanding/notifications": { get: { summary: "Get understanding notifications", tags: ["Platform A"], responses: { "200": jsonResponse("Array of notification objects") } } },
      "/understanding/feedback": {
        post: {
          summary: "Submit understanding feedback",
          tags: ["Platform A"],
          requestBody: jsonBody({ type: "object", properties: { itemId: { type: "string" }, feedback: { type: "string", enum: ["helpful", "not_helpful", "dismissed"] } }, required: ["itemId", "feedback"] }),
          responses: { "200": jsonResponse("Feedback recorded") },
        },
      },

      "/metering/usage": {
        get: {
          summary: "Get usage metrics",
          tags: ["Platform A"],
          parameters: [
            { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          ],
          responses: { "200": jsonResponse("Usage data with token counts and costs") },
        },
      },

      "/tasks/escalate": {
        post: {
          summary: "Escalate task for decomposition and dispatch",
          tags: ["Platform A"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              workspaceId: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            },
            required: ["title", "description", "workspaceId"],
          }),
          responses: {
            "201": jsonResponse("Task created with workstreams", {
              type: "object",
              properties: {
                taskId: { type: "string" },
                status: { type: "string" },
                workstreams: { type: "array" },
                totalEstimatedTokens: { type: "number" },
              },
            }),
          },
        },
      },
      "/tasks/{id}": {
        get: {
          summary: "Get full task details with workstreams",
          tags: ["Platform B"],
          parameters: [idParam],
          responses: { "200": jsonResponse("Task object with workstreams array"), "404": jsonResponse("Task not found") },
        },
      },
      "/tasks/{id}/status": { get: { summary: "Get task status", tags: ["Platform A", "Platform B"], parameters: [idParam], responses: { "200": jsonResponse("Task status with workstream summaries"), "404": jsonResponse("Task not found") } } },
      "/tasks/{id}/context": {
        get: {
          summary: "Get task context (scoped knowledge excerpts)",
          tags: ["Platform B"],
          parameters: [idParam],
          responses: {
            "200": jsonResponse("Scoped task context", {
              type: "object",
              properties: { taskId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, priority: { type: "string" } },
            }),
            "404": jsonResponse("Task not found"),
          },
        },
      },
      "/tasks/{id}/deliverables": { get: { summary: "Get task deliverables", tags: ["Platform A"], parameters: [idParam], responses: { "200": jsonResponse("Array of deliverable objects"), "404": jsonResponse("Task not found") } } },
      "/tasks/{id}/deliverable": {
        post: {
          summary: "Submit deliverable",
          tags: ["Platform B"],
          parameters: [idParam],
          requestBody: jsonBody({
            type: "object",
            properties: {
              contractorId: { type: "string" },
              content: { type: "string" },
              workstreamId: { type: "string" },
            },
            required: ["contractorId", "content"],
          }),
          responses: { "201": jsonResponse("Deliverable submitted", { type: "object", properties: { id: { type: "string" }, status: { type: "string" } } }) },
        },
      },
      "/tasks/{id}/revision": {
        post: {
          summary: "Submit revision for a deliverable",
          tags: ["Platform B"],
          parameters: [idParam],
          requestBody: jsonBody({
            type: "object",
            properties: {
              deliverableId: { type: "string" },
              content: { type: "string" },
            },
            required: ["deliverableId", "content"],
          }),
          responses: { "200": jsonResponse("Revision submitted") },
        },
      },
      "/tasks/{id}/clarification": {
        post: {
          summary: "Send clarification message",
          tags: ["Platform B"],
          parameters: [idParam],
          requestBody: jsonBody({
            type: "object",
            properties: {
              senderType: { type: "string", enum: ["contractor", "client", "system"] },
              senderId: { type: "string" },
              message: { type: "string" },
            },
            required: ["senderType", "senderId", "message"],
          }),
          responses: { "201": jsonResponse("Clarification created", { type: "object", properties: { id: { type: "string" } } }) },
        },
      },
      "/tasks/{id}/clarifications": { get: { summary: "Get clarifications for a task", tags: ["Platform A", "Platform B"], parameters: [idParam], responses: { "200": jsonResponse("Array of clarification messages") } } },

      "/dispatch/available-tasks": { get: { summary: "Get available task offers for contractor", tags: ["Platform B"], responses: { "200": jsonResponse("Array of available offers with workstream details") } } },
      "/dispatch/accept": {
        post: {
          summary: "Accept dispatch offer",
          tags: ["Platform B"],
          requestBody: jsonBody({ type: "object", properties: { offerId: { type: "string" } }, required: ["offerId"] }),
          responses: { "200": jsonResponse("Offer accepted"), "400": jsonResponse("Invalid offer") },
        },
      },
      "/dispatch/reject": {
        post: {
          summary: "Reject dispatch offer",
          tags: ["Platform B"],
          requestBody: jsonBody({ type: "object", properties: { offerId: { type: "string" } }, required: ["offerId"] }),
          responses: { "200": jsonResponse("Offer rejected"), "400": jsonResponse("Invalid offer") },
        },
      },

      "/telemetry/prompt": {
        post: {
          summary: "Ingest prompt telemetry event",
          tags: ["Platform B"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              userId: { type: "string" },
              agentId: { type: "string" },
              taskId: { type: "string" },
              contractorId: { type: "string" },
              payload: { type: "object" },
            },
            required: ["payload"],
          }),
          responses: { "201": jsonResponse("Event ingested", { type: "object", properties: { id: { type: "string" } } }) },
        },
      },
      "/telemetry/llm-call": {
        post: {
          summary: "Ingest LLM call telemetry event",
          tags: ["Platform B"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              userId: { type: "string" },
              agentId: { type: "string" },
              taskId: { type: "string" },
              contractorId: { type: "string" },
              payload: { type: "object" },
            },
            required: ["payload"],
          }),
          responses: { "201": jsonResponse("Event ingested", { type: "object", properties: { id: { type: "string" } } }) },
        },
      },
      "/telemetry/session": {
        post: {
          summary: "Ingest generic telemetry event",
          tags: ["Platform B"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              type: { type: "string" },
              userId: { type: "string" },
              agentId: { type: "string" },
              taskId: { type: "string" },
              contractorId: { type: "string" },
              payload: { type: "object" },
            },
            required: ["type", "payload"],
          }),
          responses: { "201": jsonResponse("Event ingested", { type: "object", properties: { id: { type: "string" } } }) },
        },
      },
      "/telemetry/batch": {
        post: {
          summary: "Ingest batch of telemetry events",
          tags: ["Platform B"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    userId: { type: "string" },
                    agentId: { type: "string" },
                    taskId: { type: "string" },
                    contractorId: { type: "string" },
                    payload: { type: "object" },
                  },
                  required: ["type", "payload"],
                },
              },
            },
            required: ["events"],
          }),
          responses: { "201": jsonResponse("Events ingested", { type: "object", properties: { ids: { type: "array", items: { type: "string" } } } }) },
        },
      },
      "/telemetry/scores/{contractorId}": {
        get: {
          summary: "Get contractor performance scores",
          tags: ["Platform B"],
          parameters: [contractorIdParam],
          responses: { "200": jsonResponse("Contractor composite score and dimensions") },
        },
      },
      "/telemetry/benchmarks/{taskType}": {
        get: {
          summary: "Get quality benchmarks by task type",
          tags: ["Platform B"],
          parameters: [taskTypeParam],
          responses: { "200": jsonResponse("Quality benchmarks") },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}
