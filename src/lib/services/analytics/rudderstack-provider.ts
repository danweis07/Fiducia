/**
 * RudderStack Analytics Provider
 *
 * CDP-backed analytics provider that routes events through RudderStack.
 * RudderStack acts as the internal Customer Data Platform (CDP), allowing
 * admins to configure downstream destinations (marketing, CRM, data warehouse)
 * without changing frontend instrumentation.
 *
 * Env vars:
 *   VITE_RUDDERSTACK_WRITE_KEY  — Source write key from RudderStack dashboard
 *   VITE_RUDDERSTACK_DATA_PLANE — Data plane URL (e.g. https://hosted.rudderlabs.com)
 */

import type { AnalyticsProvider, AnalyticsUser } from '../types';

declare global {
  interface Window {
    rudderanalytics?: RudderAnalyticsSDK;
  }
}

interface RudderAnalyticsSDK {
  load(writeKey: string, dataPlaneUrl: string, options?: Record<string, unknown>): void;
  identify(userId: string, traits?: Record<string, unknown>, options?: Record<string, unknown>): void;
  track(event: string, properties?: Record<string, unknown>, options?: Record<string, unknown>): void;
  page(category?: string, name?: string, properties?: Record<string, unknown>): void;
  reset(): void;
  setAnonymousId(id: string): void;
  getAnonymousId(): string;
  ready(callback: () => void): void;
}

export class RudderStackProvider implements AnalyticsProvider {
  readonly name = 'rudderstack';

  private _initialized = false;
  private _optedOut = false;
  private _timedEvents = new Map<string, number>();

  init(config: Record<string, unknown>): void {
    const writeKey = (config.writeKey as string) || '';
    const dataPlaneUrl = (config.dataPlaneUrl as string) || '';

    if (!writeKey || !dataPlaneUrl) {
      console.warn('[RudderStack] Missing writeKey or dataPlaneUrl — running in no-op mode');
      return;
    }

    this.loadSDK(writeKey, dataPlaneUrl, config.debug === true);
  }

  private loadSDK(writeKey: string, dataPlaneUrl: string, debug: boolean): void {
    // Load the RudderStack JS SDK snippet
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;

    // Initialize rudderanalytics stub
    const rudderanalytics: Record<string, unknown> = {};
    const methods = [
      'load', 'page', 'track', 'identify', 'alias', 'group', 'ready',
      'reset', 'getAnonymousId', 'setAnonymousId',
    ];
    for (const method of methods) {
      rudderanalytics[method] = (...args: unknown[]) => {
        (rudderanalytics as Record<string, unknown[]>)._q =
          (rudderanalytics as Record<string, unknown[]>)._q || [];
        ((rudderanalytics as Record<string, unknown[]>)._q as unknown[][]).push([method, ...args]);
      };
    }
    rudderanalytics._q = [];
    window.rudderanalytics = rudderanalytics as unknown as RudderAnalyticsSDK;

    script.src = 'https://cdn.rudderlabs.com/v3/modern/rsa.min.js';
    script.onload = () => {
      window.rudderanalytics?.load(writeKey, dataPlaneUrl, {
        logLevel: debug ? 'DEBUG' : 'ERROR',
        integrations: { All: true },
        sendAdblockPage: false,
        sendAdblockPageOptions: {},
      });
      this._initialized = true;
    };

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  }

  identify(user: AnalyticsUser): void {
    if (this._optedOut) return;
    const { id, ...traits } = user;
    window.rudderanalytics?.identify(id, traits);
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (this._optedOut) return;

    const enrichedProps = { ...properties };

    // If there's a running timer for this event, add duration
    const startTime = this._timedEvents.get(event);
    if (startTime) {
      enrichedProps.durationMs = Date.now() - startTime;
      this._timedEvents.delete(event);
    }

    window.rudderanalytics?.track(event, enrichedProps);
  }

  page(name: string, properties?: Record<string, unknown>): void {
    if (this._optedOut) return;
    window.rudderanalytics?.page(undefined, name, properties);
  }

  setUserProperties(properties: Record<string, unknown>): void {
    if (this._optedOut) return;
    // RudderStack uses identify to set user traits
    const anonId = window.rudderanalytics?.getAnonymousId();
    if (anonId) {
      window.rudderanalytics?.identify(anonId, properties);
    }
  }

  reset(): void {
    window.rudderanalytics?.reset();
    this._timedEvents.clear();
  }

  optOut(): void {
    this._optedOut = true;
  }

  optIn(): void {
    this._optedOut = false;
  }

  revenue(amount: number, properties?: Record<string, unknown>): void {
    if (this._optedOut) return;
    window.rudderanalytics?.track('Order Completed', {
      revenue: amount,
      ...properties,
    });
  }

  timeEvent(event: string): void {
    this._timedEvents.set(event, Date.now());
  }

  async flush(): Promise<void> {
    // RudderStack JS SDK auto-flushes; no manual flush needed
    return Promise.resolve();
  }
}
