import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useRegulatory", () => ({
  useSafeguarding: vi.fn(() => ({ data: { safeguarding: [] }, isLoading: false })),
  useInterestWithholding: vi.fn(() => ({
    data: {
      entries: [],
      totalGrossInterestCents: 0,
      totalTaxWithheldCents: 0,
      totalNetInterestCents: 0,
    },
    isLoading: false,
  })),
  useCarbonSummary: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrencyIntl: vi.fn(
    (cents: number, currency: string) => `${currency} ${(cents / 100).toFixed(2)}`,
  ),
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
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

describe("RegulatoryDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: RegulatoryDashboard } = await import("../RegulatoryDashboard");
    render(createElement(RegulatoryDashboard), { wrapper: createWrapper() });
  });
});
