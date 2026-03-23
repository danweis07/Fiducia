import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useInternationalConsents", () => ({
  useInternationalConsents: vi.fn(() => ({
    data: { consents: [] },
    isLoading: false,
    error: null,
  })),
  useInternationalConsentSummary: vi.fn(() => ({
    data: {
      summary: {
        activeConsents: 0,
        totalConsents: 0,
        revokedConsents: 0,
        expiredConsents: 0,
        pendingReauthConsents: 0,
      },
    },
  })),
  useInternationalConsentAccessLogs: vi.fn(() => ({ data: { accessLogs: [] }, isLoading: false })),
  useRevokeInternationalConsent: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRevokeInternationalConsentScope: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
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

describe("ConsentDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: ConsentDashboard } = await import("../ConsentDashboard");
    render(createElement(ConsentDashboard), { wrapper: createWrapper() });
  });
});
