import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useCashFlow", () => ({
  useCashFlowForecast: vi.fn(() => ({
    data: {
      forecast: {
        currentBalanceCents: 0,
        projectedBalanceCents: 0,
        avgDailyInflowCents: 0,
        avgDailyOutflowCents: 0,
        runwayDays: 999,
        projectedDate: "2026-04-01",
        dataPoints: [],
        insights: [],
        upcomingPayrollCents: 0,
        upcomingBillsCents: 0,
      },
    },
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useTreasury", () => ({
  useTreasuryVaults: vi.fn(() => ({ data: { vaults: [] } })),
  useCreateTreasuryVault: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCloseTreasuryVault: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useTreasurySummary: vi.fn(() => ({
    data: { summary: { weightedAvgApyBps: 0, totalVaultBalanceCents: 0 } },
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

describe("LiquidityDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: LiquidityDashboardPage } = await import("../LiquidityDashboard");
    render(createElement(LiquidityDashboardPage), { wrapper: createWrapper() });
  });
});
