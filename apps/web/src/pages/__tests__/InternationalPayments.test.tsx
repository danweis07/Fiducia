import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useInternationalPayments", () => ({
  useInternationalPayments: vi.fn(() => ({ data: [], isLoading: false })),
  useInternationalCoverage: vi.fn(() => ({ data: { countries: [] }, isLoading: false })),
  useGlobalCards: vi.fn(() => ({ data: [], isLoading: false })),
  useInternationalPayouts: vi.fn(() => ({ data: [] })),
  useInternationalBillPayments: vi.fn(() => ({ data: [] })),
  useInternationalBillPayCountries: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
}));

vi.mock("@/lib/common/design-tokens", () => ({
  getStatusStyle: vi.fn(() => ""),
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

describe("InternationalPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: InternationalPayments } = await import("../InternationalPayments");
    render(createElement(InternationalPayments), { wrapper: createWrapper() });
  });
});
