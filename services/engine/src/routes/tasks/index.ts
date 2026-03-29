import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { db } from "../../lib/db.js";
import { tasks, deliverables, clarifications, workstreams } from "@8gent/db";
import { eq, and } from "drizzle-orm";
import { decomposeTask } from "../../services/task-decomposition/decomposer.js";

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  // Platform A: escalate a task
  app.post("/tasks/escalate", async (request, reply) => {
    const userId = request.authUser!.userId;
    const { title, description, workspaceId, priority } = request.body as {
      title: string;
      description: string;
      workspaceId: string;
      priority?: string;
    };

    const taskId = nanoid();
    const now = new Date();

    await db.insert(tasks).values({
      id: taskId,
      title,
      description,
      status: "pending",
      priority: priority ?? "medium",
      createdById: userId,
      workspaceId,
      createdAt: now,
      updatedAt: now,
    });

    const decomposition = await decomposeTask({
      taskId,
      description,
      userId,
    });

    await db
      .update(tasks)
      .set({ status: "assigned", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    return reply.status(201).send({
      taskId,
      status: "assigned",
      workstreams: decomposition.workstreams,
      totalEstimatedTokens: decomposition.totalEstimatedTokens,
    });
  });

  // Platform A: get task status
  app.get("/tasks/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return reply.status(404).send({ error: "Task not found" });

    const taskWorkstreams = await db
      .select()
      .from(workstreams)
      .where(eq(workstreams.taskId, id));

    return {
      taskId: task.id,
      status: task.status,
      workstreams: taskWorkstreams.map((w) => ({
        id: w.id,
        title: w.title,
        status: w.status,
        domain: w.domain,
      })),
    };
  });

  // Platform A: get deliverables
  app.get("/tasks/:id/deliverables", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return reply.status(404).send({ error: "Task not found" });

    const taskDeliverables = await db
      .select()
      .from(deliverables)
      .where(eq(deliverables.taskId, id));

    return taskDeliverables;
  });

  // Platform B: get full task details (scoped)
  app.get("/tasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return reply.status(404).send({ error: "Task not found" });

    const taskWorkstreams = await db
      .select()
      .from(workstreams)
      .where(eq(workstreams.taskId, id));

    return { ...task, workstreams: taskWorkstreams };
  });

  // Platform B: get task context (knowledge excerpts)
  app.get("/tasks/:id/context", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return reply.status(404).send({ error: "Task not found" });

    return {
      taskId: id,
      description: task.description,
      title: task.title,
      priority: task.priority,
    };
  });

  // Platform B: submit deliverable
  app.post("/tasks/:id/deliverable", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { workstreamId, contractorId, content } = request.body as {
      workstreamId?: string;
      contractorId: string;
      content: string;
    };

    const deliverableId = nanoid();
    await db.insert(deliverables).values({
      id: deliverableId,
      taskId: id,
      workstreamId,
      contractorId,
      content,
      status: "submitted",
      submittedAt: new Date(),
    });

    return reply.status(201).send({ id: deliverableId, status: "submitted" });
  });

  // Platform B: submit revision
  app.post("/tasks/:id/revision", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { deliverableId, content } = request.body as {
      deliverableId: string;
      content: string;
    };

    await db
      .update(deliverables)
      .set({ content, status: "submitted", submittedAt: new Date(), reviewedAt: null })
      .where(eq(deliverables.id, deliverableId));

    return { status: "revision_submitted" };
  });

  // Platform B: send clarification
  app.post("/tasks/:id/clarification", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { senderType, senderId, message } = request.body as {
      senderType: string;
      senderId: string;
      message: string;
    };

    const clarificationId = nanoid();
    await db.insert(clarifications).values({
      id: clarificationId,
      taskId: id,
      senderType,
      senderId,
      message,
      createdAt: new Date(),
    });

    return reply.status(201).send({ id: clarificationId });
  });

  // Both: get clarifications
  app.get("/tasks/:id/clarifications", async (request) => {
    const { id } = request.params as { id: string };
    return db.select().from(clarifications).where(eq(clarifications.taskId, id));
  });
}
