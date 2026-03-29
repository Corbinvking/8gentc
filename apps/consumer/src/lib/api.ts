import { platformCClient } from "@8gent/api-client/platform-c";

export { platformCClient };

export const API_BASE_URL =
  process.env.ENGINE_API_URL ?? "http://localhost:3001";
