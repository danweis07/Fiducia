/**
 * Sentry Error Monitoring — Compatibility Layer
 *
 * Delegates to the abstracted error tracking provider.
 * Existing code that imports from '@/lib/sentry' continues to work unchanged.
 *
 * To use the abstracted API directly:
 *   import { errors } from '@/lib/services';
 *   errors.captureException(new Error('...'));
 */

import { getErrorTracking } from '@/lib/services';

/**
 * Initialize error tracking.
 * The provider is determined by VITE_ERROR_TRACKING_PROVIDER env var.
 * Defaults to Sentry if VITE_SENTRY_DSN is set, otherwise console.
 */
export function initSentry(): void {
  // Provider is auto-initialized on first access via getErrorTracking()
  getErrorTracking();
}

/**
 * Safely capture an exception.
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  getErrorTracking().captureException(error, context);
}

/**
 * Set the current user context.
 * Pass null to clear.
 */
export function setUserContext(
  user: { id?: string; email?: string; username?: string } | null,
): void {
  getErrorTracking().setUser(user);
}

/**
 * Add a breadcrumb for debugging context.
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message?: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}): void {
  getErrorTracking().addBreadcrumb(breadcrumb);
}
