/**
 * Gateway Domain — CMS, CMS Tokens, Experiments, Exports, ReportTemplates, SDUI
 */

import type { CallGatewayFn, Pagination } from "./client";
import type { CMSChannel, CMSContent, CMSContentVersion, CMSApiToken } from "@/types/admin";
import type {
  Experiment,
  ExperimentStatus,
  ExperimentEventType,
  ExperimentAssignment,
  ExperimentResults,
  ExperimentCreateInput,
} from "@/types/experiments";
import type {
  ResolvedScreen,
  ScreenManifest,
  ScreenManifestCreateInput,
  ScreenManifestUpdateInput,
  UserPersona,
  PersonaCreateInput,
  PersonaRule,
} from "@/types/sdui";

export function createContentDomain(callGateway: CallGatewayFn) {
  return {
    cms: {
      async listChannels() {
        return callGateway<{ channels: CMSChannel[] }>("cms.channels.list", {});
      },
      async updateChannel(id: string, updates: Partial<CMSChannel>) {
        return callGateway<{ channel: CMSChannel }>("cms.channels.update", { id, ...updates });
      },
      async listContent(
        params: {
          status?: string;
          contentType?: string;
          channel?: string;
          limit?: number;
          offset?: number;
        } = {},
      ) {
        return callGateway<{ content: CMSContent[]; _pagination?: Pagination }>(
          "cms.content.list",
          params,
        );
      },
      async getContent(id: string) {
        return callGateway<{ content: CMSContent }>("cms.content.get", { id });
      },
      async createContent(input: {
        slug: string;
        title: string;
        body?: string;
        contentType?: string;
        channels?: string[];
        metadata?: Record<string, unknown>;
        scheduledAt?: string;
        expiresAt?: string;
      }) {
        return callGateway<{ content: CMSContent }>("cms.content.create", input);
      },
      async updateContent(id: string, updates: Partial<CMSContent>) {
        return callGateway<{ content: CMSContent }>("cms.content.update", { id, ...updates });
      },
      async deleteContent(id: string) {
        return callGateway<{ success: boolean }>("cms.content.delete", { id });
      },
      async publishContent(id: string) {
        return callGateway<{ content: Partial<CMSContent> }>("cms.content.publish", { id });
      },
      async archiveContent(id: string) {
        return callGateway<{ content: Partial<CMSContent> }>("cms.content.archive", { id });
      },
      async getContentVersions(contentId: string) {
        return callGateway<{ versions: CMSContentVersion[] }>("cms.content.versions", {
          contentId,
        });
      },
      async getPublicContent(slug: string) {
        return callGateway<{ content: CMSContent }>("cms.content.public", { slug });
      },
      async listPublicContent(
        params: { contentType?: string; channel?: string; limit?: number; offset?: number } = {},
      ) {
        return callGateway<{ content: CMSContent[]; _pagination?: Pagination }>(
          "cms.content.publicList",
          params,
        );
      },
    },

    cmsTokens: {
      async list() {
        return callGateway<{ tokens: CMSApiToken[] }>("cms.tokens.list", {});
      },
      async create(input: {
        name: string;
        scopes?: string[];
        allowedChannels?: string[] | null;
        rateLimit?: number;
        expiresAt?: string | null;
      }) {
        return callGateway<{ token: CMSApiToken }>("cms.tokens.create", input);
      },
      async revoke(id: string) {
        return callGateway<{ success: boolean }>("cms.tokens.revoke", { id });
      },
    },

    experiments: {
      async list(params: { status?: ExperimentStatus } = {}) {
        return callGateway<Experiment[]>("experiments.list", params);
      },
      async get(id: string) {
        return callGateway<Experiment>("experiments.get", { id });
      },
      async create(input: ExperimentCreateInput) {
        return callGateway<Experiment>("experiments.create", input);
      },
      async update(
        id: string,
        updates: { name?: string; description?: string; trafficPercent?: number },
      ) {
        return callGateway<Experiment>("experiments.update", { id, ...updates });
      },
      async start(id: string) {
        return callGateway<Experiment>("experiments.start", { id });
      },
      async pause(id: string) {
        return callGateway<Experiment>("experiments.pause", { id });
      },
      async resume(id: string) {
        return callGateway<Experiment>("experiments.resume", { id });
      },
      async complete(id: string) {
        return callGateway<Experiment>("experiments.complete", { id });
      },
      async assign(experimentId: string) {
        return callGateway<ExperimentAssignment>("experiments.assign", { experimentId });
      },
      async track(params: {
        experimentId: string;
        variantId: string;
        eventType: ExperimentEventType;
        metadata?: Record<string, unknown>;
      }) {
        return callGateway<{ success: boolean }>("experiments.track", params);
      },
      async results(experimentId: string) {
        return callGateway<ExperimentResults>("experiments.results", { experimentId });
      },
    },

    exports: {
      async list(
        params: { limit?: number; offset?: number; status?: string; reportType?: string } = {},
      ) {
        return callGateway<{ exports: import("@/types/admin").ExportRequest[] }>(
          "exports.list",
          params,
        );
      },
      async create(params: {
        reportType: string;
        format: string;
        dateRangeStart: string;
        dateRangeEnd: string;
        filters?: Record<string, unknown>;
      }) {
        return callGateway<{ export: import("@/types/admin").ExportRequest }>(
          "exports.create",
          params,
        );
      },
      async get(exportId: string) {
        return callGateway<{ export: import("@/types/admin").ExportRequest }>("exports.get", {
          exportId,
        });
      },
      async download(exportId: string) {
        return callGateway<{ fileUrl: string; format: string; fileName: string }>(
          "exports.download",
          { exportId },
        );
      },
      async delete(exportId: string) {
        return callGateway<{ success: boolean }>("exports.delete", { exportId });
      },
      async summary() {
        return callGateway<{ summary: import("@/types/admin").ReportSummary }>(
          "exports.summary",
          {},
        );
      },
    },

    reportTemplates: {
      async list() {
        return callGateway<{ templates: import("@/types/admin").ReportTemplate[] }>(
          "reports.templates.list",
          {},
        );
      },
      async create(params: {
        name: string;
        description?: string;
        reportType: string;
        defaultFormat: string;
        defaultFilters?: Record<string, unknown>;
        schedule?: Record<string, unknown>;
      }) {
        return callGateway<{ template: import("@/types/admin").ReportTemplate }>(
          "reports.templates.create",
          params,
        );
      },
      async update(params: {
        templateId: string;
        name?: string;
        description?: string;
        defaultFormat?: string;
        defaultFilters?: Record<string, unknown>;
        schedule?: Record<string, unknown>;
      }) {
        return callGateway<{ template: import("@/types/admin").ReportTemplate }>(
          "reports.templates.update",
          params,
        );
      },
      async delete(templateId: string) {
        return callGateway<{ success: boolean }>("reports.templates.delete", { templateId });
      },
    },

    sdui: {
      async resolve(screenKey: string) {
        return callGateway<ResolvedScreen>("sdui.resolve", { screenKey });
      },
      async persona() {
        return callGateway<{
          personaId: string;
          personaLabel: string;
          traits: Record<string, unknown>;
        }>("sdui.persona", {});
      },
      personas: {
        async list() {
          return callGateway<
            Array<
              UserPersona & {
                id: string;
                firmId: string;
                isActive: boolean;
                createdAt: string;
                updatedAt: string;
              }
            >
          >("sdui.personas.list", {});
        },
        async create(input: PersonaCreateInput) {
          return callGateway<UserPersona & { id: string }>("sdui.personas.create", input);
        },
        async update(
          id: string,
          updates: {
            label?: string;
            description?: string;
            rules?: PersonaRule[];
            priority?: number;
            isActive?: boolean;
          },
        ) {
          return callGateway<UserPersona & { id: string }>("sdui.personas.update", {
            id,
            ...updates,
          });
        },
        async delete(id: string) {
          return callGateway<{ success: boolean }>("sdui.personas.delete", { id });
        },
      },
      manifests: {
        async list(params: { screenKey?: string } = {}) {
          return callGateway<Array<ScreenManifest>>("sdui.manifests.list", params);
        },
        async get(id: string) {
          return callGateway<ScreenManifest>("sdui.manifests.get", { id });
        },
        async create(input: ScreenManifestCreateInput) {
          return callGateway<ScreenManifest>("sdui.manifests.create", input);
        },
        async update(id: string, updates: ScreenManifestUpdateInput) {
          return callGateway<ScreenManifest>("sdui.manifests.update", { id, ...updates });
        },
        async delete(id: string) {
          return callGateway<{ success: boolean }>("sdui.manifests.delete", { id });
        },
      },
    },
  };
}
