/**
 * Analytics Provider Registry
 *
 * Reads VITE_ANALYTICS_PROVIDER env var and instantiates the correct provider.
 * Defaults to 'console' (sandbox) when no provider is configured.
 *
 * Supported values: 'rudderstack' | 'mixpanel' | 'amplitude' | 'posthog' | 'console'
 */

import type { AnalyticsProvider } from "../types";
import { ConsoleAnalyticsProvider } from "./console-provider";
import { MixpanelProvider } from "./mixpanel-provider";
import { AmplitudeProvider } from "./amplitude-provider";
import { RudderStackProvider } from "./rudderstack-provider";
import { PostHogProvider } from "./posthog-provider";

let _provider: AnalyticsProvider | null = null;

export function getAnalytics(): AnalyticsProvider {
  if (_provider) return _provider;

  const providerName = import.meta.env.VITE_ANALYTICS_PROVIDER ?? "console";

  switch (providerName) {
    case "rudderstack": {
      _provider = new RudderStackProvider();
      _provider.init({
        writeKey: import.meta.env.VITE_RUDDERSTACK_WRITE_KEY ?? "",
        dataPlaneUrl: import.meta.env.VITE_RUDDERSTACK_DATA_PLANE ?? "",
        debug: import.meta.env.DEV,
      });
      break;
    }
    case "mixpanel": {
      _provider = new MixpanelProvider();
      _provider.init({
        token: import.meta.env.VITE_MIXPANEL_TOKEN ?? "",
        debug: import.meta.env.DEV,
      });
      break;
    }
    case "amplitude": {
      _provider = new AmplitudeProvider();
      _provider.init({
        apiKey: import.meta.env.VITE_AMPLITUDE_API_KEY ?? "",
      });
      break;
    }
    case "posthog": {
      _provider = new PostHogProvider();
      _provider.init({
        apiKey: import.meta.env.VITE_POSTHOG_API_KEY ?? "",
        host: import.meta.env.VITE_POSTHOG_HOST ?? "https://app.posthog.com",
        enableSessionReplay: import.meta.env.VITE_POSTHOG_SESSION_REPLAY === "true",
      });
      break;
    }
    case "console":
    default: {
      _provider = new ConsoleAnalyticsProvider();
      _provider.init({});
      break;
    }
  }

  return _provider;
}

export { ConsoleAnalyticsProvider } from "./console-provider";
export { MixpanelProvider } from "./mixpanel-provider";
export { AmplitudeProvider } from "./amplitude-provider";
export { RudderStackProvider } from "./rudderstack-provider";
export { PostHogProvider } from "./posthog-provider";
