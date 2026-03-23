import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all provider imports to avoid side effects
vi.mock("../analytics/mixpanel-provider", () => ({ MixpanelProvider: vi.fn() }));
vi.mock("../analytics/amplitude-provider", () => ({ AmplitudeProvider: vi.fn() }));
vi.mock("../analytics/rudderstack-provider", () => ({ RudderStackProvider: vi.fn() }));
vi.mock("../analytics/posthog-provider", () => ({ PostHogProvider: vi.fn() }));
vi.mock("../errors/sentry-provider", () => ({ SentryProvider: vi.fn() }));
vi.mock("../errors/opentelemetry-provider", () => ({ OpenTelemetryProvider: vi.fn() }));
vi.mock("../messaging/braze-provider", () => ({ BrazeProvider: vi.fn() }));
vi.mock("../messaging/airship-provider", () => ({ AirshipProvider: vi.fn() }));

describe("Services", () => {
  describe("ConsoleAnalyticsProvider", () => {
    it('should create an instance with name "console"', async () => {
      const { ConsoleAnalyticsProvider } = await import("../analytics/console-provider");
      const provider = new ConsoleAnalyticsProvider();
      expect(provider.name).toBe("console");
    });

    it("should implement all AnalyticsProvider methods", async () => {
      const { ConsoleAnalyticsProvider } = await import("../analytics/console-provider");
      const provider = new ConsoleAnalyticsProvider();
      expect(typeof provider.init).toBe("function");
      expect(typeof provider.identify).toBe("function");
      expect(typeof provider.track).toBe("function");
      expect(typeof provider.page).toBe("function");
      expect(typeof provider.setUserProperties).toBe("function");
      expect(typeof provider.reset).toBe("function");
      expect(typeof provider.optOut).toBe("function");
      expect(typeof provider.optIn).toBe("function");
      expect(typeof provider.revenue).toBe("function");
      expect(typeof provider.timeEvent).toBe("function");
      expect(typeof provider.flush).toBe("function");
    });

    it("should call methods without throwing", async () => {
      const { ConsoleAnalyticsProvider } = await import("../analytics/console-provider");
      const provider = new ConsoleAnalyticsProvider();
      provider.init({});
      provider.identify({ id: "user-1", email: "test@test.com" });
      provider.track("test-event", { key: "value" });
      provider.page("home", { path: "/" });
      provider.setUserProperties({ plan: "premium" });
      provider.revenue(100, { currency: "USD" });
      provider.timeEvent("slow-event");
      provider.track("slow-event");
      provider.optOut();
      provider.track("should-be-skipped");
      provider.optIn();
      provider.reset();
      await provider.flush();
    });
  });

  describe("ConsoleErrorTrackingProvider", () => {
    it('should create an instance with name "console"', async () => {
      const { ConsoleErrorTrackingProvider } = await import("../errors/console-provider");
      const provider = new ConsoleErrorTrackingProvider();
      expect(provider.name).toBe("console");
    });

    it("should implement all ErrorTrackingProvider methods", async () => {
      const { ConsoleErrorTrackingProvider } = await import("../errors/console-provider");
      const provider = new ConsoleErrorTrackingProvider();
      expect(typeof provider.init).toBe("function");
      expect(typeof provider.captureException).toBe("function");
      expect(typeof provider.captureMessage).toBe("function");
      expect(typeof provider.setUser).toBe("function");
      expect(typeof provider.addBreadcrumb).toBe("function");
      expect(typeof provider.setTag).toBe("function");
      expect(typeof provider.setExtra).toBe("function");
      expect(typeof provider.startTransaction).toBe("function");
      expect(typeof provider.flush).toBe("function");
    });

    it("should call methods without throwing", async () => {
      const { ConsoleErrorTrackingProvider } = await import("../errors/console-provider");
      const provider = new ConsoleErrorTrackingProvider();
      provider.init({});
      provider.captureException(new Error("test"), { context: "test" });
      provider.captureMessage("info message", "info");
      provider.captureMessage("warning message", "warning");
      provider.captureMessage("error message", "error");
      provider.captureMessage("fatal message", "fatal");
      provider.setUser({ id: "user-1", email: "test@test.com" });
      provider.setUser(null);
      provider.addBreadcrumb({ category: "test", message: "breadcrumb" });
      provider.setTag("key", "value");
      provider.setExtra("key", { data: true });
      const txn = provider.startTransaction("test-txn", "http");
      expect(typeof txn.finish).toBe("function");
      txn.finish();
      await provider.flush();
    });

    it("should handle breadcrumb buffer overflow", async () => {
      const { ConsoleErrorTrackingProvider } = await import("../errors/console-provider");
      const provider = new ConsoleErrorTrackingProvider();
      provider.init({});
      for (let i = 0; i < 55; i++) {
        provider.addBreadcrumb({ message: `breadcrumb-${i}` });
      }
      // Should not throw with >50 breadcrumbs
      provider.captureException(new Error("overflow test"));
    });
  });

  describe("ConsoleMessagingProvider", () => {
    it('should create an instance with name "console"', async () => {
      const { ConsoleMessagingProvider } = await import("../messaging/console-provider");
      const provider = new ConsoleMessagingProvider();
      expect(provider.name).toBe("console");
    });

    it("should implement all MessagingProvider methods", async () => {
      const { ConsoleMessagingProvider } = await import("../messaging/console-provider");
      const provider = new ConsoleMessagingProvider();
      expect(typeof provider.init).toBe("function");
      expect(typeof provider.setUser).toBe("function");
      expect(typeof provider.clearUser).toBe("function");
      expect(typeof provider.setUserAttributes).toBe("function");
      expect(typeof provider.logEvent).toBe("function");
      expect(typeof provider.requestPushPermission).toBe("function");
      expect(typeof provider.getPushPermissionStatus).toBe("function");
      expect(typeof provider.registerPushToken).toBe("function");
      expect(typeof provider.handlePushReceived).toBe("function");
      expect(typeof provider.onInAppMessage).toBe("function");
      expect(typeof provider.onPushOpened).toBe("function");
      expect(typeof provider.flush).toBe("function");
    });

    it("should call methods without throwing", async () => {
      const { ConsoleMessagingProvider } = await import("../messaging/console-provider");
      const provider = new ConsoleMessagingProvider();
      provider.init({});
      provider.setUser({ userId: "u1", email: "test@test.com" });
      provider.clearUser();
      provider.setUserAttributes({ plan: "premium" });
      provider.logEvent("purchase", { amount: 100 });
      provider.registerPushToken("abc123token");
      provider.handlePushReceived({ title: "Test" });
      await provider.flush();
    });

    it("should return push permission status", async () => {
      const { ConsoleMessagingProvider } = await import("../messaging/console-provider");
      const provider = new ConsoleMessagingProvider();
      provider.init({});
      const requestResult = await provider.requestPushPermission();
      expect(requestResult).toEqual({ granted: true, canRequest: true });
      const statusResult = await provider.getPushPermissionStatus();
      expect(statusResult).toEqual({ granted: false, canRequest: true });
    });

    it("should handle in-app message subscription", async () => {
      const { ConsoleMessagingProvider } = await import("../messaging/console-provider");
      const provider = new ConsoleMessagingProvider();
      const callback = vi.fn();
      const sub = provider.onInAppMessage(callback);
      expect(typeof sub.unsubscribe).toBe("function");
      sub.unsubscribe();
    });

    it("should handle push opened subscription", async () => {
      const { ConsoleMessagingProvider } = await import("../messaging/console-provider");
      const provider = new ConsoleMessagingProvider();
      const callback = vi.fn();
      const sub = provider.onPushOpened(callback);
      expect(typeof sub.unsubscribe).toBe("function");
      sub.unsubscribe();
    });
  });

  describe("getAnalytics factory", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it("should return a provider with default console provider", async () => {
      const { getAnalytics } = await import("../analytics");
      const provider = getAnalytics();
      expect(provider).toBeDefined();
      expect(provider.name).toBe("console");
      expect(typeof provider.track).toBe("function");
    });
  });

  describe("getErrorTracking factory", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it("should return a provider with default console provider", async () => {
      const { getErrorTracking } = await import("../errors");
      const provider = getErrorTracking();
      expect(provider).toBeDefined();
      expect(provider.name).toBe("console");
      expect(typeof provider.captureException).toBe("function");
    });
  });

  describe("getMessaging factory", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it("should return a provider with default console provider", async () => {
      const { getMessaging } = await import("../messaging");
      const provider = getMessaging();
      expect(provider).toBeDefined();
      expect(provider.name).toBe("console");
      expect(typeof provider.logEvent).toBe("function");
    });
  });

  describe("Service index re-exports", () => {
    it("should export getAnalytics, getErrorTracking, getMessaging", async () => {
      const services = await import("../index");
      expect(typeof services.getAnalytics).toBe("function");
      expect(typeof services.getErrorTracking).toBe("function");
      expect(typeof services.getMessaging).toBe("function");
    });

    it("should export analytics singleton with expected methods", async () => {
      const { analytics } = await import("../index");
      expect(typeof analytics.track).toBe("function");
      expect(typeof analytics.identify).toBe("function");
      expect(typeof analytics.page).toBe("function");
      expect(typeof analytics.setUserProperties).toBe("function");
      expect(typeof analytics.reset).toBe("function");
      expect(typeof analytics.revenue).toBe("function");
      expect(typeof analytics.timeEvent).toBe("function");
      expect(typeof analytics.flush).toBe("function");
    });

    it("should export errors singleton with expected methods", async () => {
      const { errors } = await import("../index");
      expect(typeof errors.captureException).toBe("function");
      expect(typeof errors.captureMessage).toBe("function");
      expect(typeof errors.setUser).toBe("function");
      expect(typeof errors.addBreadcrumb).toBe("function");
      expect(typeof errors.setTag).toBe("function");
      expect(typeof errors.setExtra).toBe("function");
      expect(typeof errors.startTransaction).toBe("function");
      expect(typeof errors.flush).toBe("function");
    });

    it("should export messaging singleton with expected methods", async () => {
      const { messaging } = await import("../index");
      expect(typeof messaging.setUser).toBe("function");
      expect(typeof messaging.clearUser).toBe("function");
      expect(typeof messaging.setUserAttributes).toBe("function");
      expect(typeof messaging.logEvent).toBe("function");
      expect(typeof messaging.requestPushPermission).toBe("function");
      expect(typeof messaging.getPushPermissionStatus).toBe("function");
      expect(typeof messaging.onInAppMessage).toBe("function");
      expect(typeof messaging.onPushOpened).toBe("function");
      expect(typeof messaging.flush).toBe("function");
    });
  });
});
