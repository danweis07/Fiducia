/**
 * Platform Hooks — Barrel Export
 *
 * Hooks for platform-level concerns: locale, notifications,
 * messaging, experiments, sessions, devices, and SDUI.
 *
 * @example
 *   import { useLocale, useNotifications } from '@/hooks/platform';
 */

export * from "./useLocale";
export * from "./useNotifications";
export * from "./useNotificationPreferences";
export * from "./useSecureMessaging";
export * from "./useExperiment";
export * from "./useOnlineStatus";
export * from "./useSessions";
export * from "./useDevices";
export * from "./useScreenManifest";
export * from "./useCMSContent";
