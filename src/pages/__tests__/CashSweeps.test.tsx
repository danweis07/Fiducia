import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useCashSweeps", () => ({
  useSweepRules: vi.fn(() => ({ data: { rules: [] }, isLoading: false })),
  useCreateSweepRule: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useToggleSweepRule: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteSweepRule: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSweepExecutions: vi.fn(() => ({ data: { executions: [] }, isLoading: false })),
  useSweepSummary: vi.fn(() => ({
    data: {
      summary: { activeRules: 0, totalSweptCents: 0, totalSweepCount: 0, estimatedYieldCents: 0 },
    },
  })),
}));

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: vi.fn(() => ({ data: { accounts: [] }, isLoading: false })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("CashSweeps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: CashSweepsPage } = await import("../CashSweeps");
    render(createElement(CashSweepsPage), { wrapper: createWrapper() });
  });
});
