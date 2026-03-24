/**
 * Braze Messaging Provider
 *
 * Wraps the Braze Web SDK behind the MessagingProvider interface.
 * Requires `@braze/web-sdk` to be installed.
 *
 * Config:
 *   VITE_BRAZE_API_KEY — Braze API key
 *   VITE_BRAZE_SDK_ENDPOINT — Braze SDK endpoint (e.g. 'sdk.iad-01.braze.com')
 *
 * Install: npm install @braze/web-sdk
 */

import type {
  MessagingProvider,
  MessagingUser,
  InAppMessage,
  PushPermissionStatus,
} from "../types";

/** Minimal shape of the Braze Web SDK used by this provider */
interface BrazeLib {
  initialize(apiKey: string, options: Record<string, unknown>): void;
  openSession(): void;
  changeUser(userId: string): void;
  getUser(): {
    setEmail(email: string): void;
    setFirstName(name: string): void;
    setLastName(name: string): void;
    setPhoneNumber(phone: string): void;
    setCustomUserAttribute(key: string, value: unknown): void;
  };
  logCustomEvent(event: string, properties?: Record<string, unknown>): void;
  requestPushPermission(): void;
  isPushGranted(): boolean;
  subscribeToInAppMessage(
    callback: (msg: BrazeInAppMessage) => void,
  ): { removeSubscriber?: () => void } | undefined;
  subscribeToContentCardsUpdates(
    callback: (cards: unknown) => void,
  ): { removeSubscriber?: () => void } | undefined;
  showInAppMessage(msg: unknown): void;
  requestImmediateDataFlush(): void;
}

interface BrazeInAppMessage {
  messageId?: string;
  header?: string;
  message?: string;
  imageUrl?: string;
  extras?: Record<string, unknown>;
}

export class BrazeProvider implements MessagingProvider {
  readonly name = "braze";
  private braze: BrazeLib | null = null;

  async init(config: Record<string, unknown>): Promise<void> {
    const apiKey = config.apiKey as string;
    const sdkEndpoint = config.sdkEndpoint as string;

    if (!apiKey || !sdkEndpoint) {
      console.warn("[Braze] Missing apiKey or sdkEndpoint. Braze is disabled.");
      return;
    }

    try {
      // Dynamic import with variable indirection so Rollup/Vite skip static resolution
      const pkg = "@braze/web-sdk";
      const mod = await import(/* @vite-ignore */ pkg);
      const braze = mod.default ?? mod;
      braze.initialize(apiKey, {
        baseUrl: sdkEndpoint,
        enableLogging: config.debug === true,
        ...((config.options as Record<string, unknown>) ?? {}),
      });
      braze.openSession();
      this.braze = braze;
    } catch {
      console.warn("[Braze] @braze/web-sdk not installed. Run: npm install @braze/web-sdk");
    }
  }

  setUser(user: MessagingUser): void {
    if (!this.braze) return;
    this.braze.changeUser(user.userId);
    const brazeUser = this.braze.getUser();
    if (user.email) brazeUser.setEmail(user.email);
    if (user.firstName) brazeUser.setFirstName(user.firstName);
    if (user.lastName) brazeUser.setLastName(user.lastName);
    if (user.phone) brazeUser.setPhoneNumber(user.phone);
  }

  clearUser(): void {
    // Braze doesn't have a clearUser — changing to anonymous is the equivalent
    // A new session with no changeUser call is effectively anonymous
  }

  setUserAttributes(attributes: Record<string, unknown>): void {
    if (!this.braze) return;
    const brazeUser = this.braze.getUser();
    for (const [key, value] of Object.entries(attributes)) {
      brazeUser.setCustomUserAttribute(key, value);
    }
  }

  logEvent(event: string, properties?: Record<string, unknown>): void {
    if (!this.braze) return;
    this.braze.logCustomEvent(event, properties);
  }

  async requestPushPermission(): Promise<PushPermissionStatus> {
    if (!this.braze) return { granted: false, canRequest: false };
    try {
      this.braze.requestPushPermission();
      return { granted: true, canRequest: true };
    } catch {
      return { granted: false, canRequest: false };
    }
  }

  async getPushPermissionStatus(): Promise<PushPermissionStatus> {
    if (!this.braze) return { granted: false, canRequest: false };
    const isPushGranted = this.braze.isPushGranted();
    return { granted: isPushGranted, canRequest: !isPushGranted };
  }

  registerPushToken(_token: string): void {
    // Braze Web SDK handles push tokens automatically via service workers
  }

  handlePushReceived(_payload: Record<string, unknown>): void {
    // Braze handles push display via its service worker
  }

  onInAppMessage(callback: (message: InAppMessage) => void): { unsubscribe: () => void } {
    if (!this.braze) return { unsubscribe: () => {} };
    const sub = this.braze.subscribeToInAppMessage((msg: BrazeInAppMessage) => {
      callback({
        id: msg.messageId || String(Date.now()),
        title: msg.header,
        body: msg.message,
        imageUrl: msg.imageUrl,
        extras: msg.extras,
      });
      // Auto-display the message
      this.braze.showInAppMessage(msg);
    });
    return { unsubscribe: () => sub?.removeSubscriber?.() };
  }

  onPushOpened(callback: (payload: Record<string, unknown>) => void): { unsubscribe: () => void } {
    if (!this.braze) return { unsubscribe: () => {} };
    const sub = this.braze.subscribeToContentCardsUpdates((cards: unknown) => {
      callback({ cards });
    });
    return { unsubscribe: () => sub?.removeSubscriber?.() };
  }

  async flush(): Promise<void> {
    if (!this.braze) return;
    this.braze.requestImmediateDataFlush();
  }
}
