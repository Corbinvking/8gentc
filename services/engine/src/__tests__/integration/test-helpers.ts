const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:3001";
const LLM_GATEWAY_URL = process.env.LLM_GATEWAY_URL ?? "http://localhost:3002";
const AGENT_HOST_URL = process.env.AGENT_HOST_URL ?? "http://localhost:3003";

export function createTestJWT(payload: {
  sub: string;
  role?: string;
  plan?: string;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: payload.sub,
      role: payload.role ?? "user",
      plan: payload.plan ?? "pro",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString("base64url");
  const signature = Buffer.from("test-signature").toString("base64url");
  return `${header}.${body}.${signature}`;
}

export async function engineRequest(
  path: string,
  options: RequestInit & { userId?: string; role?: string } = {}
): Promise<Response> {
  const { userId = "test-user-1", role = "user", ...fetchOpts } = options;
  const token = createTestJWT({ sub: userId, role });

  return fetch(`${ENGINE_URL}${path}`, {
    ...fetchOpts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...fetchOpts.headers,
    },
  });
}

export async function engineJSON<T = unknown>(
  path: string,
  options: RequestInit & { userId?: string; role?: string } = {}
): Promise<{ status: number; body: T }> {
  const res = await engineRequest(path, options);
  const body = await res.json();
  return { status: res.status, body: body as T };
}

export async function gatewayRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${LLM_GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function gatewayJSON<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; body: T }> {
  const res = await gatewayRequest(path, options);
  const body = await res.json();
  return { status: res.status, body: body as T };
}

export async function agentHostRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${AGENT_HOST_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function agentHostJSON<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; body: T }> {
  const res = await agentHostRequest(path, options);
  const body = await res.json();
  return { status: res.status, body: body as T };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readSSE(
  url: string,
  body: Record<string, unknown>,
  userId = "test-user-1"
): Promise<Array<{ type: string; [key: string]: unknown }>> {
  const token = createTestJWT({ sub: userId });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const events: Array<{ type: string; [key: string]: unknown }> = [];
  const reader = res.body?.getReader();
  if (!reader) return events;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          events.push(JSON.parse(line.slice(6)));
        } catch { /* skip */ }
      }
    }
  }

  return events;
}
