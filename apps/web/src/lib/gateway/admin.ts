/**
 * Gateway Domain — Admin Users, Accounts, Integrations, Audit, UserActions, Branding, CDP, Autonomous, SSO
 */

import type { CallGatewayFn, Pagination } from "./client";
import type {
  UserListItem,
  AdminAccountItem,
  AccountAggregates,
  IntegrationStatus,
  AdminAuditLogEntry,
} from "@/types";

export function createAdminDomain(callGateway: CallGatewayFn) {
  return {
    adminUsers: {
      async list(
        params: {
          status?: string;
          kycStatus?: string;
          search?: string;
          limit?: number;
          offset?: number;
        } = {},
      ) {
        return callGateway<{ users: UserListItem[]; _pagination?: Pagination }>(
          "admin.users.list",
          params,
        );
      },
    },

    adminAccounts: {
      async list(
        params: {
          type?: string;
          status?: string;
          search?: string;
          limit?: number;
          offset?: number;
        } = {},
      ) {
        return callGateway<{ accounts: AdminAccountItem[]; _pagination?: Pagination }>(
          "admin.accounts.list",
          params,
        );
      },

      async aggregates() {
        return callGateway<{ aggregates: AccountAggregates }>("admin.accounts.aggregates", {});
      },
    },

    adminIntegrations: {
      async list() {
        return callGateway<{ integrations: IntegrationStatus[] }>("admin.integrations.list", {});
      },
    },

    adminAudit: {
      async log(
        params: {
          action?: string;
          user?: string;
          search?: string;
          limit?: number;
          offset?: number;
        } = {},
      ) {
        return callGateway<{ entries: AdminAuditLogEntry[]; _pagination?: Pagination }>(
          "admin.audit.log",
          params,
        );
      },
    },

    adminUserActions: {
      async suspend(userId: string) {
        return callGateway<{ success: boolean }>("admin.users.suspend", { userId });
      },
      async activate(userId: string) {
        return callGateway<{ success: boolean }>("admin.users.activate", { userId });
      },
      async resetPassword(userId: string) {
        return callGateway<{ success: boolean }>("admin.users.resetPassword", { userId });
      },
      async invite(params: { email: string; role?: string; displayName?: string }) {
        return callGateway<{
          invitation: { id: string; email: string; role: string; token: string; expiresAt: string };
        }>("admin.users.invite", params);
      },
    },

    adminBranding: {
      async update(branding: {
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
        logoUrl?: string | null;
        fontFamily?: string;
        layoutTheme?: string;
        customCss?: string;
      }) {
        return callGateway<{ branding: Record<string, unknown> }>(
          "admin.branding.update",
          branding,
        );
      },
    },

    designSystem: {
      async get() {
        return callGateway<{
          designSystem: import("@/types/admin").DesignSystemConfig | null;
          tenantName?: string;
          logoUrl?: string | null;
          primaryColor?: string;
          accentColor?: string;
        }>("admin.designSystem.get", {});
      },
      async update(designSystem: import("@/types/admin").DesignSystemConfig) {
        return callGateway<{
          designSystem: import("@/types/admin").DesignSystemConfig;
        }>("admin.designSystem.update", { designSystem });
      },
    },

    adminCDP: {
      async getConfig() {
        return callGateway<{
          config: {
            id?: string;
            enabled: boolean;
            provider: string;
            writeKey: string;
            dataPlaneUrl: string;
            consentCategories: string[];
            eventSchemas: Array<{ event: string; category: string; description: string }>;
            createdAt?: string;
            updatedAt?: string;
          };
        }>("admin.cdp.config.get", {});
      },
      async updateConfig(params: {
        enabled?: boolean;
        writeKey?: string;
        dataPlaneUrl?: string;
        consentCategories?: string[];
        eventSchemas?: Array<{ event: string; category: string; description: string }>;
      }) {
        return callGateway<{ config: Record<string, unknown> }>("admin.cdp.config.update", params);
      },
      async listDestinations() {
        return callGateway<{
          destinations: Array<{
            id: string;
            name: string;
            type: string;
            category: string;
            enabled: boolean;
            config: Record<string, unknown>;
            eventFilter: string[];
            consentRequired: string[];
            lastSyncAt?: string;
            createdAt: string;
            updatedAt: string;
          }>;
        }>("admin.cdp.destinations.list", {});
      },
      async createDestination(params: {
        name: string;
        type: string;
        category: string;
        config?: Record<string, unknown>;
        eventFilter?: string[];
        consentRequired?: string[];
      }) {
        return callGateway<{ destination: Record<string, unknown> }>(
          "admin.cdp.destinations.create",
          params,
        );
      },
      async updateDestination(params: {
        id: string;
        name?: string;
        enabled?: boolean;
        config?: Record<string, unknown>;
        eventFilter?: string[];
        consentRequired?: string[];
      }) {
        return callGateway<{ destination: Record<string, unknown> }>(
          "admin.cdp.destinations.update",
          params,
        );
      },
      async deleteDestination(id: string) {
        return callGateway<{ success: boolean }>("admin.cdp.destinations.delete", { id });
      },
      async listRecentEvents(
        params: { limit?: number; eventName?: string; category?: string } = {},
      ) {
        return callGateway<{
          events: Array<{
            id: string;
            eventName: string;
            category: string;
            userId: string | null;
            properties: Record<string, unknown>;
            destinations: string[];
            status: string;
            createdAt: string;
          }>;
        }>("admin.cdp.events.recent", params);
      },
      async getEventSummary(range?: string) {
        return callGateway<{
          summary: {
            totalEvents: number;
            delivered: number;
            failed: number;
            deliveryRate: number;
            byEvent: Array<{ name: string; count: number }>;
            byCategory: Array<{ name: string; count: number }>;
            range: string;
          };
        }>("admin.cdp.events.summary", { range });
      },
    },

    sso: {
      async list() {
        return callGateway<{ providers: Array<Record<string, unknown>> }>("sso.providers.list", {});
      },
      async get(id: string) {
        return callGateway<{ provider: Record<string, unknown> }>("sso.providers.get", { id });
      },
      async create(config: Record<string, unknown>) {
        return callGateway<{ provider: Record<string, unknown> }>("sso.providers.create", config);
      },
      async update(id: string, config: Record<string, unknown>) {
        return callGateway<{ provider: Record<string, unknown> }>("sso.providers.update", {
          id,
          ...config,
        });
      },
      async delete(id: string) {
        return callGateway<{ success: boolean }>("sso.providers.delete", { id });
      },
      async test(id: string, providerType: string) {
        return callGateway<{ status: string }>("sso.providers.test", { id, providerType });
      },
    },

    adminAutonomous: {
      serviceAccounts: {
        async list(params: { status?: string; limit?: number; offset?: number } = {}) {
          return callGateway<{
            serviceAccounts: Array<{
              id: string;
              name: string;
              description: string | null;
              apiKeySuffix: string;
              status: string;
              allowedActions: string[];
              rateLimitPerHour: number;
              lastUsedAt: string | null;
              totalInvocations: number;
              createdAt: string;
            }>;
            total: number;
          }>("admin.autonomous.serviceAccounts.list", params);
        },
        async create(params: {
          name: string;
          description?: string;
          allowedActions: string[];
          rateLimitPerHour?: number;
          ipAllowlist?: string[];
        }) {
          return callGateway<{
            serviceAccount: {
              id: string;
              name: string;
              apiKey: string;
              apiKeySuffix: string;
              allowedActions: string[];
              status: string;
            };
            warning: string;
          }>("admin.autonomous.serviceAccounts.create", params);
        },
        async update(
          accountId: string,
          updates: {
            status?: string;
            allowedActions?: string[];
            rateLimitPerHour?: number;
            name?: string;
          },
        ) {
          return callGateway<{ serviceAccount: Record<string, unknown> }>(
            "admin.autonomous.serviceAccounts.update",
            { accountId, ...updates },
          );
        },
        async revoke(accountId: string) {
          return callGateway<{ revoked: boolean }>("admin.autonomous.serviceAccounts.revoke", {
            accountId,
          });
        },
      },
      policies: {
        async list() {
          return callGateway<{
            policies: Array<{
              id: string;
              action: string;
              approval: string;
              conditions: Record<string, unknown>;
              maxAutoPerHour: number;
              notifyOnAuto: boolean;
              description: string | null;
              isActive: boolean;
            }>;
          }>("admin.autonomous.policies.list", {});
        },
        async upsert(params: {
          action: string;
          approval: string;
          conditions?: Record<string, unknown>;
          maxAutoPerHour?: number;
          notifyOnAuto?: boolean;
          description?: string;
          priority?: number;
        }) {
          return callGateway<{ policy: Record<string, unknown> }>(
            "admin.autonomous.policies.upsert",
            params,
          );
        },
        async delete(policyId: string) {
          return callGateway<{ deleted: boolean }>("admin.autonomous.policies.delete", {
            policyId,
          });
        },
      },
      executions: {
        async list(
          params: { status?: string; action?: string; limit?: number; offset?: number } = {},
        ) {
          return callGateway<{
            executions: Array<{
              id: string;
              action: string;
              actionParams: Record<string, unknown>;
              status: string;
              policyApproval: string;
              result: Record<string, unknown> | null;
              errorMessage: string | null;
              startedAt: string | null;
              completedAt: string | null;
              createdAt: string;
            }>;
            total: number;
          }>("admin.autonomous.executions.list", params);
        },
        async approve(executionId: string) {
          return callGateway<{ execution: Record<string, unknown> }>(
            "admin.autonomous.executions.approve",
            { executionId },
          );
        },
        async reject(executionId: string, reason?: string) {
          return callGateway<{ rejected: boolean }>("admin.autonomous.executions.reject", {
            executionId,
            reason,
          });
        },
      },
      async stats() {
        return callGateway<{
          autonomousEnabled: boolean;
          pausedAt: string | null;
          last24h: { total: number; byStatus: Record<string, number> };
          last7dTotal: number;
          pendingEvents: number;
          pendingApprovals: number;
          activeRules: number;
          activeServiceAccounts: number;
        }>("admin.autonomous.stats", {});
      },
      events: {
        async list(
          params: {
            status?: string;
            eventType?: string;
            source?: string;
            limit?: number;
            offset?: number;
          } = {},
        ) {
          return callGateway<{
            events: Array<{
              id: string;
              source: string;
              eventType: string;
              payload: Record<string, unknown>;
              status: string;
              createdAt: string;
            }>;
            total: number;
          }>("admin.autonomous.events.list", params);
        },
      },
      async toggle(enabled: boolean) {
        return callGateway<{ autonomousEnabled: boolean }>("admin.autonomous.toggle", { enabled });
      },
      async trigger(batchSize?: number) {
        return callGateway<{
          totalEventsProcessed: number;
          totalRulesMatched: number;
          totalActionsExecuted: number;
          totalErrors: number;
        }>("admin.autonomous.trigger", { batchSize });
      },
    },
  };
}
