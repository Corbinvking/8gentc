import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const breakers = new Map<string, CircuitBreakerState>();

const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT_MS = 30_000;

export function getCircuitState(service: string): CircuitBreakerState {
  if (!breakers.has(service)) {
    breakers.set(service, { failures: 0, lastFailure: 0, isOpen: false });
  }
  return breakers.get(service)!;
}

export function recordFailure(service: string): void {
  const state = getCircuitState(service);
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= FAILURE_THRESHOLD) {
    state.isOpen = true;
  }
}

export function recordSuccess(service: string): void {
  const state = getCircuitState(service);
  state.failures = 0;
  state.isOpen = false;
}

export function isServiceAvailable(service: string): boolean {
  const state = getCircuitState(service);
  if (!state.isOpen) return true;

  if (Date.now() - state.lastFailure > RECOVERY_TIMEOUT_MS) {
    state.isOpen = false;
    state.failures = 0;
    return true;
  }

  return false;
}

export async function withGracefulDegradation<T>(
  service: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!isServiceAvailable(service)) {
    return fallback;
  }

  try {
    const result = await fn();
    recordSuccess(service);
    return result;
  } catch {
    recordFailure(service);
    return fallback;
  }
}

export function registerHealthAwareRoutes(app: FastifyInstance): void {
  app.get("/internal/circuits", async () => {
    const circuits: Record<string, CircuitBreakerState> = {};
    for (const [name, state] of breakers) {
      circuits[name] = { ...state };
    }
    return circuits;
  });

  app.post("/internal/circuits/:service/reset", async (request: FastifyRequest) => {
    const { service } = request.params as { service: string };
    breakers.delete(service);
    return { status: "reset", service };
  });
}
