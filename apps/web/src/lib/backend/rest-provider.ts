/**
 * REST API Backend Provider
 *
 * Generic REST/HTTP provider for non-Supabase backends.
 * Implements BackendProvider using standard HTTP endpoints:
 *   - POST /api/auth/login, /api/auth/register, /api/auth/logout
 *   - POST /api/gateway (RPC)
 *   - GET  /api/realtime (polling fallback)
 *
 * Configure via environment variables:
 *   VITE_API_BASE_URL — Base URL for all API calls (e.g., https://api.example.com)
 */

import type {
  BackendProvider,
  AuthProvider,
  AuthUser,
  AuthSession,
  AuthResult,
  AuthChangeCallback,
  Unsubscribe,
  GatewayTransport,
  GatewayInvokeOptions,
  GatewayRawResponse,
  RealtimeProvider,
  RealtimeSubscription,
} from "./types";
import type { TenantContext as TenantContextType } from "@/types";
import { getRolePermissions } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/** Maximum retry attempts for transient failures */
const MAX_RETRIES = 3;
/** Base delay for exponential backoff (ms) */
const BASE_DELAY_MS = 1000;

// =============================================================================
// HTTP HELPERS
// =============================================================================

function getStoredToken(): string | null {
  try {
    const session = sessionStorage.getItem("rest_session");
    if (!session) return null;
    return JSON.parse(session).accessToken ?? null;
  } catch {
    return null;
  }
}

function storeSession(session: AuthSession | null): void {
  if (session) {
    sessionStorage.setItem("rest_session", JSON.stringify(session));
  } else {
    sessionStorage.removeItem("rest_session");
  }
}

/** Check if an error is retryable (5xx or network error, never 4xx) */
function isRetryable(status: number): boolean {
  return status >= 500 && status < 600;
}

/** Sleep helper that respects AbortSignal */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

interface ApiCallOptions {
  signal?: AbortSignal;
  /** Maximum retries. Defaults to MAX_RETRIES for gateway, 0 for auth. */
  maxRetries?: number;
}

async function apiCall<T>(
  path: string,
  body?: unknown,
  options?: AbortSignal | ApiCallOptions,
): Promise<T> {
  // Support both AbortSignal (backward compat) and options object
  const opts: ApiCallOptions =
    options instanceof AbortSignal ? { signal: options } : (options ?? {});
  const { signal, maxRetries = MAX_RETRIES } = opts;
  const token = getStoredToken();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        const error = new Error(err.message ?? `HTTP ${res.status}`);

        // Only retry on 5xx, never on 4xx
        if (isRetryable(res.status) && attempt < maxRetries) {
          lastError = error;
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt), signal);
          continue;
        }
        throw error;
      }
      return res.json();
    } catch (err) {
      // Don't retry aborted requests
      if (err instanceof DOMException && err.name === "AbortError") throw err;

      // Retry network errors
      if (attempt < maxRetries && !(err instanceof Error && err.message.startsWith("HTTP "))) {
        lastError = err instanceof Error ? err : new Error(String(err));
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt), signal);
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}

// =============================================================================
// AUTH PROVIDER
// =============================================================================

class RestAuthProvider implements AuthProvider {
  private changeCallbacks: AuthChangeCallback[] = [];

  async getSession() {
    const stored = sessionStorage.getItem("rest_session");
    if (!stored) return null;
    try {
      const session: AuthSession = JSON.parse(stored);
      return { user: session.user, session };
    } catch {
      return null;
    }
  }

  onAuthStateChange(callback: AuthChangeCallback): Unsubscribe {
    this.changeCallbacks.push(callback);
    return {
      unsubscribe: () => {
        this.changeCallbacks = this.changeCallbacks.filter((cb) => cb !== callback);
      },
    };
  }

  private notifyChange(event: "SIGNED_IN" | "SIGNED_OUT", session: AuthSession | null) {
    this.changeCallbacks.forEach((cb) => cb(event, session));
  }

  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    try {
      const data = await apiCall<{ user: AuthUser; accessToken: string; refreshToken?: string }>(
        "/api/auth/login",
        { email, password },
        { maxRetries: 0 },
      );
      const session: AuthSession = {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
      storeSession(session);
      this.notifyChange("SIGNED_IN", session);
      return { user: data.user, session, error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Sign in failed") };
    }
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      const data = await apiCall<{ user: AuthUser; accessToken?: string }>(
        "/api/auth/register",
        { email, password },
        { maxRetries: 0 },
      );
      const session: AuthSession | undefined = data.accessToken
        ? { user: data.user, accessToken: data.accessToken }
        : undefined;
      if (session) storeSession(session);
      return { user: data.user, session, error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Sign up failed") };
    }
  }

  async signOut(): Promise<void> {
    try {
      await apiCall("/api/auth/logout", undefined, { maxRetries: 0 });
    } catch {
      // Best effort
    }
    storeSession(null);
    this.notifyChange("SIGNED_OUT", null);
  }

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      await apiCall("/api/auth/reset-password", { email }, { maxRetries: 0 });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Reset failed") };
    }
  }

  async updatePassword(password: string): Promise<{ error: Error | null }> {
    try {
      await apiCall("/api/auth/update-password", { password }, { maxRetries: 0 });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Update failed") };
    }
  }

  async getTenantContext(userId: string): Promise<TenantContextType> {
    try {
      return await apiCall<TenantContextType>(
        "/api/auth/tenant-context",
        { userId },
        { maxRetries: 0 },
      );
    } catch {
      return {
        tenantId: "default",
        tenantName: "Demo Credit Union",
        userId,
        userRole: "member",
        displayName: "Customer",
        permissions: getRolePermissions("member"),
        subscriptionTier: "professional",
        features: {
          rdc: true,
          billPay: true,
          p2p: false,
          cardControls: true,
          externalTransfers: true,
          wires: false,
          mobileDeposit: true,
          directDeposit: false,
          openBanking: false,
          sca: false,
          confirmationOfPayee: false,
          multiCurrency: false,
          internationalPayments: false,
          internationalBillPay: false,
          openBankingAggregation: false,
          aliasPayments: false,
          amlScreening: false,
          instantPayments: false,
        },
        region: "us" as const,
        country: "US",
        defaultCurrency: "USD",
        sessionTimeoutMinutes: 15,
        sessionGraceMinutes: 2,
      };
    }
  }

  async createTenant(
    userId: string,
    email: string,
    name?: string,
  ): Promise<{ error: Error | null }> {
    try {
      await apiCall("/api/auth/create-tenant", { userId, email, name }, { maxRetries: 0 });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Tenant creation failed") };
    }
  }
}

// =============================================================================
// GATEWAY TRANSPORT
// =============================================================================

class RestGatewayTransport implements GatewayTransport {
  async invoke(
    action: string,
    params: Record<string, unknown>,
    options?: GatewayInvokeOptions,
  ): Promise<GatewayRawResponse> {
    try {
      // Retries are handled at the gateway client level (callGateway) alongside throttle/circuit-breaker
      return await apiCall<GatewayRawResponse>(
        "/api/gateway",
        { action, params },
        { signal: options?.signal, maxRetries: 0 },
      );
    } catch (err) {
      // Propagate abort errors so TanStack Query handles cancellation
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return {
        error: {
          code: "INVOKE_ERROR",
          message: err instanceof Error ? err.message : "Gateway call failed",
        },
      };
    }
  }

  async graphql(query: string, variables?: Record<string, unknown>): Promise<GatewayRawResponse> {
    try {
      return await apiCall<GatewayRawResponse>(
        "/api/gateway",
        { query, variables },
        { maxRetries: 0 },
      );
    } catch (err) {
      return {
        error: {
          code: "INVOKE_ERROR",
          message: err instanceof Error ? err.message : "GraphQL call failed",
        },
      };
    }
  }
}

// =============================================================================
// REALTIME PROVIDER (POLLING FALLBACK)
// =============================================================================

class PollingRealtimeProvider implements RealtimeProvider {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private stopped: Set<string> = new Set();

  subscribe(config: RealtimeSubscription): Unsubscribe {
    const BASE_INTERVAL = 30_000;
    const MAX_INTERVAL = 120_000;
    let currentInterval = BASE_INTERVAL;
    let lastCheck = new Date().toISOString();

    const poll = async () => {
      if (this.stopped.has(config.channel)) return;

      try {
        const token = getStoredToken();
        if (!token) {
          this.scheduleNext(config.channel, poll, currentInterval);
          return;
        }

        const res = await fetch(`${API_BASE}/api/realtime/poll`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            table: config.table,
            since: lastCheck,
            filter: config.filter,
          }),
        });

        if (!res.ok) {
          // Backoff on failure
          currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
          this.scheduleNext(config.channel, poll, currentInterval);
          return;
        }

        const data = await res.json();
        lastCheck = new Date().toISOString();
        // Reset interval on success
        currentInterval = BASE_INTERVAL;

        for (const change of data.changes ?? []) {
          config.onData({
            eventType: change.type,
            new: change.new ?? {},
            old: change.old ?? {},
          });
        }
      } catch {
        // Backoff on network failure
        currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
      }

      if (this.stopped.has(config.channel)) return;
      this.scheduleNext(config.channel, poll, currentInterval);
    };

    this.scheduleNext(config.channel, poll, currentInterval);

    return {
      unsubscribe: () => {
        this.stopped.add(config.channel);
        const existing = this.timers.get(config.channel);
        if (existing) {
          clearTimeout(existing);
          this.timers.delete(config.channel);
        }
      },
    };
  }

  private scheduleNext(channel: string, fn: () => void, delayMs: number): void {
    const timer = setTimeout(fn, delayMs);
    this.timers.set(channel, timer);
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export function createRestProvider(): BackendProvider {
  return {
    name: "rest",
    auth: new RestAuthProvider(),
    gateway: new RestGatewayTransport(),
    realtime: new PollingRealtimeProvider(),
  };
}
