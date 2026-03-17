/**
 * Console Analytics Provider (Sandbox)
 *
 * Logs all analytics events to the browser console.
 * Used when no analytics SDK is configured, or during development.
 */

import type { AnalyticsProvider, AnalyticsUser } from '../types';

const PREFIX = '[Analytics]';

export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'console';
  private timers = new Map<string, number>();
  private enabled = true;

  init(_config: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`${PREFIX} Console analytics provider initialized (sandbox mode)`);
    }
  }

  identify(user: AnalyticsUser): void {
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} identify`, { userId: user.id, email: user.email });
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;
    const duration = this.timers.get(event);
    if (duration) {
      const elapsed = Date.now() - duration;
      this.timers.delete(event);
      properties = { ...properties, _duration_ms: elapsed };
    }
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} track "${event}"`, properties ?? {});
  }

  page(name: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} page "${name}"`, properties ?? {});
  }

  setUserProperties(properties: Record<string, unknown>): void {
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} setUserProperties`, properties);
  }

  reset(): void {
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} reset`);
    this.timers.clear();
  }

  optOut(): void {
    this.enabled = false;
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} opted out`);
  }

  optIn(): void {
    this.enabled = true;
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} opted in`);
  }

  revenue(amount: number, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} revenue $${amount}`, properties ?? {});
  }

  timeEvent(event: string): void {
    this.timers.set(event, Date.now());
  }

  async flush(): Promise<void> {
    // no-op
  }
}
