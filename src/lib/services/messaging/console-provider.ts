/**
 * Console Messaging Provider (Sandbox)
 *
 * Logs all messaging events to the browser console.
 * Used when no messaging SDK is configured.
 */

import type { MessagingProvider, MessagingUser, InAppMessage, PushPermissionStatus } from '../types';

const PREFIX = '[Messaging]';

export class ConsoleMessagingProvider implements MessagingProvider {
  readonly name = 'console';
  private inAppCallbacks: Array<(msg: InAppMessage) => void> = [];
  private pushCallbacks: Array<(payload: Record<string, unknown>) => void> = [];

  init(_config: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`${PREFIX} Console messaging provider initialized (sandbox mode)`);
    }
  }

  setUser(user: MessagingUser): void {
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} setUser`, { userId: user.userId, email: user.email });
  }

  clearUser(): void {
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} clearUser`);
  }

  setUserAttributes(attributes: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} setUserAttributes`, attributes);
  }

  logEvent(event: string, properties?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} logEvent "${event}"`, properties ?? {});
  }

  async requestPushPermission(): Promise<PushPermissionStatus> {
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} requestPushPermission (sandbox: auto-granted)`);
    return { granted: true, canRequest: true };
  }

  async getPushPermissionStatus(): Promise<PushPermissionStatus> {
    return { granted: false, canRequest: true };
  }

  registerPushToken(token: string): void {
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} registerPushToken`, token.substring(0, 8) + '...');
  }

  handlePushReceived(payload: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.debug(`${PREFIX} handlePushReceived`, payload);
  }

  onInAppMessage(callback: (message: InAppMessage) => void): { unsubscribe: () => void } {
    this.inAppCallbacks.push(callback);
    return {
      unsubscribe: () => {
        this.inAppCallbacks = this.inAppCallbacks.filter((cb) => cb !== callback);
      },
    };
  }

  onPushOpened(callback: (payload: Record<string, unknown>) => void): { unsubscribe: () => void } {
    this.pushCallbacks.push(callback);
    return {
      unsubscribe: () => {
        this.pushCallbacks = this.pushCallbacks.filter((cb) => cb !== callback);
      },
    };
  }

  async flush(): Promise<void> {
    // no-op
  }
}
