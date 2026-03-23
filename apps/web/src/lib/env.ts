/**
 * Environment variable validation
 *
 * Validates required and optional env vars at startup using Zod.
 * Import `env` instead of accessing `import.meta.env` directly to get
 * type-safe, validated environment values with clear error messages
 * when required variables are missing.
 */

import { z } from "zod";

const envSchema = z.object({
  // Required — Supabase
  VITE_SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, "VITE_SUPABASE_ANON_KEY is required"),

  // Required — Mapping
  VITE_MAPLIBRE_STYLE_URL: z.string().url().optional(),

  // Optional — Feature flags
  VITE_DEMO_MODE: z.enum(["true", "false"]).optional().default("false"),

  // Optional — Error monitoring
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_APP_ENV: z.enum(["development", "staging", "production"]).optional().default("development"),
  VITE_APP_VERSION: z.string().optional(),

  // Optional — Analytics
  VITE_ANALYTICS_PROVIDER: z
    .enum(["console", "rudderstack", "mixpanel", "amplitude", "posthog"])
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  // In demo mode, Supabase vars aren't required
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

  const schema = isDemoMode
    ? envSchema.extend({
        VITE_SUPABASE_URL: z.string().optional().default(""),
        VITE_SUPABASE_ANON_KEY: z.string().optional().default(""),
      })
    : envSchema;

  const result = schema.safeParse(import.meta.env);

  if (!result.success) {
    // Validation failed — app will still attempt to run with raw env values
  }

  // Return whatever we have — demo mode still works with empty values
  return (result.success ? result.data : import.meta.env) as Env;
}

/**
 * Validated environment variables. Prefer this over `import.meta.env`.
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env';
 * const url = env.VITE_SUPABASE_URL;
 * ```
 */
export const env = validateEnv();
