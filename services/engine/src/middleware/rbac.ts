import type { FastifyRequest, FastifyReply } from "fastify";
import type { AuthUser } from "./auth.js";

type Role = AuthUser["role"];

export function requireRole(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.authUser) {
      return reply.status(401).send({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(request.authUser.role)) {
      return reply.status(403).send({
        error: "Insufficient permissions",
        required: allowedRoles,
        current: request.authUser.role,
      });
    }
  };
}

export const requireAdmin = requireRole("admin");
export const requireContractor = requireRole("contractor", "admin");
export const requireUser = requireRole("user", "admin");
