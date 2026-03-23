import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/hooks/useAdminUsers", () => ({
  useAdminUsers: () => ({
    data: {
      users: [
        {
          id: "1",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          kycStatus: "approved",
          accountCount: 2,
          lastLogin: "2026-01-01T00:00:00Z",
          status: "active",
        },
      ],
    },
    isLoading: false,
  }),
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

import UserManagement from "../UserManagement";

describe("UserManagement", () => {
  it("renders without crashing", () => {
    render(createElement(UserManagement), { wrapper: createWrapper() });
    expect(screen.getByText("User Management")).toBeTruthy();
  });

  it("shows the description text", () => {
    render(createElement(UserManagement), { wrapper: createWrapper() });
    expect(screen.getByText("Manage customer accounts and verifications.")).toBeTruthy();
  });

  it("renders user data in the table", () => {
    render(createElement(UserManagement), { wrapper: createWrapper() });
    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.getByText("jane@example.com")).toBeTruthy();
  });
});
