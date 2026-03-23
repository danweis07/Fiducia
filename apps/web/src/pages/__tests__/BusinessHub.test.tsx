import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useApprovals", () => ({
  useApprovalSummary: vi.fn(() => ({
    data: { summary: { pendingCount: 0, avgResponseMinutes: 0 } },
  })),
}));

vi.mock("@/hooks/useCashSweeps", () => ({
  useSweepSummary: vi.fn(() => ({
    data: { summary: { activeRules: 0, totalSweptCents: 0, estimatedYieldCents: 0 } },
  })),
}));

vi.mock("@/hooks/useInvoiceProcessor", () => ({
  useInvoices: vi.fn(() => ({ data: { invoices: [] } })),
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("BusinessHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: BusinessHub } = await import("../BusinessHub");
    render(createElement(BusinessHub), { wrapper: createWrapper() });
  });
});
