/**
 * useIdleTimeout — Session idle timeout with auto-logout
 *
 * Monitors user activity (mouse, keyboard, scroll, touch) and triggers
 * a warning dialog before auto-signing out. Timeout duration is
 * tenant-configurable via complianceSettings.
 *
 * Usage:
 *   const { showWarning, remainingSeconds, dismiss } = useIdleTimeout();
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getBackend } from "@/lib/backend";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "scroll", "touchstart", "click"] as const;
const SESSION_KEY = "fiducia_last_activity";

interface IdleTimeoutConfig {
  /** Idle timeout in minutes before warning appears. Default: 15 */
  timeoutMinutes: number;
  /** Grace period in minutes after warning before auto-logout. Default: 2 */
  graceMinutes: number;
}

interface IdleTimeoutState {
  /** Whether the warning dialog should be shown */
  showWarning: boolean;
  /** Seconds remaining before auto-logout (only meaningful when showWarning is true) */
  remainingSeconds: number;
  /** Dismiss the warning and reset the timer */
  dismiss: () => void;
}

export function useIdleTimeout(config: IdleTimeoutConfig): IdleTimeoutState {
  const { timeoutMinutes, graceMinutes } = config;

  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(graceMinutes * 60);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceDeadlineRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (graceRef.current) {
      clearInterval(graceRef.current);
      graceRef.current = null;
    }
  }, []);

  const performLogout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    try {
      const backend = getBackend();
      await backend.auth.signOut();
    } catch {
      // Best effort — redirect to login will handle the rest
    }
    window.location.href = "/login?reason=idle";
  }, [clearTimers]);

  const startGracePeriod = useCallback(() => {
    setShowWarning(true);
    const graceMs = graceMinutes * 60 * 1000;
    graceDeadlineRef.current = Date.now() + graceMs;
    setRemainingSeconds(graceMinutes * 60);

    graceRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((graceDeadlineRef.current - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        performLogout();
      }
    }, 1000);
  }, [graceMinutes, performLogout]);

  const resetTimer = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    setRemainingSeconds(graceMinutes * 60);

    sessionStorage.setItem(SESSION_KEY, Date.now().toString());

    const timeoutMs = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(startGracePeriod, timeoutMs);
  }, [timeoutMinutes, graceMinutes, clearTimers, startGracePeriod]);

  const dismiss = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Track showWarning in a ref so activity listeners have a stable reference
  const showWarningRef = useRef(showWarning);
  showWarningRef.current = showWarning;

  // Set up activity listeners
  useEffect(() => {
    // Throttle activity handler to avoid excessive timer resets
    let lastReset = 0;
    const THROTTLE_MS = 30_000; // Only reset timer every 30s of activity

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset < THROTTLE_MS) return;
      if (showWarningRef.current) return; // Don't reset during grace period
      lastReset = now;
      resetTimer();
    };

    // Check if we were idle while the tab was in the background
    const storedActivity = sessionStorage.getItem(SESSION_KEY);
    if (storedActivity) {
      const elapsed = Date.now() - parseInt(storedActivity, 10);
      const timeoutMs = timeoutMinutes * 60 * 1000;
      if (elapsed >= timeoutMs) {
        startGracePeriod();
      } else {
        resetTimer();
      }
    } else {
      resetTimer();
    }

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeoutMinutes]);

  return { showWarning, remainingSeconds, dismiss };
}
