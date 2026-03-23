import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/backend", () => ({
  getBackend: vi.fn().mockReturnValue({
    gateway: { invoke: vi.fn() },
  }),
}));
vi.mock("@/lib/demo", () => ({
  isDemoMode: vi.fn().mockReturnValue(false),
}));

import { gateway } from "../../gateway";
import { getBackend } from "@/lib/backend";

function mockInvoke(data: unknown) {
  const backend = getBackend();
  vi.mocked(backend.gateway.invoke).mockResolvedValue({ data, error: undefined, meta: {} });
  return vi.mocked(backend.gateway.invoke);
}

describe("ContentDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── cms ──

  describe("cms", () => {
    it("listChannels calls cms.channels.list", async () => {
      const invoke = mockInvoke({ channels: [] });
      await gateway.cms.listChannels();
      expect(invoke).toHaveBeenCalledWith("cms.channels.list", {});
    });

    it("updateChannel calls cms.channels.update", async () => {
      const invoke = mockInvoke({ channel: {} });
      await gateway.cms.updateChannel("ch1", { name: "Updated" } as never);
      expect(invoke).toHaveBeenCalledWith("cms.channels.update", { id: "ch1", name: "Updated" });
    });

    it("listContent calls cms.content.list", async () => {
      const invoke = mockInvoke({ content: [] });
      await gateway.cms.listContent({ status: "published", limit: 10 });
      expect(invoke).toHaveBeenCalledWith("cms.content.list", { status: "published", limit: 10 });
    });

    it("getContent calls cms.content.get", async () => {
      const invoke = mockInvoke({ content: {} });
      await gateway.cms.getContent("c1");
      expect(invoke).toHaveBeenCalledWith("cms.content.get", { id: "c1" });
    });

    it("createContent calls cms.content.create", async () => {
      const invoke = mockInvoke({ content: {} });
      const input = { slug: "hello", title: "Hello World" };
      await gateway.cms.createContent(input);
      expect(invoke).toHaveBeenCalledWith("cms.content.create", input);
    });

    it("updateContent calls cms.content.update", async () => {
      const invoke = mockInvoke({ content: {} });
      await gateway.cms.updateContent("c1", { title: "Updated" } as never);
      expect(invoke).toHaveBeenCalledWith("cms.content.update", { id: "c1", title: "Updated" });
    });

    it("deleteContent calls cms.content.delete", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.cms.deleteContent("c1");
      expect(invoke).toHaveBeenCalledWith("cms.content.delete", { id: "c1" });
    });

    it("publishContent calls cms.content.publish", async () => {
      const invoke = mockInvoke({ content: {} });
      await gateway.cms.publishContent("c1");
      expect(invoke).toHaveBeenCalledWith("cms.content.publish", { id: "c1" });
    });

    it("archiveContent calls cms.content.archive", async () => {
      const invoke = mockInvoke({ content: {} });
      await gateway.cms.archiveContent("c1");
      expect(invoke).toHaveBeenCalledWith("cms.content.archive", { id: "c1" });
    });

    it("getContentVersions calls cms.content.versions", async () => {
      const invoke = mockInvoke({ versions: [] });
      await gateway.cms.getContentVersions("c1");
      expect(invoke).toHaveBeenCalledWith("cms.content.versions", { contentId: "c1" });
    });

    it("getPublicContent calls cms.content.public", async () => {
      const invoke = mockInvoke({ content: {} });
      await gateway.cms.getPublicContent("my-slug");
      expect(invoke).toHaveBeenCalledWith("cms.content.public", { slug: "my-slug" });
    });

    it("listPublicContent calls cms.content.publicList", async () => {
      const invoke = mockInvoke({ content: [] });
      await gateway.cms.listPublicContent({ contentType: "article" });
      expect(invoke).toHaveBeenCalledWith("cms.content.publicList", { contentType: "article" });
    });
  });

  // ── cmsTokens ──

  describe("cmsTokens", () => {
    it("list calls cms.tokens.list", async () => {
      const invoke = mockInvoke({ tokens: [] });
      await gateway.cmsTokens.list();
      expect(invoke).toHaveBeenCalledWith("cms.tokens.list", {});
    });

    it("create calls cms.tokens.create", async () => {
      const invoke = mockInvoke({ token: {} });
      await gateway.cmsTokens.create({ name: "API Key" });
      expect(invoke).toHaveBeenCalledWith("cms.tokens.create", { name: "API Key" });
    });

    it("revoke calls cms.tokens.revoke", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.cmsTokens.revoke("t1");
      expect(invoke).toHaveBeenCalledWith("cms.tokens.revoke", { id: "t1" });
    });
  });

  // ── experiments ──

  describe("experiments", () => {
    it("list calls experiments.list", async () => {
      const invoke = mockInvoke([]);
      await gateway.experiments.list({ status: "running" as never });
      expect(invoke).toHaveBeenCalledWith("experiments.list", { status: "running" });
    });

    it("get calls experiments.get", async () => {
      const invoke = mockInvoke({});
      await gateway.experiments.get("exp1");
      expect(invoke).toHaveBeenCalledWith("experiments.get", { id: "exp1" });
    });

    it("create calls experiments.create", async () => {
      const invoke = mockInvoke({});
      const input = { name: "Test", variants: [] } as never;
      await gateway.experiments.create(input);
      expect(invoke).toHaveBeenCalledWith("experiments.create", input);
    });

    it("update calls experiments.update", async () => {
      const invoke = mockInvoke({});
      await gateway.experiments.update("exp1", { name: "Updated" });
      expect(invoke).toHaveBeenCalledWith("experiments.update", { id: "exp1", name: "Updated" });
    });

    it("start calls experiments.start", async () => {
      const invoke = mockInvoke({});
      await gateway.experiments.start("exp1");
      expect(invoke).toHaveBeenCalledWith("experiments.start", { id: "exp1" });
    });

    it("pause calls experiments.pause", async () => {
      const invoke = mockInvoke({});
      await gateway.experiments.pause("exp1");
      expect(invoke).toHaveBeenCalledWith("experiments.pause", { id: "exp1" });
    });

    it("resume calls experiments.resume", async () => {
      const invoke = mockInvoke({});
      await gateway.experiments.resume("exp1");
      expect(invoke).toHaveBeenCalledWith("experiments.resume", { id: "exp1" });
    });

    it("complete calls experiments.complete", async () => {
      const invoke = mockInvoke({});
      await gateway.experiments.complete("exp1");
      expect(invoke).toHaveBeenCalledWith("experiments.complete", { id: "exp1" });
    });

    it("assign calls experiments.assign", async () => {
      const invoke = mockInvoke({});
      await gateway.experiments.assign("exp1");
      expect(invoke).toHaveBeenCalledWith("experiments.assign", { experimentId: "exp1" });
    });

    it("track calls experiments.track", async () => {
      const invoke = mockInvoke({ success: true });
      const params = { experimentId: "exp1", variantId: "v1", eventType: "conversion" as never };
      await gateway.experiments.track(params);
      expect(invoke).toHaveBeenCalledWith("experiments.track", params);
    });

    it("results calls experiments.results", async () => {
      const invoke = mockInvoke({});
      await gateway.experiments.results("exp1");
      expect(invoke).toHaveBeenCalledWith("experiments.results", { experimentId: "exp1" });
    });
  });

  // ── exports ──

  describe("exports", () => {
    it("list calls exports.list", async () => {
      const invoke = mockInvoke({ exports: [] });
      await gateway.exports.list({ status: "completed" });
      expect(invoke).toHaveBeenCalledWith("exports.list", { status: "completed" });
    });

    it("create calls exports.create", async () => {
      const invoke = mockInvoke({ export: {} });
      const params = {
        reportType: "transactions",
        format: "csv",
        dateRangeStart: "2026-01-01",
        dateRangeEnd: "2026-01-31",
      };
      await gateway.exports.create(params);
      expect(invoke).toHaveBeenCalledWith("exports.create", params);
    });

    it("get calls exports.get", async () => {
      const invoke = mockInvoke({ export: {} });
      await gateway.exports.get("ex1");
      expect(invoke).toHaveBeenCalledWith("exports.get", { exportId: "ex1" });
    });

    it("download calls exports.download", async () => {
      const invoke = mockInvoke({
        fileUrl: "https://example.com/file",
        format: "csv",
        fileName: "report.csv",
      });
      await gateway.exports.download("ex1");
      expect(invoke).toHaveBeenCalledWith("exports.download", { exportId: "ex1" });
    });

    it("delete calls exports.delete", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.exports.delete("ex1");
      expect(invoke).toHaveBeenCalledWith("exports.delete", { exportId: "ex1" });
    });

    it("summary calls exports.summary", async () => {
      const invoke = mockInvoke({ summary: {} });
      await gateway.exports.summary();
      expect(invoke).toHaveBeenCalledWith("exports.summary", {});
    });
  });

  // ── reportTemplates ──

  describe("reportTemplates", () => {
    it("list calls reports.templates.list", async () => {
      const invoke = mockInvoke({ templates: [] });
      await gateway.reportTemplates.list();
      expect(invoke).toHaveBeenCalledWith("reports.templates.list", {});
    });

    it("create calls reports.templates.create", async () => {
      const invoke = mockInvoke({ template: {} });
      const params = { name: "Monthly", reportType: "transactions", defaultFormat: "csv" };
      await gateway.reportTemplates.create(params);
      expect(invoke).toHaveBeenCalledWith("reports.templates.create", params);
    });

    it("update calls reports.templates.update", async () => {
      const invoke = mockInvoke({ template: {} });
      const params = { templateId: "t1", name: "Updated" };
      await gateway.reportTemplates.update(params);
      expect(invoke).toHaveBeenCalledWith("reports.templates.update", params);
    });

    it("delete calls reports.templates.delete", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.reportTemplates.delete("t1");
      expect(invoke).toHaveBeenCalledWith("reports.templates.delete", { templateId: "t1" });
    });
  });

  // ── sdui ──

  describe("sdui", () => {
    it("resolve calls sdui.resolve", async () => {
      const invoke = mockInvoke({});
      await gateway.sdui.resolve("dashboard");
      expect(invoke).toHaveBeenCalledWith("sdui.resolve", { screenKey: "dashboard" });
    });

    it("persona calls sdui.persona", async () => {
      const invoke = mockInvoke({ personaId: "p1", personaLabel: "Default", traits: {} });
      await gateway.sdui.persona();
      expect(invoke).toHaveBeenCalledWith("sdui.persona", {});
    });

    describe("personas", () => {
      it("list calls sdui.personas.list", async () => {
        const invoke = mockInvoke([]);
        await gateway.sdui.personas.list();
        expect(invoke).toHaveBeenCalledWith("sdui.personas.list", {});
      });

      it("create calls sdui.personas.create", async () => {
        const invoke = mockInvoke({});
        const input = { label: "VIP", rules: [] } as never;
        await gateway.sdui.personas.create(input);
        expect(invoke).toHaveBeenCalledWith("sdui.personas.create", input);
      });

      it("update calls sdui.personas.update", async () => {
        const invoke = mockInvoke({});
        await gateway.sdui.personas.update("p1", { label: "Premium" });
        expect(invoke).toHaveBeenCalledWith("sdui.personas.update", { id: "p1", label: "Premium" });
      });

      it("delete calls sdui.personas.delete", async () => {
        const invoke = mockInvoke({ success: true });
        await gateway.sdui.personas.delete("p1");
        expect(invoke).toHaveBeenCalledWith("sdui.personas.delete", { id: "p1" });
      });
    });

    describe("manifests", () => {
      it("list calls sdui.manifests.list", async () => {
        const invoke = mockInvoke([]);
        await gateway.sdui.manifests.list({ screenKey: "home" });
        expect(invoke).toHaveBeenCalledWith("sdui.manifests.list", { screenKey: "home" });
      });

      it("get calls sdui.manifests.get", async () => {
        const invoke = mockInvoke({});
        await gateway.sdui.manifests.get("m1");
        expect(invoke).toHaveBeenCalledWith("sdui.manifests.get", { id: "m1" });
      });

      it("create calls sdui.manifests.create", async () => {
        const invoke = mockInvoke({});
        const input = { screenKey: "home", components: [] } as never;
        await gateway.sdui.manifests.create(input);
        expect(invoke).toHaveBeenCalledWith("sdui.manifests.create", input);
      });

      it("update calls sdui.manifests.update", async () => {
        const invoke = mockInvoke({});
        const updates = { components: [] } as never;
        await gateway.sdui.manifests.update("m1", updates);
        expect(invoke).toHaveBeenCalledWith("sdui.manifests.update", { id: "m1", ...updates });
      });

      it("delete calls sdui.manifests.delete", async () => {
        const invoke = mockInvoke({ success: true });
        await gateway.sdui.manifests.delete("m1");
        expect(invoke).toHaveBeenCalledWith("sdui.manifests.delete", { id: "m1" });
      });
    });
  });
});
