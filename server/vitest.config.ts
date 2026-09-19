import { defineConfig } from "vitest/config";

// The lobby is a pure reducer, so it tests in plain Node. The Durable Object
// wiring is exercised against a real runtime via `wrangler dev`.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"] },
});
