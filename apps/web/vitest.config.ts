import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    env: {
      VITE_DEMO_MODE: "true",
      VITE_SUPABASE_URL: "https://placeholder.supabase.co",
      VITE_SUPABASE_ANON_KEY: "placeholder-anon-key",
    },
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      // Include supabase _shared AI/utility tests (pure TS, no Deno URLs).
      "../../supabase/functions/_shared/**/*.{test,spec}.ts",
    ],
    exclude: [
      "node_modules",
      "e2e",
      // Gateway tests use Deno-native HTTPS imports that Node cannot resolve.
      // Run these with `deno test` instead.
      "../../supabase/functions/gateway/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/components/ui/**", "src/**/*.test.*", "src/**/*.spec.*", "src/test/**"],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 40,
        lines: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Allow web workspace tests to import supabase edge function code via
      // the same relative path prefix used in existing test files.
      "../../../supabase/functions": path.resolve(__dirname, "../../supabase/functions"),
    },
  },
});
