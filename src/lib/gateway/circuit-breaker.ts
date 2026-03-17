/**
 * Circuit Breaker — Prevents cascading failures
 *
 * Three states:
 *   CLOSED  → normal operation, failures are counted
 *   OPEN    → requests are rejected immediately (fail fast)
 *   HALF_OPEN → a single probe request is allowed through
 *
 * Configurable per-domain with tenant-level settings.
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening. Default: 5 */
  failureThreshold: number;
  /** Milliseconds to wait before moving from OPEN to HALF_OPEN. Default: 30000 */
  cooldownMs: number;
}

export class CircuitBreakerError extends Error {
  constructor(domain: string) {
    super(`Circuit breaker OPEN for domain "${domain}". Requests are temporarily rejected.`);
    this.name = "CircuitBreakerError";
  }
}

class DomainCircuit {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private lastFailureTime = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  canRequest(): boolean {
    switch (this.state) {
      case "CLOSED":
        return true;
      case "OPEN": {
        const elapsed = Date.now() - this.lastFailureTime;
        if (elapsed >= this.config.cooldownMs) {
          this.state = "HALF_OPEN";
          return true; // Allow one probe
        }
        return false;
      }
      case "HALF_OPEN":
        return false; // Already probing
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
  }

  recordFailure(): void {
    this.failures += 1;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      return;
    }

    if (this.failures >= this.config.failureThreshold) {
      this.state = "OPEN";
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = "CLOSED";
    this.failures = 0;
  }
}

export class CircuitBreakerRegistry {
  private circuits: Map<string, DomainCircuit> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      cooldownMs: config.cooldownMs ?? 30_000,
    };
  }

  private getCircuit(domain: string): DomainCircuit {
    let circuit = this.circuits.get(domain);
    if (!circuit) {
      circuit = new DomainCircuit(this.config);
      this.circuits.set(domain, circuit);
    }
    return circuit;
  }

  /**
   * Check if a request to this domain should proceed.
   * Throws CircuitBreakerError if the circuit is open.
   */
  checkDomain(domain: string): void {
    const circuit = this.getCircuit(domain);
    if (!circuit.canRequest()) {
      throw new CircuitBreakerError(domain);
    }
  }

  /** Record a successful response for a domain */
  recordSuccess(domain: string): void {
    this.getCircuit(domain).recordSuccess();
  }

  /** Record a failed response for a domain */
  recordFailure(domain: string): void {
    this.getCircuit(domain).recordFailure();
  }

  /** Get the current state of a domain's circuit */
  getState(domain: string): CircuitState {
    return this.getCircuit(domain).getState();
  }

  /** Reset all circuits */
  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
  }
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 30_000,
};
