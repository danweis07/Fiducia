import { describe, it, expect, vi, beforeEach } from "vitest";
import { appCache, CACHE_KEYS, CACHE_TTL, createCachedFunction } from "../cache";

describe("MemoryCache (appCache)", () => {
  beforeEach(() => {
    appCache.clear();
  });

  it("stores and retrieves a value", () => {
    appCache.set("key1", "value1");
    expect(appCache.get("key1")).toBe("value1");
  });

  it("returns undefined for missing key", () => {
    expect(appCache.get("nonexistent")).toBeUndefined();
  });

  it("returns undefined for expired key", () => {
    vi.useFakeTimers();
    appCache.set("key1", "value1", 1000);
    vi.advanceTimersByTime(1001);
    expect(appCache.get("key1")).toBeUndefined();
    vi.useRealTimers();
  });

  it("respects custom TTL", () => {
    vi.useFakeTimers();
    appCache.set("key1", "value1", 5000);
    vi.advanceTimersByTime(4000);
    expect(appCache.get("key1")).toBe("value1");
    vi.advanceTimersByTime(2000);
    expect(appCache.get("key1")).toBeUndefined();
    vi.useRealTimers();
  });

  it("deletes a value", () => {
    appCache.set("key1", "value1");
    expect(appCache.delete("key1")).toBe(true);
    expect(appCache.get("key1")).toBeUndefined();
  });

  it("delete returns false for missing key", () => {
    expect(appCache.delete("nonexistent")).toBe(false);
  });

  it("clears all values", () => {
    appCache.set("a", 1);
    appCache.set("b", 2);
    appCache.clear();
    expect(appCache.get("a")).toBeUndefined();
    expect(appCache.get("b")).toBeUndefined();
  });

  it("clears values by prefix", () => {
    appCache.set("user:1:name", "Alice");
    appCache.set("user:2:name", "Bob");
    appCache.set("firm:1:name", "Acme");
    appCache.clearPrefix("user:");
    expect(appCache.get("user:1:name")).toBeUndefined();
    expect(appCache.get("user:2:name")).toBeUndefined();
    expect(appCache.get("firm:1:name")).toBe("Acme");
  });

  it("getOrFetch returns cached value on hit", async () => {
    appCache.set("key1", "cached");
    const fetcher = vi.fn().mockResolvedValue("fresh");
    const result = await appCache.getOrFetch("key1", fetcher);
    expect(result).toBe("cached");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("getOrFetch calls fetcher on miss", async () => {
    const fetcher = vi.fn().mockResolvedValue("fresh");
    const result = await appCache.getOrFetch("key1", fetcher);
    expect(result).toBe("fresh");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("getOrFetch caches the fetched value", async () => {
    const fetcher = vi.fn().mockResolvedValue("fresh");
    await appCache.getOrFetch("key1", fetcher);
    expect(appCache.get("key1")).toBe("fresh");
  });

  it("returns stats", () => {
    appCache.set("a", 1);
    appCache.set("b", 2);
    const stats = appCache.stats();
    expect(stats.size).toBe(2);
    expect(stats.keys).toContain("a");
    expect(stats.keys).toContain("b");
  });

  it("stores complex objects", () => {
    const obj = { name: "test", nested: { arr: [1, 2, 3] } };
    appCache.set("obj", obj);
    expect(appCache.get("obj")).toEqual(obj);
  });
});

describe("CACHE_KEYS", () => {
  it("has static keys", () => {
    expect(CACHE_KEYS.SCORE_WEIGHTS).toBe("scoring:weights");
    expect(CACHE_KEYS.INTEGRATION_PROVIDERS).toBe("integrations:providers");
  });

  it("has parameterized keys", () => {
    expect(CACHE_KEYS.FIRM_SETTINGS("firm-1")).toBe("firm:firm-1:settings");
    expect(CACHE_KEYS.USER_PERMISSIONS("user-1")).toBe("user:user-1:permissions");
    expect(CACHE_KEYS.PROPERTY_STATS("firm-2")).toBe("firm:firm-2:property-stats");
  });
});

describe("CACHE_TTL", () => {
  it("has correct values", () => {
    expect(CACHE_TTL.SHORT).toBe(60 * 1000);
    expect(CACHE_TTL.MEDIUM).toBe(5 * 60 * 1000);
    expect(CACHE_TTL.LONG).toBe(30 * 60 * 1000);
    expect(CACHE_TTL.VERY_LONG).toBe(60 * 60 * 1000);
  });
});

describe("createCachedFunction", () => {
  beforeEach(() => {
    appCache.clear();
  });

  it("caches function results", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const cached = createCachedFunction(fn, (x: number) => `key:${x}`);
    const result1 = await cached(5);
    const result2 = await cached(5);
    expect(result1).toBe(42);
    expect(result2).toBe(42);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("caches different keys separately", async () => {
    const fn = vi.fn().mockImplementation((x: number) => Promise.resolve(x * 2));
    const cached = createCachedFunction(fn, (x: number) => `key:${x}`);
    await cached(5);
    await cached(10);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
