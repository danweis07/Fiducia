/**
 * useAnalytics — React hook for CDP event tracking
 *
 * Wraps the analytics service layer so components can fire CDP events
 * without importing the service directly. Provides pre-built banking
 * event helpers that conform to the platform's event schema.
 *
 * Events are routed through whichever analytics provider is configured
 * (RudderStack, Mixpanel, Amplitude, or console).
 */

import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getAnalytics } from '@/lib/services/analytics';

export function useAnalytics() {
  const analytics = getAnalytics();
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  // Auto-track page views on route change
  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      analytics.page(location.pathname, {
        path: location.pathname,
        search: location.search,
      });
      prevPath.current = location.pathname;
    }
  }, [location.pathname, location.search, analytics]);

  const identify = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      analytics.identify({ id: userId, ...traits });
    },
    [analytics]
  );

  const track = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      analytics.track(event, properties);
    },
    [analytics]
  );

  // -----------------------------------------------------------------------
  // Pre-built banking event helpers
  // -----------------------------------------------------------------------

  const trackLogin = useCallback(
    (method: 'password' | 'sso' | 'passkey') => {
      analytics.track('Member Logged In', { method });
    },
    [analytics]
  );

  const trackAccountViewed = useCallback(
    (accountType: string) => {
      analytics.track('Account Viewed', { accountType });
    },
    [analytics]
  );

  const trackTransferInitiated = useCallback(
    (params: { fromType: string; toType: string; amountCents: number; transferType: string }) => {
      analytics.track('Transfer Initiated', params);
    },
    [analytics]
  );

  const trackTransferCompleted = useCallback(
    (params: { transferId: string; amountCents: number; transferType: string }) => {
      analytics.track('Transfer Completed', params);
    },
    [analytics]
  );

  const trackDepositSubmitted = useCallback(
    (params: { amountCents: number; channel: 'rdc' | 'ach' }) => {
      analytics.track('Deposit Submitted', params);
    },
    [analytics]
  );

  const trackCardAction = useCallback(
    (action: 'locked' | 'unlocked' | 'limit_changed' | 'provisioned', cardType?: string) => {
      analytics.track('Card Action', { action, cardType });
    },
    [analytics]
  );

  const trackBillPaid = useCallback(
    (params: { payeeName: string; amountCents: number; method: string }) => {
      analytics.track('Bill Paid', params);
    },
    [analytics]
  );

  const trackFeatureUsed = useCallback(
    (feature: string, metadata?: Record<string, unknown>) => {
      analytics.track('Feature Used', { feature, ...metadata });
    },
    [analytics]
  );

  const trackSignup = useCallback(
    (method: string) => {
      analytics.track('Member Signed Up', { method });
    },
    [analytics]
  );

  const trackLogout = useCallback(() => {
    analytics.track('Member Logged Out');
    analytics.reset();
  }, [analytics]);

  return {
    identify,
    track,
    trackLogin,
    trackAccountViewed,
    trackTransferInitiated,
    trackTransferCompleted,
    trackDepositSubmitted,
    trackCardAction,
    trackBillPaid,
    trackFeatureUsed,
    trackSignup,
    trackLogout,
  };
}
