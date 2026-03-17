import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useOpenFinance", () => ({
  useOpenFinanceConnections: vi.fn(() => ({ data: { connections: [] }, isLoading: false })),
  useCreateOpenFinanceConnection: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRefreshOpenFinanceConnection: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRemoveOpenFinanceConnection: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useOpenFinanceAccounts: vi.fn(() => ({ data: { accounts: [] } })),
  useOpenFinanceNetWorth: vi.fn(() => ({ data: { netWorth: null } })),
  useAlternativeCreditData: vi.fn(() => ({ data: { creditData: null } })),
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

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => createElement("div", null, "Loading..."),
}));

vi.mock("@/components/common/EmptyState", () => ({
  EmptyState: ({ children }: { children?: React.ReactNode }) =>
    createElement("div", null, children || "Empty"),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("OpenFinanceHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: OpenFinanceHub } = await import("../OpenFinanceHub");
    render(createElement(OpenFinanceHub), { wrapper: createWrapper() });
  });
});
