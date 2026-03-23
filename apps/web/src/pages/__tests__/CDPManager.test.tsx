import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useAdminCDP", () => ({
  useCDPConfig: vi.fn(() => ({ data: null, isLoading: false })),
  useUpdateCDPConfig: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCDPDestinations: vi.fn(() => ({ data: { destinations: [] }, isLoading: false })),
  useCreateCDPDestination: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateCDPDestination: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteCDPDestination: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCDPRecentEvents: vi.fn(() => ({ data: { events: [] }, isLoading: false })),
  useCDPEventSummary: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("CDPManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: Component } = await import("../admin/CDPManager");
    const { container } = render(createElement(Component), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });
});
