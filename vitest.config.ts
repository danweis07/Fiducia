import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "supabase/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "e2e"],
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
      // Map Deno-style URL imports to npm packages so supabase edge function
      // code can be tested in the Node/vitest environment.
      "https://esm.sh/@supabase/supabase-js@2.47.10": "@supabase/supabase-js",
      "https://esm.sh/@supabase/supabase-js@2": "@supabase/supabase-js",
      "https://deno.land/x/zod@v3.22.4/mod.ts": "zod",
      "https://deno.land/std@0.220.0/encoding/base64.ts": path.resolve(
        __dirname,
        "./src/test/deno-shims/base64.ts",
      ),
    },
  },
});
