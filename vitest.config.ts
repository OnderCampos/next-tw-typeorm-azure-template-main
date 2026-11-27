import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@/infra": path.resolve(__dirname, "packages/infra/src"),
      "@/domain": path.resolve(__dirname, "packages/domain/src"),
      "@infra": path.resolve(__dirname, "packages/infra/src"),
    },
  },
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.ts"],
    exclude: ["node_modules", "functions/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/lib/**/*.ts",
        "src/app/api/**/*.ts",
        "packages/domain/src/**/*.ts",
        "packages/infra/src/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/database/**", "**/repositories/**", "**/storage/**", "src/lib/hooks/**", "src/lib/utils/auth.utils.ts"],
    },
  },
});
