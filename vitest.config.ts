import { defineConfig } from "vitest/config";

// Separate from vite.config.ts on purpose: vitest ships its own vite copy, and sharing
// one config file makes the two plugin type universes collide. The engine tests need
// neither React nor Tailwind — only JSON glob imports, which plain vite handles.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: { include: ["src/engine/**"], thresholds: { lines: 80, functions: 80 } },
  },
});
