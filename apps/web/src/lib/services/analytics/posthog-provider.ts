/**
 * PostHog Analytics Provider
 *
 * Wraps the PostHog JS SDK behind the AnalyticsProvider interface.
 * PostHog is an all-in-one open-source platform combining analytics,
 * session replays, and feature flags.
 *
 * Config:
 *   VITE_POSTHOG_API_KEY — PostHog project API key
 *   VITE_POSTHOG_HOST    — PostHog instance URL (default: https://app.posthog.com)
 *
 * Install: npm install posthog-js
 */

import type { AnalyticsProvider, AnalyticsUser } from "../types";

// Lazy-loaded PostHog SDK type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PostHogLib = any;

export class PostHogProvider implements AnalyticsProvider {
  readonly name = "posthog";
  private ph: PostHogLib | null = null;
  private timers = new Map<string, number>();

  async init(config: Record<string, unknown>): Promise<void> {
    const apiKey = config.apiKey as string;
    if (!apiKey) {
      console.warn("[PostHog] No API key provided. PostHog is disabled.");
      return;
    }

    try {
      // Dynamic import with variable indirection so Rollup/Vite skip static resolution
      const pkg = "posthog-js";
      const mod = await import(/* @vite-ignore */ pkg);
      const posthog = mod.default ?? mod;
      const host = (config.host as string) || "https://app.posthog.com";

      posthog.init(apiKey, {
        api_host: host,
        capture_pageview: false, // We handle this manually
        capture_pageleave: true,
        persistence: "localStorage",
        // Session replay — opt-in via config
        disable_session_recording: config.enableSessionReplay !== true,
        ...((config.options as Record<string, unknown>) ?? {}),
      });

      this.ph = posthog;
    } catch {
      console.warn("[PostHog] posthog-js not installed. Run: npm install posthog-js");
    }
  }

  identify(user: AnalyticsUser): void {
    if (!this.ph) return;
    const props: Record<string, unknown> = {};
    if (user.email) props.email = user.email;
    if (user.name) props.name = user.name;
    for (const [k, v] of Object.entries(user)) {
      if (!["id", "email", "name"].includes(k)) props[k] = v;
    }
    this.ph.identify(user.id, props);
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.ph) return;
    const duration = this.timers.get(event);
    if (duration) {
      const elapsed = Date.now() - duration;
      this.timers.delete(event);
      properties = { ...properties, _duration_ms: elapsed };
    }
    this.ph.capture(event, properties);
  }

  page(name: string, properties?: Record<string, unknown>): void {
    if (!this.ph) return;
    this.ph.capture("$pageview", { $current_url: name, ...properties });
  }

  setUserProperties(properties: Record<string, unknown>): void {
    if (!this.ph) return;
    this.ph.people.set(properties);
  }

  reset(): void {
    if (!this.ph) return;
    this.ph.reset();
    this.timers.clear();
  }

  optOut(): void {
    if (!this.ph) return;
    this.ph.opt_out_capturing();
  }

  optIn(): void {
    if (!this.ph) return;
    this.ph.opt_in_capturing();
  }

  revenue(amount: number, properties?: Record<string, unknown>): void {
    if (!this.ph) return;
    this.ph.capture("purchase", { revenue: amount, ...properties });
  }

  timeEvent(event: string): void {
    this.timers.set(event, Date.now());
  }

  async flush(): Promise<void> {
    // PostHog auto-flushes; no manual flush available in browser SDK
  }

  // =========================================================================
  // PostHog-specific: Feature Flags
  // =========================================================================

  /**
   * Check if a feature flag is enabled for the current user.
   * Returns false if PostHog is not initialized.
   */
  isFeatureEnabled(flagKey: string): boolean {
    if (!this.ph) return false;
    return this.ph.isFeatureEnabled(flagKey) ?? false;
  }

  /**
   * Get the value of a feature flag (for multivariate flags).
   * Returns undefined if PostHog is not initialized or flag doesn't exist.
   */
  getFeatureFlag(flagKey: string): string | boolean | undefined {
    if (!this.ph) return undefined;
    return this.ph.getFeatureFlag(flagKey);
  }

  /**
   * Get the payload of a feature flag.
   */
  getFeatureFlagPayload(flagKey: string): unknown {
    if (!this.ph) return undefined;
    return this.ph.getFeatureFlagPayload(flagKey);
  }

  /**
   * Force reload feature flags from PostHog.
   */
  reloadFeatureFlags(): void {
    if (!this.ph) return;
    this.ph.reloadFeatureFlags();
  }

  /**
   * Register a callback for when feature flags are loaded/changed.
   */
  onFeatureFlags(callback: (flags: string[]) => void): void {
    if (!this.ph) return;
    this.ph.onFeatureFlags(callback);
  }

  // =========================================================================
  // PostHog-specific: Session Replay
  // =========================================================================

  /**
   * Start session recording (if not already started).
   */
  startSessionRecording(): void {
    if (!this.ph) return;
    this.ph.startSessionRecording();
  }

  /**
   * Stop session recording.
   */
  stopSessionRecording(): void {
    if (!this.ph) return;
    this.ph.stopSessionRecording();
  }
}
