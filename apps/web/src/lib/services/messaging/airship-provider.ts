/**
 * Airship Messaging Provider
 *
 * Wraps the Airship Web SDK behind the MessagingProvider interface.
 * Requires `airship-web-notifications` or Airship Web SDK to be installed.
 *
 * Config:
 *   VITE_AIRSHIP_APP_KEY — Airship app key
 *   VITE_AIRSHIP_TOKEN — Airship bearer token (web)
 *   VITE_AIRSHIP_SITE — 'US' or 'EU' (default: 'US')
 *
 * Install: npm install @airship/web
 */

import type {
  MessagingProvider,
  MessagingUser,
  InAppMessage,
  PushPermissionStatus,
} from "../types";

/** Minimal shape of the Airship Web SDK used by this provider */
interface AirshipLib {
  init(options: Record<string, unknown>): void;
  contact: {
    identify(userId: string): void;
    registerEmail(email: string, options: Record<string, unknown>): void;
    reset(): void;
    editAttributes(): Promise<{ set: (k: string, v: unknown) => unknown; apply: () => void }>;
  };
  analytics: {
    addCustomEvent(event: { name: string; properties: Record<string, unknown> }): void;
  };
  push: {
    requestPermission(): Promise<void>;
    isOptedIn(): Promise<boolean>;
    addEventListener(event: string, handler: (event: AirshipPushEvent) => void): void;
    removeEventListener(event: string, handler: (event: AirshipPushEvent) => void): void;
  };
  inApp: {
    subscribe(handler: (msg: AirshipInAppMessage) => void): void;
    unsubscribe(handler: (msg: AirshipInAppMessage) => void): void;
  };
}

interface AirshipInAppMessage {
  id?: string;
  title?: string;
  body?: string;
  extras?: Record<string, unknown>;
}

interface AirshipPushEvent {
  notification?: Record<string, unknown>;
  [key: string]: unknown;
}

export class AirshipProvider implements MessagingProvider {
  readonly name = "airship";
  private ua: AirshipLib | null = null;

  async init(config: Record<string, unknown>): Promise<void> {
    const appKey = config.appKey as string;
    const token = config.token as string;

    if (!appKey) {
      console.warn("[Airship] Missing appKey. Airship is disabled.");
      return;
    }

    try {
      // Dynamic import with variable indirection so Rollup/Vite skip static resolution
      const pkg = "@airship/web";
      const UA = await import(/* @vite-ignore */ pkg);
      const sdk = UA.default ?? UA;
      await Promise.resolve(sdk).then((sdk: AirshipLib) => {
        sdk.init({
          appKey,
          token,
          site: (config.site as string) ?? "US",
          ...((config.options as Record<string, unknown>) ?? {}),
        });
        this.ua = sdk;
      });
    } catch {
      console.warn("[Airship] @airship/web not installed. Run: npm install @airship/web");
    }
  }

  setUser(user: MessagingUser): void {
    if (!this.ua) return;
    this.ua.contact.identify(user.userId);
    if (user.email) {
      this.ua.contact.registerEmail(user.email, {
        transactional_opted_in: new Date().toISOString(),
      });
    }
  }

  clearUser(): void {
    if (!this.ua) return;
    this.ua.contact.reset();
  }

  setUserAttributes(attributes: Record<string, unknown>): void {
    if (!this.ua) return;
    this.ua.contact
      .editAttributes()
      .then((editor: { set: (k: string, v: unknown) => unknown; apply: () => void }) => {
        for (const [key, value] of Object.entries(attributes)) {
          editor.set(key, value);
        }
        editor.apply();
      });
  }

  logEvent(event: string, properties?: Record<string, unknown>): void {
    if (!this.ua) return;
    this.ua.analytics.addCustomEvent({
      name: event,
      properties: properties ?? {},
    });
  }

  async requestPushPermission(): Promise<PushPermissionStatus> {
    if (!this.ua) return { granted: false, canRequest: false };
    try {
      await this.ua.push.requestPermission();
      const granted = await this.ua.push.isOptedIn();
      return { granted, canRequest: true };
    } catch {
      return { granted: false, canRequest: false };
    }
  }

  async getPushPermissionStatus(): Promise<PushPermissionStatus> {
    if (!this.ua) return { granted: false, canRequest: false };
    const granted = await this.ua.push.isOptedIn();
    return { granted, canRequest: !granted };
  }

  registerPushToken(_token: string): void {
    // Airship handles push tokens automatically
  }

  handlePushReceived(_payload: Record<string, unknown>): void {
    // Airship handles push display automatically
  }

  onInAppMessage(callback: (message: InAppMessage) => void): { unsubscribe: () => void } {
    if (!this.ua) return { unsubscribe: () => {} };
    const handler = (msg: AirshipInAppMessage) => {
      callback({
        id: msg.id || String(Date.now()),
        title: msg.title,
        body: msg.body,
        extras: msg.extras,
      });
    };
    this.ua.inApp.subscribe(handler);
    return { unsubscribe: () => this.ua?.inApp?.unsubscribe?.(handler) };
  }

  onPushOpened(callback: (payload: Record<string, unknown>) => void): { unsubscribe: () => void } {
    if (!this.ua) return { unsubscribe: () => {} };
    const handler = (event: AirshipPushEvent) => {
      callback(event.notification ?? {});
    };
    this.ua.push.addEventListener("notificationClicked", handler);
    return {
      unsubscribe: () => this.ua?.push?.removeEventListener?.("notificationClicked", handler),
    };
  }

  async flush(): Promise<void> {
    // Airship auto-flushes
  }
}
