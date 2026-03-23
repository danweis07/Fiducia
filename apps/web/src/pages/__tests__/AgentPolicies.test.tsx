import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/lib/gateway", () => ({
  gateway: {
    adminAutonomous: {
      stats: vi.fn().mockResolvedValue({
        autonomousEnabled: false,
        pausedAt: null,
        last24h: { total: 0, byStatus: {} },
        last7dTotal: 0,
        pendingEvents: 0,
        pendingApprovals: 0,
        activeRules: 0,
        activeServiceAccounts: 0,
      }),
      serviceAccounts: { list: vi.fn().mockResolvedValue({ serviceAccounts: [] }) },
      policies: { list: vi.fn().mockResolvedValue({ policies: [] }) },
      executions: { list: vi.fn().mockResolvedValue({ executions: [] }) },
      toggle: vi.fn(),
      trigger: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("AgentPolicies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: Component } = await import("../admin/AgentPolicies");
    const { container } = render(createElement(Component), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });
});
