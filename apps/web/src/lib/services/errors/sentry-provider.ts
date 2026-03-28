/**
 * Sentry Error Tracking Provider
 *
 * Wraps @sentry/react behind the ErrorTrackingProvider interface.
 * Migrates the existing src/lib/sentry.ts functionality into the provider pattern.
 *
 * Config:
 *   VITE_SENTRY_DSN — Sentry DSN
 *   VITE_APP_ENV — Environment name (default: 'development')
 *   VITE_APP_VERSION — Release version
 *   VITE_SENTRY_TRACES_SAMPLE_RATE — Performance sample rate (default: 0.1)
 */

import type { ErrorTrackingProvider, ErrorUser, Breadcrumb, ErrorSeverity } from "../types";

/** Fields that should be scrubbed from event data */
const SENSITIVE_FIELDS = ["email", "password", "token", "apiKey", "authorization"];

function scrubSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(scrubSensitiveData);
  if (typeof obj === "object") {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
        scrubbed[key] = "[Filtered]";
      } else {
        scrubbed[key] = scrubSensitiveData(value);
      }
    }
    return scrubbed;
  }
  return obj;
}

/** Minimal shape of the Sentry SDK used by this provider */
interface SentryLike {
  init(options: Record<string, unknown>): void;
  browserTracingIntegration(): unknown;
  replayIntegration(): unknown;
  captureException(error: unknown): void;
  captureMessage(message: string, level: string): void;
  setUser(user: unknown): void;
  addBreadcrumb(breadcrumb: unknown): void;
  setTag(key: string, value: string): void;
  setExtra(key: string, value: unknown): void;
  startTransaction(options: { name: string; op: string }): { finish?: () => void } | undefined;
  withScope(
    callback: (scope: { setExtras: (extras: Record<string, unknown>) => void }) => void,
  ): void;
  flush(timeout: number): Promise<void>;
}

/** Shape of a Sentry event passed to beforeSend */
interface SentryEvent {
  request?: { data?: unknown; headers?: unknown };
  extra?: unknown;
  contexts?: unknown;
  breadcrumbs?: Array<SentryBreadcrumbEntry>;
}

interface SentryBreadcrumbEntry {
  data?: unknown;
  [key: string]: unknown;
}

export class SentryProvider implements ErrorTrackingProvider {
  readonly name = "sentry";
  private Sentry: SentryLike | null = null;

  init(config: Record<string, unknown>): void {
    const dsn = config.dsn as string;
    if (!dsn) {
      // eslint-disable-next-line no-console
      console.debug("[Sentry] No DSN configured. Sentry is disabled.");
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require("@sentry/react");
      const environment = (config.environment as string) || "development";
      const release = (config.release as string) || "unknown";
      const tracesSampleRate = parseFloat(String(config.tracesSampleRate ?? "0.1"));

      Sentry.init({
        dsn,
        environment,
        release,
        integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
        tracesSampleRate: isNaN(tracesSampleRate) ? 0.1 : tracesSampleRate,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event: Record<string, unknown>) {
          const e = event as unknown as SentryEvent;
          if (e.request?.data) e.request.data = scrubSensitiveData(e.request.data);
          if (e.request?.headers) e.request.headers = scrubSensitiveData(e.request.headers);
          if (e.extra) e.extra = scrubSensitiveData(e.extra);
          if (e.contexts) e.contexts = scrubSensitiveData(e.contexts);
          if (e.breadcrumbs) {
            e.breadcrumbs = e.breadcrumbs.map((b: SentryBreadcrumbEntry) => ({
              ...b,
              data: b.data ? scrubSensitiveData(b.data) : b.data,
            }));
          }
          return event;
        },
      });

      this.Sentry = Sentry;
      // eslint-disable-next-line no-console
      console.debug(`[Sentry] Initialized (env=${environment}, release=${release})`);
    } catch (error) {
      console.warn("[Sentry] Failed to initialize:", error);
    }
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    if (!this.Sentry) return;
    try {
      if (context) {
        this.Sentry.withScope((scope: { setExtras: (extras: Record<string, unknown>) => void }) => {
          scope.setExtras(context);
          this.Sentry!.captureException(error);
        });
      } else {
        this.Sentry.captureException(error);
      }
    } catch (e) {
      console.error("[Sentry] Failed to capture exception:", e);
    }
  }

  captureMessage(message: string, level: ErrorSeverity = "info"): void {
    if (!this.Sentry) return;
    try {
      this.Sentry.captureMessage(message, level);
    } catch (e) {
      console.error("[Sentry] Failed to capture message:", e);
    }
  }

  setUser(user: ErrorUser | null): void {
    if (!this.Sentry) return;
    try {
      this.Sentry.setUser(user);
    } catch (e) {
      console.error("[Sentry] Failed to set user:", e);
    }
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!this.Sentry) return;
    try {
      this.Sentry.addBreadcrumb(breadcrumb);
    } catch (e) {
      console.error("[Sentry] Failed to add breadcrumb:", e);
    }
  }

  setTag(key: string, value: string): void {
    if (!this.Sentry) return;
    this.Sentry.setTag(key, value);
  }

  setExtra(key: string, value: unknown): void {
    if (!this.Sentry) return;
    this.Sentry.setExtra(key, value);
  }

  startTransaction(name: string, op?: string): { finish: () => void } {
    if (!this.Sentry) return { finish: () => {} };
    const transaction = this.Sentry.startTransaction({ name, op: op ?? "custom" });
    return { finish: () => transaction?.finish?.() };
  }

  async flush(timeout = 2000): Promise<void> {
    if (!this.Sentry) return;
    await this.Sentry.flush(timeout);
  }
}
