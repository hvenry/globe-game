import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Only the tsconfig `@/` alias, so modules that import through it (the
// stores) can be tested; everything else stays at vitest's defaults.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
