/**
 * Console Error Tracking Provider (Sandbox)
 *
 * Logs all errors to the browser console.
 * Used when no error tracking SDK is configured.
 */

import type { ErrorTrackingProvider, ErrorUser, Breadcrumb, ErrorSeverity } from "../types";

const PREFIX = "[ErrorTracking]";

export class ConsoleErrorTrackingProvider implements ErrorTrackingProvider {
  readonly name = "console";
  private breadcrumbs: Breadcrumb[] = [];
  private tags: Record<string, string> = {};

  init(_config: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`${PREFIX} Console error tracking provider initialized (sandbox mode)`);
    }
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    console.error(`${PREFIX} Exception captured:`, error, context ?? {});
    if (this.breadcrumbs.length > 0) {
      // eslint-disable-next-line no-console
      console.debug(`${PREFIX} Breadcrumbs:`, [...this.breadcrumbs]);
    }
  }

  captureMessage(message: string, level: ErrorSeverity = "info"): void {
    const logFn =
      level === "error" || level === "fatal"
        ? console.error
        : level === "warning"
          ? console.warn
          : console.warn;
    logFn(`${PREFIX} [${level}] ${message}`);
  }

  setUser(user: ErrorUser | null): void {
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} setUser`, user);
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb);
    // Keep last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50);
    }
  }

  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  setExtra(_key: string, _value: unknown): void {
    // stored in memory only
  }

  startTransaction(name: string, op?: string): { finish: () => void } {
    const start = Date.now();
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} Transaction started: ${name} (${op ?? "default"})`);
    return {
      finish: () => {
        // eslint-disable-next-line no-console
        console.debug(`${PREFIX} Transaction finished: ${name} (${Date.now() - start}ms)`);
      },
    };
  }

  async flush(): Promise<void> {
    // no-op
  }
}
