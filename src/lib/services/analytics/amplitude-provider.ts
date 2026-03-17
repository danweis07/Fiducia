/**
 * Amplitude Analytics Provider
 *
 * Wraps the Amplitude Browser SDK behind the AnalyticsProvider interface.
 * Requires `@amplitude/analytics-browser` to be installed.
 *
 * Config:
 *   VITE_AMPLITUDE_API_KEY — Amplitude API key
 *
 * Install: npm install @amplitude/analytics-browser
 */

import type { AnalyticsProvider, AnalyticsUser } from '../types';

// Lazy-loaded Amplitude SDK type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AmplitudeLib = any;

export class AmplitudeProvider implements AnalyticsProvider {
  readonly name = 'amplitude';
  private amp: AmplitudeLib | null = null;
  private timers = new Map<string, number>();

  init(config: Record<string, unknown>): void {
    const apiKey = config.apiKey as string;
    if (!apiKey) {
      console.warn('[Amplitude] No API key provided. Amplitude is disabled.');
      return;
    }

    try {
      // Dynamic import to avoid bundling when not used
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const amplitude = require('@amplitude/analytics-browser');
      amplitude.init(apiKey, {
        defaultTracking: false,
        ...(config.options as Record<string, unknown> ?? {}),
      });
      this.amp = amplitude;
    } catch {
      console.warn('[Amplitude] @amplitude/analytics-browser not installed. Run: npm install @amplitude/analytics-browser');
    }
  }

  identify(user: AnalyticsUser): void {
    if (!this.amp) return;
    this.amp.setUserId(user.id);
    const identifyObj = new this.amp.Identify();
    if (user.email) identifyObj.set('email', user.email);
    if (user.name) identifyObj.set('name', user.name);
    for (const [k, v] of Object.entries(user)) {
      if (!['id', 'email', 'name'].includes(k)) identifyObj.set(k, v);
    }
    this.amp.identify(identifyObj);
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.amp) return;
    const duration = this.timers.get(event);
    if (duration) {
      const elapsed = Date.now() - duration;
      this.timers.delete(event);
      properties = { ...properties, _duration_ms: elapsed };
    }
    this.amp.track(event, properties);
  }

  page(name: string, properties?: Record<string, unknown>): void {
    if (!this.amp) return;
    this.amp.track('Page View', { page: name, ...properties });
  }

  setUserProperties(properties: Record<string, unknown>): void {
    if (!this.amp) return;
    const identifyObj = new this.amp.Identify();
    for (const [k, v] of Object.entries(properties)) {
      identifyObj.set(k, v);
    }
    this.amp.identify(identifyObj);
  }

  reset(): void {
    if (!this.amp) return;
    this.amp.reset();
    this.timers.clear();
  }

  optOut(): void {
    if (!this.amp) return;
    this.amp.setOptOut(true);
  }

  optIn(): void {
    if (!this.amp) return;
    this.amp.setOptOut(false);
  }

  revenue(amount: number, properties?: Record<string, unknown>): void {
    if (!this.amp) return;
    const revenueObj = new this.amp.Revenue()
      .setPrice(amount)
      .setQuantity(1);
    if (properties?.productId) revenueObj.setProductId(String(properties.productId));
    this.amp.revenue(revenueObj);
  }

  timeEvent(event: string): void {
    this.timers.set(event, Date.now());
  }

  async flush(): Promise<void> {
    if (!this.amp) return;
    await this.amp.flush();
  }
}
