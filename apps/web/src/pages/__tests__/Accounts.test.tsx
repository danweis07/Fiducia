import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: vi.fn(() => ({ data: { accounts: [] }, isLoading: false, error: null })),
}));

vi.mock("@/hooks/useLoans", () => ({
  useLoans: vi.fn(() => ({ data: { loans: [] }, isLoading: false })),
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
  formatInterestRate: vi.fn(() => "0.00%"),
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => createElement("div", null, "Loading..."),
}));

vi.mock("@/components/common/EmptyState", () => ({
  EmptyState: () => createElement("div", null, "Empty"),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("Accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: Accounts } = await import("../Accounts");
    render(createElement(Accounts), { wrapper: createWrapper() });
  });
});
