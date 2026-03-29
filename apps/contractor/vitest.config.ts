import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@8gent/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@8gent/api-client/platform-c": path.resolve(__dirname, "../../packages/api-client/src/platform-c.ts"),
      "@8gent/api-client/platform-b": path.resolve(__dirname, "../../packages/api-client/src/platform-b.ts"),
      "@8gent/api-client": path.resolve(__dirname, "../../packages/api-client/src/index.ts"),
    },
  },
});
