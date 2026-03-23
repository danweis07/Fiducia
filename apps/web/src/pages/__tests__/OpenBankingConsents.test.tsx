import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useOpenBanking", () => ({
  useOpenBankingConsents: vi.fn(() => ({ data: { consents: [] }, isLoading: false, error: null })),
  useOpenBankingConsentSummary: vi.fn(() => ({
    data: {
      summary: { activeConsents: 0, totalConsents: 0, revokedConsents: 0, recentAccessCount: 0 },
    },
  })),
  useOpenBankingAccessLogs: vi.fn(() => ({ data: { accessLogs: [] }, isLoading: false })),
  useRevokeConsent: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: vi.fn(() => vi.fn()),
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

describe("OpenBankingConsents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: OpenBankingConsents } = await import("../OpenBankingConsents");
    render(createElement(OpenBankingConsents), { wrapper: createWrapper() });
  });
});
