/**
 * Service Providers — Unified Entry Point
 *
 * Provides abstracted access to analytics, error tracking, and messaging.
 * Each service reads its provider from environment variables and defaults
 * to a console/sandbox implementation when no SDK is configured.
 *
 * Usage:
 *   import { analytics, errors, messaging } from '@/lib/services';
 *
 *   analytics.track('Button Clicked', { buttonId: 'cta-main' });
 *   errors.captureException(new Error('Something broke'));
 *   messaging.logEvent('purchase_completed', { amount: 4999 });
 *
 * Environment Variables:
 *   VITE_ANALYTICS_PROVIDER    — 'mixpanel' | 'amplitude' | 'console'
 *   VITE_ERROR_TRACKING_PROVIDER — 'sentry' | 'console'
 *   VITE_MESSAGING_PROVIDER    — 'braze' | 'airship' | 'console'
 */

export { getAnalytics } from "./analytics";
export { getErrorTracking } from "./errors";
export { getMessaging } from "./messaging";

// Re-export types for consumers
export type {
  AnalyticsProvider,
  AnalyticsUser,
  ErrorTrackingProvider,
  ErrorUser,
  ErrorSeverity,
  Breadcrumb,
  MessagingProvider,
  MessagingUser,
  InAppMessage,
  PushPermissionStatus,
} from "./types";

// =============================================================================
// CONVENIENCE SINGLETONS
// =============================================================================

import { getAnalytics } from "./analytics";
import { getErrorTracking } from "./errors";
import { getMessaging } from "./messaging";

/** Singleton analytics provider */
export const analytics = {
  get provider() {
    return getAnalytics();
  },
  identify: (...args: Parameters<ReturnType<typeof getAnalytics>["identify"]>) =>
    getAnalytics().identify(...args),
  track: (...args: Parameters<ReturnType<typeof getAnalytics>["track"]>) =>
    getAnalytics().track(...args),
  page: (...args: Parameters<ReturnType<typeof getAnalytics>["page"]>) =>
    getAnalytics().page(...args),
  setUserProperties: (...args: Parameters<ReturnType<typeof getAnalytics>["setUserProperties"]>) =>
    getAnalytics().setUserProperties(...args),
  reset: () => getAnalytics().reset(),
  revenue: (...args: Parameters<ReturnType<typeof getAnalytics>["revenue"]>) =>
    getAnalytics().revenue(...args),
  timeEvent: (event: string) => getAnalytics().timeEvent(event),
  flush: () => getAnalytics().flush(),
};

/** Singleton error tracking provider */
export const errors = {
  get provider() {
    return getErrorTracking();
  },
  captureException: (
    ...args: Parameters<ReturnType<typeof getErrorTracking>["captureException"]>
  ) => getErrorTracking().captureException(...args),
  captureMessage: (...args: Parameters<ReturnType<typeof getErrorTracking>["captureMessage"]>) =>
    getErrorTracking().captureMessage(...args),
  setUser: (...args: Parameters<ReturnType<typeof getErrorTracking>["setUser"]>) =>
    getErrorTracking().setUser(...args),
  addBreadcrumb: (...args: Parameters<ReturnType<typeof getErrorTracking>["addBreadcrumb"]>) =>
    getErrorTracking().addBreadcrumb(...args),
  setTag: (key: string, value: string) => getErrorTracking().setTag(key, value),
  setExtra: (key: string, value: unknown) => getErrorTracking().setExtra(key, value),
  startTransaction: (name: string, op?: string) => getErrorTracking().startTransaction(name, op),
  flush: (timeout?: number) => getErrorTracking().flush(timeout),
};

/** Singleton messaging provider */
export const messaging = {
  get provider() {
    return getMessaging();
  },
  setUser: (...args: Parameters<ReturnType<typeof getMessaging>["setUser"]>) =>
    getMessaging().setUser(...args),
  clearUser: () => getMessaging().clearUser(),
  setUserAttributes: (...args: Parameters<ReturnType<typeof getMessaging>["setUserAttributes"]>) =>
    getMessaging().setUserAttributes(...args),
  logEvent: (...args: Parameters<ReturnType<typeof getMessaging>["logEvent"]>) =>
    getMessaging().logEvent(...args),
  requestPushPermission: () => getMessaging().requestPushPermission(),
  getPushPermissionStatus: () => getMessaging().getPushPermissionStatus(),
  onInAppMessage: (...args: Parameters<ReturnType<typeof getMessaging>["onInAppMessage"]>) =>
    getMessaging().onInAppMessage(...args),
  onPushOpened: (...args: Parameters<ReturnType<typeof getMessaging>["onPushOpened"]>) =>
    getMessaging().onPushOpened(...args),
  flush: () => getMessaging().flush(),
};
