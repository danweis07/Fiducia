import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: vi.fn(() => ({ handleError: vi.fn() })),
}));

vi.mock("@/hooks/useEKYC", () => ({
  useEKYCProviders: vi.fn(() => ({ data: { providers: [] }, isLoading: false })),
  useEKYCVerifications: vi.fn(() => ({
    data: { verifications: [] },
    isLoading: false,
    error: null,
  })),
  useInitiateEKYC: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useStartLiveness: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCompleteLiveness: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
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

describe("InternationalEKYC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: InternationalEKYC } = await import("../InternationalEKYC");
    render(createElement(InternationalEKYC), { wrapper: createWrapper() });
  });
});
