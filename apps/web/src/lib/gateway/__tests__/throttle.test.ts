import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GatewayThrottle, extractDomain, DEFAULT_RATE_LIMIT } from "../throttle";

describe("extractDomain", () => {
  it('extracts domain from "accounts.list"', () => {
    expect(extractDomain("accounts.list")).toBe("accounts");
  });

  it('extracts domain from "payments.transfer"', () => {
    expect(extractDomain("payments.transfer")).toBe("payments");
  });

  it("returns full string when no dot", () => {
    expect(extractDomain("healthcheck")).toBe("healthcheck");
  });

  it("handles nested actions", () => {
    expect(extractDomain("accounts.transactions.list")).toBe("accounts");
  });
});

describe("GatewayThrottle", () => {
  let throttle: GatewayThrottle;

  afterEach(() => {
    throttle?.destroy();
  });

  it("allows immediate requests under the limit", async () => {
    throttle = new GatewayThrottle({ defaultRpm: 6000 });
    // Should resolve immediately — 6000 RPM = 100/sec burst
    const start = Date.now();
    await throttle.waitForSlot();
    expect(Date.now() - start).toBeLessThan(50);
  });

  it("uses domain-specific bucket when configured", async () => {
    throttle = new GatewayThrottle({
      defaultRpm: 60,
      domainOverrides: { accounts: 6000 },
    });
    // Accounts should be fast (high limit)
    const start = Date.now();
    await throttle.waitForSlot("accounts");
    expect(Date.now() - start).toBeLessThan(50);
  });

  it("falls back to default bucket for unknown domains", async () => {
    throttle = new GatewayThrottle({
      defaultRpm: 6000,
      domainOverrides: { accounts: 60 },
    });
    // "payments" not in overrides, uses default (high limit)
    const start = Date.now();
    await throttle.waitForSlot("payments");
    expect(Date.now() - start).toBeLessThan(50);
  });

  it("updateConfig replaces configuration", async () => {
    throttle = new GatewayThrottle({ defaultRpm: 60 });
    throttle.updateConfig({ defaultRpm: 6000 });
    const start = Date.now();
    await throttle.waitForSlot();
    expect(Date.now() - start).toBeLessThan(50);
  });

  it("destroy resolves pending requests", async () => {
    throttle = new GatewayThrottle({ defaultRpm: 60 }); // Very low rate
    // Exhaust the burst capacity
    await throttle.waitForSlot();
    // Queue a request, then destroy — should resolve without hanging
    const promise = throttle.waitForSlot();
    throttle.destroy();
    await expect(promise).resolves.toBeUndefined();
  });
});

describe("DEFAULT_RATE_LIMIT", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_RATE_LIMIT.defaultRpm).toBe(1000);
  });
});
