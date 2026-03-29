import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { db } from "../../lib/db.js";
import { agents, agentOutputs } from "@8gent/db";
import { eq, and } from "drizzle-orm";

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/agents", async (request) => {
    const userId = request.authUser!.userId;
    return db.select().from(agents).where(eq(agents.ownerId, userId));
  });

  app.post("/agents", async (request, reply) => {
    const userId = request.authUser!.userId;
    const { name, skills, config } = request.body as {
      name: string;
      skills?: string[];
      config?: Record<string, unknown>;
    };

    const id = nanoid();
    const now = new Date();

    await db.insert(agents).values({
      id,
      name,
      ownerId: userId,
      status: "idle",
      skills: skills ?? [],
      config: config ?? {},
      createdAt: now,
      updatedAt: now,
    });

    return reply.status(201).send({
      id,
      name,
      ownerId: userId,
      status: "idle",
      skills: skills ?? [],
      config: config ?? {},
      createdAt: now,
      updatedAt: now,
    });
  });

  app.patch("/agents/:id", async (request, reply) => {
    const userId = request.authUser!.userId;
    const { id } = request.params as { id: string };
    const updates = request.body as Record<string, unknown>;

    const [existing] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.ownerId, userId)));

    if (!existing) return reply.status(404).send({ error: "Agent not found" });

    const allowed: Record<string, unknown> = {};
    if (updates.name) allowed.name = updates.name;
    if (updates.skills) allowed.skills = updates.skills;
    if (updates.config) allowed.config = { ...(existing.config as object), ...(updates.config as object) };

    await db
      .update(agents)
      .set({ ...allowed, updatedAt: new Date() })
      .where(eq(agents.id, id));

    return { ...existing, ...allowed, updatedAt: new Date() };
  });

  app.delete("/agents/:id", async (request, reply) => {
    const userId = request.authUser!.userId;
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.ownerId, userId)));

    if (!existing) return reply.status(404).send({ error: "Agent not found" });

    await db.delete(agents).where(eq(agents.id, id));
    return reply.status(204).send();
  });

  app.get("/agents/:id/outputs", async (request, reply) => {
    const userId = request.authUser!.userId;
    const { id } = request.params as { id: string };

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.ownerId, userId)));

    if (!agent) return reply.status(404).send({ error: "Agent not found" });

    return db.select().from(agentOutputs).where(eq(agentOutputs.agentId, id));
  });

  app.get("/agents/:id/status", async (request, reply) => {
    const userId = request.authUser!.userId;
    const { id } = request.params as { id: string };

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.ownerId, userId)));

    if (!agent) return reply.status(404).send({ error: "Agent not found" });

    return { id: agent.id, status: agent.status, updatedAt: agent.updatedAt };
  });

  app.post("/agents/:id/pause", async (request, reply) => {
    const userId = request.authUser!.userId;
    const { id } = request.params as { id: string };

    await db
      .update(agents)
      .set({ status: "paused", updatedAt: new Date() })
      .where(and(eq(agents.id, id), eq(agents.ownerId, userId)));

    return { status: "paused" };
  });

  app.post("/agents/:id/resume", async (request, reply) => {
    const userId = request.authUser!.userId;
    const { id } = request.params as { id: string };

    await db
      .update(agents)
      .set({ status: "running", updatedAt: new Date() })
      .where(and(eq(agents.id, id), eq(agents.ownerId, userId)));

    return { status: "running" };
  });
}
