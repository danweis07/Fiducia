/**
 * Mixpanel Analytics Provider
 *
 * Wraps the Mixpanel JS SDK behind the AnalyticsProvider interface.
 * Requires `mixpanel-browser` to be installed.
 *
 * Config:
 *   VITE_MIXPANEL_TOKEN — Mixpanel project token
 *   VITE_MIXPANEL_DEBUG — Enable debug mode (default: false)
 *
 * Install: npm install mixpanel-browser
 */

import type { AnalyticsProvider, AnalyticsUser } from '../types';

// Lazy-loaded Mixpanel SDK type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MixpanelLib = any;

export class MixpanelProvider implements AnalyticsProvider {
  readonly name = 'mixpanel';
  private mp: MixpanelLib | null = null;
  private initialized = false;

  init(config: Record<string, unknown>): void {
    const token = config.token as string;
    if (!token) {
      console.warn('[Mixpanel] No token provided. Mixpanel is disabled.');
      return;
    }

    try {
      // Dynamic import to avoid bundling when not used
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mixpanel = require('mixpanel-browser');
      mixpanel.init(token, {
        debug: config.debug === true,
        track_pageview: false, // We handle this manually
        persistence: 'localStorage',
        ...(config.options as Record<string, unknown> ?? {}),
      });
      this.mp = mixpanel;
      this.initialized = true;
    } catch {
      console.warn('[Mixpanel] mixpanel-browser not installed. Run: npm install mixpanel-browser');
    }
  }

  identify(user: AnalyticsUser): void {
    if (!this.mp) return;
    this.mp.identify(user.id);
    const props: Record<string, unknown> = {};
    if (user.email) props.$email = user.email;
    if (user.name) props.$name = user.name;
    // Pass through any extra properties
    for (const [k, v] of Object.entries(user)) {
      if (!['id', 'email', 'name'].includes(k)) props[k] = v;
    }
    if (Object.keys(props).length > 0) {
      this.mp.people.set(props);
    }
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.mp) return;
    this.mp.track(event, properties);
  }

  page(name: string, properties?: Record<string, unknown>): void {
    if (!this.mp) return;
    this.mp.track('Page View', { page: name, ...properties });
  }

  setUserProperties(properties: Record<string, unknown>): void {
    if (!this.mp) return;
    this.mp.people.set(properties);
  }

  reset(): void {
    if (!this.mp) return;
    this.mp.reset();
  }

  optOut(): void {
    if (!this.mp) return;
    this.mp.opt_out_tracking();
  }

  optIn(): void {
    if (!this.mp) return;
    this.mp.opt_in_tracking();
  }

  revenue(amount: number, properties?: Record<string, unknown>): void {
    if (!this.mp) return;
    this.mp.people.track_charge(amount, properties);
  }

  timeEvent(event: string): void {
    if (!this.mp) return;
    this.mp.time_event(event);
  }

  async flush(): Promise<void> {
    // Mixpanel auto-flushes; no manual flush available in browser SDK
  }
}
