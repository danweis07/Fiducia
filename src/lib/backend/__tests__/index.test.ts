import { describe, it, expect, vi, beforeEach } from "vitest";

// Must mock before import
vi.mock("../supabase-provider", () => ({
  createSupabaseProvider: vi.fn(() => ({
    name: "supabase",
    auth: {},
    gateway: {},
    realtime: { type: "supabase", subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) },
  })),
}));

vi.mock("../rest-provider", () => ({
  createRestProvider: vi.fn(() => ({
    name: "rest",
    auth: {},
    gateway: {},
    realtime: { type: "polling", subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) },
  })),
}));

import { getBackend, resetBackend } from "../index";
import { createSupabaseProvider } from "../supabase-provider";
import { createRestProvider } from "../rest-provider";

describe("Backend Provider Registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetBackend();
    // Reset env
    vi.stubEnv("VITE_BACKEND_PROVIDER", "");
    vi.stubEnv("VITE_REALTIME_CHANNEL_PROVIDER", "");
  });

  it("defaults to supabase provider", () => {
    const backend = getBackend();
    expect(backend.name).toBe("supabase");
    expect(createSupabaseProvider).toHaveBeenCalled();
  });

  it("caches provider on subsequent calls", () => {
    const first = getBackend();
    const second = getBackend();
    expect(first).toBe(second);
    expect(createSupabaseProvider).toHaveBeenCalledTimes(1);
  });

  it("resetBackend clears the cache", () => {
    getBackend();
    resetBackend();
    getBackend();
    expect(createSupabaseProvider).toHaveBeenCalledTimes(2);
  });

  it("selects rest provider via env var", () => {
    vi.stubEnv("VITE_BACKEND_PROVIDER", "rest");
    const backend = getBackend();
    expect(backend.name).toBe("rest");
    expect(createRestProvider).toHaveBeenCalled();
  });
});
