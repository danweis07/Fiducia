/**
 * Gateway Domain — Auth, Member, Sessions, Devices, Notifications, NotificationPreferences
 */

import type { CallGatewayFn, Pagination } from "./client";
import type {
  Notification,
  BankingUser,
  MemberAddress,
  MemberDocument,
  MemberIdentifier,
  RegisteredDevice,
  DeviceActivityEntry,
} from "@/types";

export function createMemberDomain(callGateway: CallGatewayFn) {
  return {
    auth: {
      async profile() {
        return callGateway<{ user: BankingUser }>("auth.profile", {});
      },

      async updateProfile(
        updates: Partial<
          Pick<BankingUser, "firstName" | "lastName" | "phone" | "preferredLanguage" | "timezone">
        >,
      ) {
        return callGateway<{ user: BankingUser }>(
          "auth.updateProfile",
          updates as Record<string, unknown>,
        );
      },
    },

    member: {
      async addresses() {
        return callGateway<{ addresses: MemberAddress[] }>("member.addresses", {});
      },

      async updateAddress(
        id: string,
        updates: Partial<
          Pick<
            MemberAddress,
            "type" | "isPrimary" | "line1" | "line2" | "city" | "state" | "zip" | "country"
          >
        >,
      ) {
        return callGateway<{ address: MemberAddress }>("member.updateAddress", {
          id,
          ...updates,
        } as Record<string, unknown>);
      },

      async documents() {
        return callGateway<{ documents: MemberDocument[] }>("member.documents", {});
      },

      async identifiers() {
        return callGateway<{ identifiers: MemberIdentifier[] }>("member.identifiers", {});
      },
    },

    sessions: {
      async list() {
        return callGateway<{
          sessions: Array<{
            id: string;
            deviceName: string;
            deviceType: string;
            browser: string;
            os: string;
            ipAddress: string;
            location: string | null;
            isCurrent: boolean;
            isRevoked: boolean;
            lastActiveAt: string;
            createdAt: string;
            revokedAt: string | null;
          }>;
        }>("sessions.list", {});
      },
      async revoke(sessionId: string) {
        return callGateway<{ success: boolean }>("sessions.revoke", { sessionId });
      },
      async revokeAll(currentSessionId?: string) {
        return callGateway<{ success: boolean }>("sessions.revokeAll", {
          excludeCurrent: true,
          currentSessionId,
        });
      },
      async activity() {
        return callGateway<{
          activeSessions: number;
          sessions: Array<{
            id: string;
            deviceName: string;
            deviceType: string;
            browser: string;
            os: string;
            ipAddress: string;
            location: string | null;
            isCurrent: boolean;
            lastActiveAt: string;
            createdAt: string;
          }>;
        }>("sessions.activity", {});
      },
    },

    devices: {
      async list() {
        return callGateway<{ devices: RegisteredDevice[] }>("devices.list", {});
      },
      async get(deviceId: string) {
        return callGateway<{ device: RegisteredDevice }>("devices.get", { deviceId });
      },
      async rename(deviceId: string, name: string) {
        return callGateway<{ success: boolean }>("devices.rename", { deviceId, name });
      },
      async remove(deviceId: string) {
        return callGateway<{ success: boolean }>("devices.remove", { deviceId });
      },
      async activity(deviceId: string, params: { limit?: number; offset?: number } = {}) {
        return callGateway<{ activity: DeviceActivityEntry[] }>("devices.activity", {
          deviceId,
          ...params,
        });
      },
      async trust(deviceId: string) {
        return callGateway<{ success: boolean }>("devices.trust", { deviceId });
      },
      async untrust(deviceId: string) {
        return callGateway<{ success: boolean }>("devices.untrust", { deviceId });
      },
    },

    notifications: {
      async list(params: { unreadOnly?: boolean; limit?: number; offset?: number } = {}) {
        return callGateway<{ notifications: Notification[]; _pagination?: Pagination }>(
          "notifications.list",
          params,
        );
      },

      async markRead(id: string) {
        return callGateway<{ success: boolean }>("notifications.markRead", { id });
      },

      async markAllRead() {
        return callGateway<{ success: boolean }>("notifications.markAllRead", {});
      },

      async unreadCount() {
        return callGateway<{ count: number }>("notifications.unreadCount", {});
      },
    },

    notificationPreferences: {
      async get() {
        return callGateway<{
          preferences: {
            channels: Record<string, boolean>;
            categories: Record<string, { enabled: boolean; channels: string[] }>;
          };
        }>("notifications.preferences.get", {});
      },
      async update(params: {
        channels?: Record<string, boolean>;
        categories?: Record<string, { enabled: boolean; channels: string[] }>;
      }) {
        return callGateway<{
          preferences: {
            channels: Record<string, boolean>;
            categories: Record<string, { enabled: boolean; channels: string[] }>;
          };
        }>("notifications.preferences.update", params);
      },
      async test(channel: string) {
        return callGateway<{ sent: boolean; channel: string; message: string }>(
          "notifications.test",
          { channel },
        );
      },
    },
  };
}
