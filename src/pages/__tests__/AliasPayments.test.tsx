import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useAliasPayments", () => ({
  useAliasDirectories: vi.fn(() => ({ data: { directories: [] }, isLoading: false })),
  useResolveAlias: vi.fn(() => ({ mutate: vi.fn(), isPending: false, data: null })),
  usePayByAlias: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useInboundR2P: vi.fn(() => ({ data: { requests: [] }, isLoading: false })),
  useRespondToR2P: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useOutboundR2P: vi.fn(() => ({ data: { requests: [] }, isLoading: false })),
  useSendR2P: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrencyIntl: vi.fn(() => "$0.00"),
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

describe("AliasPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: AliasPayments } = await import("../AliasPayments");
    render(createElement(AliasPayments), { wrapper: createWrapper() });
  });
});
