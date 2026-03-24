/**
 * Service Provider Interfaces
 *
 * Abstractions for analytics, error tracking, and messaging so the platform
 * can swap between providers (Mixpanel/Amplitude, Sentry/Datadog, Braze/Airship)
 * without changing consumer code.
 *
 * All providers default to a console/no-op sandbox when no SDK is configured.
 */

// =============================================================================
// ANALYTICS PROVIDER (Mixpanel, Amplitude, Segment, etc.)
// =============================================================================

export interface AnalyticsUser {
  id: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface AnalyticsProvider {
  /** Provider name for logging */
  readonly name: string;

  /** Initialize the provider with config */
  init(config: Record<string, unknown>): void | Promise<void>;

  /** Identify a user (call after login) */
  identify(user: AnalyticsUser): void;

  /** Track a named event with optional properties */
  track(event: string, properties?: Record<string, unknown>): void;

  /** Track a page/screen view */
  page(name: string, properties?: Record<string, unknown>): void;

  /** Set persistent user properties (super properties) */
  setUserProperties(properties: Record<string, unknown>): void;

  /** Reset identity (call on logout) */
  reset(): void;

  /** Opt user out of tracking */
  optOut(): void;

  /** Opt user back into tracking */
  optIn(): void;

  /** Revenue tracking */
  revenue(amount: number, properties?: Record<string, unknown>): void;

  /** Start timing an event (for duration tracking) */
  timeEvent(event: string): void;

  /** Flush any queued events */
  flush(): Promise<void>;
}

// =============================================================================
// ERROR TRACKING PROVIDER (Sentry, Datadog, Bugsnag, etc.)
// =============================================================================

export type ErrorSeverity = "fatal" | "error" | "warning" | "info" | "debug";

export interface ErrorUser {
  id?: string;
  email?: string;
  username?: string;
}

export interface Breadcrumb {
  category?: string;
  message?: string;
  level?: ErrorSeverity;
  data?: Record<string, unknown>;
}

export interface ErrorTrackingProvider {
  /** Provider name for logging */
  readonly name: string;

  /** Initialize the provider */
  init(config: Record<string, unknown>): void | Promise<void>;

  /** Capture an exception */
  captureException(error: unknown, context?: Record<string, unknown>): void;

  /** Capture a message */
  captureMessage(message: string, level?: ErrorSeverity): void;

  /** Set the current user context */
  setUser(user: ErrorUser | null): void;

  /** Add a breadcrumb for debugging */
  addBreadcrumb(breadcrumb: Breadcrumb): void;

  /** Set a tag on all future events */
  setTag(key: string, value: string): void;

  /** Set extra context data */
  setExtra(key: string, value: unknown): void;

  /** Start a performance transaction/span */
  startTransaction(name: string, op?: string): { finish: () => void };

  /** Flush pending events */
  flush(timeout?: number): Promise<void>;
}

// =============================================================================
// MESSAGING PROVIDER (Braze, Airship, OneSignal, Firebase, etc.)
// =============================================================================

export interface MessagingUser {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface InAppMessage {
  id: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  buttons?: Array<{ id: string; label: string; action?: string }>;
  extras?: Record<string, unknown>;
}

export interface PushPermissionStatus {
  granted: boolean;
  canRequest: boolean;
}

export interface MessagingProvider {
  /** Provider name for logging */
  readonly name: string;

  /** Initialize the provider */
  init(config: Record<string, unknown>): void | Promise<void>;

  /** Set the current user for targeted messaging */
  setUser(user: MessagingUser): void;

  /** Clear user (logout) */
  clearUser(): void;

  /** Set user attributes for segmentation */
  setUserAttributes(attributes: Record<string, unknown>): void;

  /** Log a custom event (for triggering campaigns) */
  logEvent(event: string, properties?: Record<string, unknown>): void;

  /** Request push notification permission */
  requestPushPermission(): Promise<PushPermissionStatus>;

  /** Get current push permission status */
  getPushPermissionStatus(): Promise<PushPermissionStatus>;

  /** Register a push token (from FCM/APNs) */
  registerPushToken(token: string): void;

  /** Handle a received push notification */
  handlePushReceived(payload: Record<string, unknown>): void;

  /** Subscribe to in-app message events */
  onInAppMessage(callback: (message: InAppMessage) => void): { unsubscribe: () => void };

  /** Subscribe to push notification taps */
  onPushOpened(callback: (payload: Record<string, unknown>) => void): { unsubscribe: () => void };

  /** Flush pending data */
  flush(): Promise<void>;
}
