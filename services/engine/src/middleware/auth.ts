import type { FastifyRequest, FastifyReply } from "fastify";

export interface AuthUser {
  userId: string;
  role: "user" | "contractor" | "admin";
  plan?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = decodeJWT(token);
    request.authUser = {
      userId: decoded.sub,
      role: decoded.role ?? "user",
      plan: decoded.plan,
    };
  } catch {
    return reply.status(401).send({ error: "Invalid token" });
  }
}

function decodeJWT(token: string): { sub: string; role?: string; plan?: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT");

  const payload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf-8")
  );

  if (!payload.sub) throw new Error("Missing sub claim");
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error("Token expired");
  }

  return payload;
}
