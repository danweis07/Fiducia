import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    adminAudit: {
      log: vi.fn().mockResolvedValue({ entries: [] }),
    },
    request: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/hooks/useAdminAuditLog", () => ({
  useAdminAuditLog: vi.fn(() => ({
    data: { entries: [] },
    isLoading: false,
  })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => createElement("div", null, "Loading..."),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

import AuditLog from "../AuditLog";

describe("AuditLog", () => {
  it("renders without crashing", () => {
    render(createElement(AuditLog), { wrapper: createWrapper() });
    expect(screen.getByText("Audit Log")).toBeTruthy();
  });

  it("shows the description text", () => {
    render(createElement(AuditLog), { wrapper: createWrapper() });
    expect(screen.getByText("Track all administrative actions.")).toBeTruthy();
  });

  it("renders the activity log card", () => {
    render(createElement(AuditLog), { wrapper: createWrapper() });
    expect(screen.getByText("Activity Log")).toBeTruthy();
  });

  it("renders table headers", () => {
    render(createElement(AuditLog), { wrapper: createWrapper() });
    expect(screen.getByText("Timestamp")).toBeTruthy();
    expect(screen.getByText("User")).toBeTruthy();
    expect(screen.getByText("Action")).toBeTruthy();
    expect(screen.getByText("Entity")).toBeTruthy();
    expect(screen.getByText("IP Address")).toBeTruthy();
    expect(screen.getByText("Details")).toBeTruthy();
  });

  it("shows empty state when no entries", () => {
    render(createElement(AuditLog), { wrapper: createWrapper() });
    expect(screen.getByText("No log entries found.")).toBeTruthy();
  });

  it("renders the export button", () => {
    render(createElement(AuditLog), { wrapper: createWrapper() });
    expect(screen.getByText("Export")).toBeTruthy();
  });
});
