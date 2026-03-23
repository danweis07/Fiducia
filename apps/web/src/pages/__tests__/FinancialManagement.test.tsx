import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

// Mock gateway with financial namespace
vi.mock("@/lib/gateway", () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({}),
    financial: {
      spending: vi.fn().mockResolvedValue({
        totalSpendingCents: 150000,
        totalIncomeCents: 500000,
        netCashFlowCents: 350000,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        categories: [],
      }),
      trends: vi.fn().mockResolvedValue({ trends: [] }),
      listBudgets: vi
        .fn()
        .mockResolvedValue({ budgets: [], totalBudgetCents: 0, totalSpentCents: 0 }),
      recurring: vi
        .fn()
        .mockResolvedValue({ subscriptions: [], totalMonthlyCents: 0, totalAnnualCents: 0 }),
      netWorth: vi.fn().mockResolvedValue({
        date: "2026-03-14",
        totalAssetsCents: 1000000,
        totalLiabilitiesCents: 200000,
        netWorthCents: 800000,
        accounts: [],
      }),
    },
  },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("FinancialManagement page", () => {
  it("renders without crashing", async () => {
    const { default: FinancialManagement } = await import("../FinancialManagement");
    const { container } = render(createElement(FinancialManagement), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("displays the Financial Insights heading", async () => {
    const { default: FinancialManagement } = await import("../FinancialManagement");
    render(createElement(FinancialManagement), { wrapper: createWrapper() });
    expect(await screen.findByText("Financial Insights")).toBeTruthy();
  });

  it("shows spending summary cards", async () => {
    const { default: FinancialManagement } = await import("../FinancialManagement");
    render(createElement(FinancialManagement), { wrapper: createWrapper() });
    expect(await screen.findByText("Total Spending")).toBeTruthy();
    expect(screen.getByText("Total Income")).toBeTruthy();
    expect(screen.getByText("Net Cash Flow")).toBeTruthy();
  });
});
