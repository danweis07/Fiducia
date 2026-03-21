import { describe, it, expect } from "vitest";
import { getStaleTime, DEFAULT_CACHE_POLICY } from "../cache-config";

describe("DEFAULT_CACHE_POLICY", () => {
  it("has 5 minute default stale time", () => {
    expect(DEFAULT_CACHE_POLICY.defaultStaleTimeMs).toBe(5 * 60 * 1000);
  });

  it("has domain overrides for banking data", () => {
    const overrides = DEFAULT_CACHE_POLICY.domainOverrides!;
    expect(overrides.transactions).toBe(60 * 1000); // 1 min
    expect(overrides.accounts).toBe(2 * 60 * 1000); // 2 min
    expect(overrides.member).toBe(10 * 60 * 1000); // 10 min
    expect(overrides.content).toBe(15 * 60 * 1000); // 15 min
  });
});

describe("getStaleTime", () => {
  it("returns built-in domain override for known domains", () => {
    expect(getStaleTime("transactions")).toBe(60 * 1000);
    expect(getStaleTime("accounts")).toBe(2 * 60 * 1000);
    expect(getStaleTime("member")).toBe(10 * 60 * 1000);
  });

  it("returns global default for unknown domains", () => {
    expect(getStaleTime("unknown-domain")).toBe(5 * 60 * 1000);
  });

  it("prefers tenant domain override over built-in", () => {
    const tenantPolicy = {
      defaultStaleTimeMs: 30_000,
      domainOverrides: { transactions: 10_000 },
    };
    expect(getStaleTime("transactions", tenantPolicy)).toBe(10_000);
  });

  it("uses built-in domain override even when tenant default is set", () => {
    const tenantPolicy = {
      defaultStaleTimeMs: 30_000,
    };
    // "accounts" has a built-in override of 2 min, should use that
    expect(getStaleTime("accounts", tenantPolicy)).toBe(2 * 60 * 1000);
  });

  it("uses tenant default for unknown domains when set", () => {
    const tenantPolicy = {
      defaultStaleTimeMs: 30_000,
    };
    expect(getStaleTime("custom-domain", tenantPolicy)).toBe(30_000);
  });

  it("handles null tenant policy", () => {
    expect(getStaleTime("accounts", null)).toBe(2 * 60 * 1000);
  });

  it("handles undefined tenant policy", () => {
    expect(getStaleTime("accounts", undefined)).toBe(2 * 60 * 1000);
  });
});
