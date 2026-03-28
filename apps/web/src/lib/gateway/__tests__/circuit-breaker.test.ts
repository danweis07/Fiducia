import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CircuitBreakerRegistry,
  CircuitBreakerError,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "../circuit-breaker";

describe("CircuitBreakerRegistry", () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry({ failureThreshold: 3, cooldownMs: 1000 });
  });

  it("starts in CLOSED state", () => {
    expect(registry.getState("accounts")).toBe("CLOSED");
  });

  it("allows requests in CLOSED state", () => {
    expect(() => registry.checkDomain("accounts")).not.toThrow();
  });

  it("stays CLOSED below failure threshold", () => {
    registry.recordFailure("accounts");
    registry.recordFailure("accounts");
    expect(registry.getState("accounts")).toBe("CLOSED");
    expect(() => registry.checkDomain("accounts")).not.toThrow();
  });

  it("opens after reaching failure threshold", () => {
    for (let i = 0; i < 3; i++) {
      registry.recordFailure("accounts");
    }
    expect(registry.getState("accounts")).toBe("OPEN");
  });

  it("throws CircuitBreakerError when OPEN", () => {
    for (let i = 0; i < 3; i++) {
      registry.recordFailure("accounts");
    }
    expect(() => registry.checkDomain("accounts")).toThrow(CircuitBreakerError);
    expect(() => registry.checkDomain("accounts")).toThrow(/OPEN.*accounts/);
  });

  it("isolates domains", () => {
    for (let i = 0; i < 3; i++) {
      registry.recordFailure("accounts");
    }
    // payments should still be CLOSED
    expect(registry.getState("payments")).toBe("CLOSED");
    expect(() => registry.checkDomain("payments")).not.toThrow();
  });

  it("transitions to HALF_OPEN after cooldown", () => {
    vi.useFakeTimers();

    for (let i = 0; i < 3; i++) {
      registry.recordFailure("accounts");
    }
    expect(registry.getState("accounts")).toBe("OPEN");

    // Advance past cooldown
    vi.advanceTimersByTime(1001);

    // Should allow one probe request
    expect(() => registry.checkDomain("accounts")).not.toThrow();
    expect(registry.getState("accounts")).toBe("HALF_OPEN");

    vi.useRealTimers();
  });

  it("returns to CLOSED on success in HALF_OPEN", () => {
    vi.useFakeTimers();

    for (let i = 0; i < 3; i++) {
      registry.recordFailure("accounts");
    }

    vi.advanceTimersByTime(1001);
    registry.checkDomain("accounts"); // moves to HALF_OPEN

    registry.recordSuccess("accounts");
    expect(registry.getState("accounts")).toBe("CLOSED");

    vi.useRealTimers();
  });

  it("returns to OPEN on failure in HALF_OPEN", () => {
    vi.useFakeTimers();

    for (let i = 0; i < 3; i++) {
      registry.recordFailure("accounts");
    }

    vi.advanceTimersByTime(1001);
    registry.checkDomain("accounts"); // moves to HALF_OPEN

    registry.recordFailure("accounts");
    expect(registry.getState("accounts")).toBe("OPEN");

    vi.useRealTimers();
  });

  it("resets failure count on success", () => {
    registry.recordFailure("accounts");
    registry.recordFailure("accounts");
    registry.recordSuccess("accounts");
    // Should not open after one more failure (count was reset)
    registry.recordFailure("accounts");
    expect(registry.getState("accounts")).toBe("CLOSED");
  });

  it("resetAll resets all circuits", () => {
    for (let i = 0; i < 3; i++) {
      registry.recordFailure("accounts");
      registry.recordFailure("payments");
    }
    expect(registry.getState("accounts")).toBe("OPEN");
    expect(registry.getState("payments")).toBe("OPEN");

    registry.resetAll();
    expect(registry.getState("accounts")).toBe("CLOSED");
    expect(registry.getState("payments")).toBe("CLOSED");
  });

  it("uses default config values", () => {
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold).toBe(5);
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.cooldownMs).toBe(30_000);
  });

  it("creates circuits lazily for new domains", () => {
    // First access should create the circuit
    expect(registry.getState("new-domain")).toBe("CLOSED");
    registry.recordSuccess("new-domain");
    expect(registry.getState("new-domain")).toBe("CLOSED");
  });
});

describe("CircuitBreakerError", () => {
  it("has correct name and message", () => {
    const err = new CircuitBreakerError("payments");
    expect(err.name).toBe("CircuitBreakerError");
    expect(err.message).toContain("payments");
    expect(err.message).toContain("OPEN");
  });

  it("is an instance of Error", () => {
    const err = new CircuitBreakerError("test");
    expect(err).toBeInstanceOf(Error);
  });
});
