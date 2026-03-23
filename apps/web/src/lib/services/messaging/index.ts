/**
 * Messaging Provider Registry
 *
 * Reads VITE_MESSAGING_PROVIDER env var and instantiates the correct provider.
 * Defaults to 'console' (sandbox) when no provider is configured.
 *
 * Supported values: 'braze' | 'airship' | 'console'
 */

import type { MessagingProvider } from "../types";
import { ConsoleMessagingProvider } from "./console-provider";
import { BrazeProvider } from "./braze-provider";
import { AirshipProvider } from "./airship-provider";

let _provider: MessagingProvider | null = null;

export function getMessaging(): MessagingProvider {
  if (_provider) return _provider;

  const providerName = import.meta.env.VITE_MESSAGING_PROVIDER ?? "console";

  switch (providerName) {
    case "braze": {
      _provider = new BrazeProvider();
      _provider.init({
        apiKey: import.meta.env.VITE_BRAZE_API_KEY ?? "",
        sdkEndpoint: import.meta.env.VITE_BRAZE_SDK_ENDPOINT ?? "",
        debug: import.meta.env.DEV,
      });
      break;
    }
    case "airship": {
      _provider = new AirshipProvider();
      _provider.init({
        appKey: import.meta.env.VITE_AIRSHIP_APP_KEY ?? "",
        token: import.meta.env.VITE_AIRSHIP_TOKEN ?? "",
        site: import.meta.env.VITE_AIRSHIP_SITE ?? "US",
      });
      break;
    }
    case "console":
    default: {
      _provider = new ConsoleMessagingProvider();
      _provider.init({});
      break;
    }
  }

  return _provider;
}

export { ConsoleMessagingProvider } from "./console-provider";
export { BrazeProvider } from "./braze-provider";
export { AirshipProvider } from "./airship-provider";
