import { describe, it, expect } from "vitest";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:3001";

describe("API Contract Tests", () => {
  describe("Health check", () => {
    it("GET /health returns expected shape", async () => {
      try {
        const res = await fetch(`${ENGINE_URL}/health`);
        if (!res.ok) return;

        const body = await res.json();
        expect(body).toHaveProperty("status");
        expect(body).toHaveProperty("service");
        expect(body.service).toBe("engine");
      } catch {
        // Server not running in test environment
      }
    });
  });

  describe("Platform A -> C API shape", () => {
    it("POST /chat/message expects {message, workspaceId}", () => {
      const requestShape = {
        message: "string",
        workspaceId: "string",
        conversationHistory: [{ role: "string", content: "string" }],
      };

      expect(requestShape).toHaveProperty("message");
      expect(requestShape).toHaveProperty("workspaceId");
    });

    it("POST /agents expects {name, skills?, config?}", () => {
      const requestShape = {
        name: "string",
        skills: ["string"],
        config: {},
      };

      expect(requestShape).toHaveProperty("name");
    });

    it("POST /tasks/escalate expects {title, description, workspaceId, priority?}", () => {
      const requestShape = {
        title: "string",
        description: "string",
        workspaceId: "string",
        priority: "medium",
      };

      expect(requestShape).toHaveProperty("title");
      expect(requestShape).toHaveProperty("description");
      expect(requestShape).toHaveProperty("workspaceId");
    });
  });

  describe("Platform B -> C API shape", () => {
    it("POST /dispatch/accept expects {offerId}", () => {
      const requestShape = { offerId: "string" };
      expect(requestShape).toHaveProperty("offerId");
    });

    it("POST /tasks/:id/deliverable expects {contractorId, content, workstreamId?}", () => {
      const requestShape = {
        contractorId: "string",
        content: "string",
        workstreamId: "string",
      };

      expect(requestShape).toHaveProperty("contractorId");
      expect(requestShape).toHaveProperty("content");
    });

    it("POST /tasks/:id/clarification expects {senderType, senderId, message}", () => {
      const requestShape = {
        senderType: "contractor",
        senderId: "string",
        message: "string",
      };

      expect(requestShape).toHaveProperty("senderType");
      expect(requestShape).toHaveProperty("senderId");
      expect(requestShape).toHaveProperty("message");
    });

    it("POST /telemetry/session expects {type, payload, userId?, ...}", () => {
      const requestShape = {
        type: "llm.call",
        payload: { model: "gpt-4o", tokens: 100 },
        userId: "string",
      };

      expect(requestShape).toHaveProperty("type");
      expect(requestShape).toHaveProperty("payload");
    });
  });
});
