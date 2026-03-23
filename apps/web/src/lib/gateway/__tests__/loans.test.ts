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

describe("LoansDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── loanProducts ────────────────────────────────────────────────────────────

  describe("loanProducts", () => {
    it("list calls loanProducts.list", async () => {
      const invoke = mockInvoke({ products: [] });
      await gateway.loanProducts.list({ loanType: "personal" });
      expect(invoke).toHaveBeenCalledWith("loanProducts.list", { loanType: "personal" });
    });
  });

  // ── loans ───────────────────────────────────────────────────────────────────

  describe("loans", () => {
    it("list calls loans.list", async () => {
      const invoke = mockInvoke({ loans: [] });
      await gateway.loans.list({ status: "active" });
      expect(invoke).toHaveBeenCalledWith("loans.list", { status: "active" });
    });

    it("get calls loans.get", async () => {
      const invoke = mockInvoke({ loan: {} });
      await gateway.loans.get("l1");
      expect(invoke).toHaveBeenCalledWith("loans.get", { id: "l1" });
    });

    it("schedule calls loans.schedule", async () => {
      const invoke = mockInvoke({ schedule: [] });
      await gateway.loans.schedule("l1", { limit: 12 });
      expect(invoke).toHaveBeenCalledWith("loans.schedule", { loanId: "l1", limit: 12 });
    });

    it("payments calls loans.payments", async () => {
      const invoke = mockInvoke({ payments: [] });
      await gateway.loans.payments("l1", { limit: 10 });
      expect(invoke).toHaveBeenCalledWith("loans.payments", { loanId: "l1", limit: 10 });
    });

    it("makePayment calls loans.makePayment", async () => {
      const invoke = mockInvoke({ payment: {} });
      const input = { loanId: "l1", amountCents: 50000, fromAccountId: "a1" };
      await gateway.loans.makePayment(input);
      expect(invoke).toHaveBeenCalledWith("loans.makePayment", input);
    });
  });

  // ── loanOrigination ────────────────────────────────────────────────────────

  describe("loanOrigination", () => {
    it("getApplication calls loanOrigination.application.get", async () => {
      const invoke = mockInvoke({ application: {} });
      const params = { applicationId: "app1", institutionId: "inst1" };
      await gateway.loanOrigination.getApplication(params);
      expect(invoke).toHaveBeenCalledWith("loanOrigination.application.get", params);
    });

    it("createApplication calls loanOrigination.application.create", async () => {
      const invoke = mockInvoke({ application: {} });
      const input = {
        institutionId: "inst1",
        requestedAmountCents: 100000,
        applicant: { firstName: "John", lastName: "Doe" },
      };
      await gateway.loanOrigination.createApplication(input);
      expect(invoke).toHaveBeenCalledWith("loanOrigination.application.create", input);
    });

    it("getDocument calls loanOrigination.document.get", async () => {
      const invoke = mockInvoke({ document: {} });
      const params = { documentId: "doc1", institutionId: "inst1" };
      await gateway.loanOrigination.getDocument(params);
      expect(invoke).toHaveBeenCalledWith("loanOrigination.document.get", params);
    });

    it("createDocument calls loanOrigination.document.create", async () => {
      const invoke = mockInvoke({ idDocument: "doc1" });
      const input = {
        institutionId: "inst1",
        documentTemplateType: 1,
        documentEntityType: "loan" as unknown,
        documentEntity: { id: "l1", context: "origination" as unknown },
      };
      await gateway.loanOrigination.createDocument(input);
      expect(invoke).toHaveBeenCalledWith("loanOrigination.document.create", input);
    });

    it("updateDocument calls loanOrigination.document.update", async () => {
      const invoke = mockInvoke({ idDocument: "doc1" });
      const input = { documentId: "doc1", institutionId: "inst1", statementDate: "2025-01-01" };
      await gateway.loanOrigination.updateDocument(input);
      expect(invoke).toHaveBeenCalledWith("loanOrigination.document.update", input);
    });
  });
});
