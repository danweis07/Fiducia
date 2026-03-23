import { describe, it, expect } from "vitest";

describe("env", () => {
  it("exports env object", async () => {
    const { env } = await import("../env");
    expect(env).toBeDefined();
    expect(typeof env).toBe("object");
  });

  it("env is accessible and does not throw", async () => {
    const mod = await import("../env");
    // The module should export env and Env type without throwing
    expect(mod).toBeDefined();
    expect(mod.env).toBeDefined();
  });

  it("env object can be read without errors", async () => {
    const { env } = await import("../env");
    // Accessing properties should not throw, even if values are undefined in test env
    const supabaseUrl = env.VITE_SUPABASE_URL;
    expect(supabaseUrl === undefined || typeof supabaseUrl === "string").toBe(true);
  });
});
