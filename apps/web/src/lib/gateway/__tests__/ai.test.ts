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

describe("AiDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── ai ──────────────────────────────────────────────────────────────────────

  describe("ai", () => {
    it("sendMessage calls ai.chat.send", async () => {
      const invoke = mockInvoke({
        reply: "Hello",
        conversationId: "conv1",
        provider: "openai",
        model: "gpt-4",
        needsEscalation: false,
      });
      const params = { message: "Hi", conversationId: "conv1" };
      await gateway.ai.sendMessage(params);
      expect(invoke).toHaveBeenCalledWith("ai.chat.send", params);
    });

    it("getSuggestions calls ai.chat.suggestions", async () => {
      const invoke = mockInvoke({ suggestions: [] });
      await gateway.ai.getSuggestions();
      expect(invoke).toHaveBeenCalledWith("ai.chat.suggestions", {});
    });

    it("submitFeedback calls ai.chat.feedback", async () => {
      const invoke = mockInvoke({ success: true });
      const params = { conversationId: "conv1", rating: "positive" as const };
      await gateway.ai.submitFeedback(params);
      expect(invoke).toHaveBeenCalledWith("ai.chat.feedback", params);
    });

    it("escalate calls ai.chat.escalate", async () => {
      const invoke = mockInvoke({ escalated: true, ticketId: "t1", message: "Escalated" });
      const params = { conversationId: "conv1", reason: "complex issue" };
      await gateway.ai.escalate(params);
      expect(invoke).toHaveBeenCalledWith("ai.chat.escalate", params);
    });

    it("chat calls ai.assistant.chat", async () => {
      const invoke = mockInvoke({
        reply: "Hi",
        provider: "openai",
        model: "gpt-4",
        needsEscalation: false,
        sessionId: "s1",
      });
      const params = { message: "Hello", sessionId: "s1" };
      await gateway.ai.chat(params);
      expect(invoke).toHaveBeenCalledWith("ai.assistant.chat", params);
    });

    it("listPrompts calls ai.prompts.list", async () => {
      const invoke = mockInvoke({ prompts: [] });
      await gateway.ai.listPrompts();
      expect(invoke).toHaveBeenCalledWith("ai.prompts.list", {});
    });

    it("updatePrompt calls ai.prompts.update", async () => {
      const invoke = mockInvoke({ prompt: {} });
      const params = { promptId: "p1", content: "New content" };
      await gateway.ai.updatePrompt(params);
      expect(invoke).toHaveBeenCalledWith("ai.prompts.update", params);
    });

    it("getHistory calls ai.history", async () => {
      const invoke = mockInvoke({ sessionId: "s1", messages: [] });
      await gateway.ai.getHistory("s1");
      expect(invoke).toHaveBeenCalledWith("ai.history", { sessionId: "s1" });
    });
  });

  // ── aiPlatform ──────────────────────────────────────────────────────────────

  describe("aiPlatform", () => {
    it("chat calls ai.platform.chat", async () => {
      const invoke = mockInvoke({ reply: "Response", conversationId: "conv1" });
      const params = { message: "Hello", stakeholder: "member" as const };
      await gateway.aiPlatform.chat(params);
      expect(invoke).toHaveBeenCalledWith("ai.platform.chat", params);
    });

    // ── kb ──

    describe("kb", () => {
      it("upload calls ai.kb.upload", async () => {
        const invoke = mockInvoke({
          document: { id: "d1", title: "FAQ", status: "processing", chunkCount: 0 },
        });
        const params = { title: "FAQ", content: "Q&A content", category: "support" };
        await gateway.aiPlatform.kb.upload(params);
        expect(invoke).toHaveBeenCalledWith("ai.kb.upload", params);
      });

      it("list calls ai.kb.list", async () => {
        const invoke = mockInvoke({ documents: [] });
        await gateway.aiPlatform.kb.list({ category: "support" });
        expect(invoke).toHaveBeenCalledWith("ai.kb.list", { category: "support" });
      });

      it("remove calls ai.kb.delete", async () => {
        const invoke = mockInvoke({ success: true });
        await gateway.aiPlatform.kb.remove("d1");
        expect(invoke).toHaveBeenCalledWith("ai.kb.delete", { documentId: "d1" });
      });

      it("search calls ai.kb.search", async () => {
        const invoke = mockInvoke({ results: [] });
        await gateway.aiPlatform.kb.search("how to reset password", { maxResults: 5 });
        expect(invoke).toHaveBeenCalledWith("ai.kb.search", {
          query: "how to reset password",
          maxResults: 5,
        });
      });

      it("gaps calls ai.kb.gaps", async () => {
        const invoke = mockInvoke({ gaps: [] });
        await gateway.aiPlatform.kb.gaps({ limit: 10 });
        expect(invoke).toHaveBeenCalledWith("ai.kb.gaps", { limit: 10 });
      });
    });

    // ── automation ──

    describe("automation", () => {
      it("list calls ai.automation.list", async () => {
        const invoke = mockInvoke({ rules: [] });
        await gateway.aiPlatform.automation.list({ status: "active" });
        expect(invoke).toHaveBeenCalledWith("ai.automation.list", { status: "active" });
      });

      it("create calls ai.automation.create", async () => {
        const invoke = mockInvoke({ rule: {} });
        const params = { description: "Auto-respond to common queries" };
        await gateway.aiPlatform.automation.create(params);
        expect(invoke).toHaveBeenCalledWith("ai.automation.create", params);
      });

      it("update calls ai.automation.update", async () => {
        const invoke = mockInvoke({ rule: { id: "r1", status: "paused" } });
        await gateway.aiPlatform.automation.update("r1", { status: "paused" });
        expect(invoke).toHaveBeenCalledWith("ai.automation.update", {
          ruleId: "r1",
          status: "paused",
        });
      });

      it("remove calls ai.automation.delete", async () => {
        const invoke = mockInvoke({ success: true });
        await gateway.aiPlatform.automation.remove("r1");
        expect(invoke).toHaveBeenCalledWith("ai.automation.delete", { ruleId: "r1" });
      });

      it("history calls ai.automation.history", async () => {
        const invoke = mockInvoke({ executions: [] });
        await gateway.aiPlatform.automation.history("r1", { limit: 20 });
        expect(invoke).toHaveBeenCalledWith("ai.automation.history", { ruleId: "r1", limit: 20 });
      });
    });

    // ── insights ──

    describe("insights", () => {
      it("list calls ai.insights.list", async () => {
        const invoke = mockInvoke({ insights: [] });
        await gateway.aiPlatform.insights.list({ status: "new", type: "spending" });
        expect(invoke).toHaveBeenCalledWith("ai.insights.list", {
          status: "new",
          type: "spending",
        });
      });

      it("act calls ai.insights.act", async () => {
        const invoke = mockInvoke({ success: true });
        await gateway.aiPlatform.insights.act("ins1");
        expect(invoke).toHaveBeenCalledWith("ai.insights.act", { insightId: "ins1" });
      });

      it("dismiss calls ai.insights.dismiss", async () => {
        const invoke = mockInvoke({ success: true });
        await gateway.aiPlatform.insights.dismiss("ins1");
        expect(invoke).toHaveBeenCalledWith("ai.insights.dismiss", { insightId: "ins1" });
      });

      it("generate calls ai.insights.generate", async () => {
        const invoke = mockInvoke({ insights: [] });
        await gateway.aiPlatform.insights.generate();
        expect(invoke).toHaveBeenCalledWith("ai.insights.generate", {});
      });
    });

    // ── escalations ──

    describe("escalations", () => {
      it("queue calls ai.escalations.queue", async () => {
        const invoke = mockInvoke({ escalations: [] });
        await gateway.aiPlatform.escalations.queue({ status: "open", priority: "high" });
        expect(invoke).toHaveBeenCalledWith("ai.escalations.queue", {
          status: "open",
          priority: "high",
        });
      });

      it("get calls ai.escalations.get", async () => {
        const invoke = mockInvoke({ escalation: {} });
        await gateway.aiPlatform.escalations.get("esc1");
        expect(invoke).toHaveBeenCalledWith("ai.escalations.get", { escalationId: "esc1" });
      });

      it("assign calls ai.escalations.assign", async () => {
        const invoke = mockInvoke({ success: true });
        await gateway.aiPlatform.escalations.assign("esc1", "agent1");
        expect(invoke).toHaveBeenCalledWith("ai.escalations.assign", {
          escalationId: "esc1",
          assignedTo: "agent1",
        });
      });

      it("resolve calls ai.escalations.resolve", async () => {
        const invoke = mockInvoke({ success: true });
        await gateway.aiPlatform.escalations.resolve("esc1", "Issue resolved via phone");
        expect(invoke).toHaveBeenCalledWith("ai.escalations.resolve", {
          escalationId: "esc1",
          resolutionNotes: "Issue resolved via phone",
        });
      });
    });

    // ── prompts ──

    describe("prompts", () => {
      it("list calls ai.platform.prompts.list", async () => {
        const invoke = mockInvoke({ prompts: [] });
        await gateway.aiPlatform.prompts.list();
        expect(invoke).toHaveBeenCalledWith("ai.platform.prompts.list", {});
      });

      it("update calls ai.platform.prompts.update", async () => {
        const invoke = mockInvoke({ prompt: { id: "p1", version: 2 } });
        await gateway.aiPlatform.prompts.update("p1", {
          content: "Updated prompt",
          temperature: 0.7,
        });
        expect(invoke).toHaveBeenCalledWith("ai.platform.prompts.update", {
          promptId: "p1",
          content: "Updated prompt",
          temperature: 0.7,
        });
      });

      it("test calls ai.platform.prompts.test", async () => {
        const invoke = mockInvoke({ reply: "Test response", tokensUsed: 150 });
        const params = { stakeholder: "member", message: "Test message" };
        await gateway.aiPlatform.prompts.test(params);
        expect(invoke).toHaveBeenCalledWith("ai.platform.prompts.test", params);
      });
    });
  });
});
