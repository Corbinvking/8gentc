import { describe, it, expect, vi } from "vitest";

describe("Webhook handlers", () => {
  describe("Clerk webhook", () => {
    it("rejects requests without svix headers", async () => {
      const response = await fetch("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => ({ status: 400 }));

      expect(response.status).toBe(400);
    });
  });

  describe("Stripe webhook", () => {
    it("rejects requests without stripe signature", async () => {
      const response = await fetch(
        "http://localhost:3000/api/webhooks/stripe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      ).catch(() => ({ status: 400 }));

      expect(response.status).toBe(400);
    });
  });
});
