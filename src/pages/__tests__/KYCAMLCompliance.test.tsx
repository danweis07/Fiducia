import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useAMLScreening", () => ({
  useAMLScreen: vi.fn(() => ({ mutateAsync: vi.fn(), data: null, isPending: false })),
  useAMLMonitoring: vi.fn(() => ({ data: { subscriptions: [] }, isLoading: false })),
  useAMLAlerts: vi.fn(() => ({ data: { alerts: [] }, isLoading: false })),
  useReviewAMLAlert: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateAMLMonitoring: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => createElement("div", null, "Loading..."),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("KYCAMLCompliance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: KYCAMLCompliance } = await import("../KYCAMLCompliance");
    render(createElement(KYCAMLCompliance), { wrapper: createWrapper() });
  });
});
