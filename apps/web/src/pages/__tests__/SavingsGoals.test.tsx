import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useSavingsGoals", () => ({
  useSavingsGoals: vi.fn(() => ({ data: { goals: [] }, isLoading: false })),
  useGoalSummary: vi.fn(() => ({ data: null })),
  useCreateSavingsGoal: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteSavingsGoal: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useContributeToGoal: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useWithdrawFromGoal: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: vi.fn(() => ({ data: { accounts: [] }, isLoading: false })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: vi.fn(() => ({ handleError: vi.fn() })),
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-testid": "app-shell" }, children),
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => createElement("div", null, "Loading..."),
}));

vi.mock("@/components/common/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => createElement("div", null, title),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("SavingsGoals", () => {
  it("renders without crashing", async () => {
    const { default: SavingsGoals } = await import("../SavingsGoals");
    const { container } = render(createElement(SavingsGoals), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("shows the page heading", async () => {
    const { default: SavingsGoals } = await import("../SavingsGoals");
    render(createElement(SavingsGoals), { wrapper: createWrapper() });
    expect(screen.getByText("Savings Goals")).toBeTruthy();
  });

  it("shows empty state when no goals", async () => {
    const { default: SavingsGoals } = await import("../SavingsGoals");
    render(createElement(SavingsGoals), { wrapper: createWrapper() });
    expect(screen.getByText("No savings goals")).toBeTruthy();
  });
});
