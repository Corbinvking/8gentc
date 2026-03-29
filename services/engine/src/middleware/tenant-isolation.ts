import type { FastifyRequest, FastifyReply } from "fastify";

export async function tenantIsolation(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.authUser) {
    return reply.status(401).send({ error: "Authentication required" });
  }

  if (request.authUser.role === "admin") return;

  const params = request.params as Record<string, string>;
  const query = request.query as Record<string, string>;
  const body = request.body as Record<string, string> | null;

  const requestUserId = params.userId ?? query.userId ?? body?.userId;
  if (requestUserId && requestUserId !== request.authUser.userId) {
    return reply.status(403).send({ error: "Access denied: tenant isolation violation" });
  }
}

export function scopeToTenant(userId: string) {
  return { userId };
}
