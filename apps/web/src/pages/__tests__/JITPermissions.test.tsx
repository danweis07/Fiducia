import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useApprovals", () => ({
  useApprovalRequests: vi.fn(() => ({ data: { requests: [] }, isLoading: false })),
  useApproveRequest: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDenyRequest: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useApprovalPolicies: vi.fn(() => ({ data: { policies: [] } })),
  useCreateApprovalPolicy: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateApprovalPolicy: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteApprovalPolicy: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useApprovalSummary: vi.fn(() => ({
    data: { summary: { pendingCount: 0, approvedToday: 0, deniedToday: 0, avgResponseMinutes: 0 } },
  })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("JITPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: JITPermissionsPage } = await import("../JITPermissions");
    render(createElement(JITPermissionsPage), { wrapper: createWrapper() });
  });
});
