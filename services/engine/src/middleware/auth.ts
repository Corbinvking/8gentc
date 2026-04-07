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

const PUBLIC_PATHS = new Set([
  "/health",
  "/openapi.json",
]);

const PUBLIC_PREFIXES = [
  "/internal/",
];

const SERVICE_API_KEY = process.env.SERVICE_API_KEY;

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const path = request.url.split("?")[0] ?? "/";

  if (PUBLIC_PATHS.has(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p))) {
    return;
  }

  const apiKey = request.headers["x-api-key"] as string | undefined;
  if (SERVICE_API_KEY && apiKey && apiKey === SERVICE_API_KEY) {
    request.authUser = { userId: "service", role: "admin" };
    return;
  }

  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = decodeJWT(token);
    request.authUser = {
      userId: decoded.sub,
      role: (decoded.role as "user" | "contractor" | "admin" | undefined) ?? "user",
      plan: decoded.plan,
    };
  } catch (err) {
    return reply.status(401).send({ error: "Invalid token", details: (err as Error).message });
  }
}

function decodeJWT(token: string): { sub: string; role?: string; plan?: string; exp?: number } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url" as BufferEncoding).toString("utf-8")
    );
  } catch {
    throw new Error("Invalid JWT payload encoding");
  }

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Missing or invalid sub claim");
  }

  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
    throw new Error("Token expired");
  }

  return payload as { sub: string; role?: string; plan?: string; exp?: number };
}
