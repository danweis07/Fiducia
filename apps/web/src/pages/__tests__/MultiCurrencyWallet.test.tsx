import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useMultiCurrency", () => ({
  useCurrencyPots: vi.fn(() => ({ data: { pots: [] }, isLoading: false })),
  useCreateCurrencyPot: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useGenerateVIBAN: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSwapQuote: vi.fn(() => ({ data: null })),
  useExecuteSwap: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSwapHistory: vi.fn(() => ({ data: { swaps: [] }, isLoading: false })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
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

describe("MultiCurrencyWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: MultiCurrencyWallet } = await import("../MultiCurrencyWallet");
    render(createElement(MultiCurrencyWallet), { wrapper: createWrapper() });
  });
});
