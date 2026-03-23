import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/contexts/TenantContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "u-1" },
    isAuthenticated: true,
    isLoading: false,
    tenant: { tenantId: "t-1" },
  })),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  useParams: vi.fn(() => ({})),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockMutate = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: vi.fn(() => ({
    data: {
      notifications: [
        {
          id: "n-1",
          title: "Test Notification",
          body: "Something happened",
          type: "transaction",
          isRead: false,
          createdAt: "2026-01-15T10:00:00Z",
        },
      ],
    },
    isLoading: false,
    error: null,
  })),
  useUnreadCount: vi.fn(() => ({ data: { count: 1 } })),
  useMarkRead: vi.fn(() => mockMutate),
  useMarkAllRead: vi.fn(() => mockMutate),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Notifications page", () => {
  it("renders without crashing", async () => {
    const { default: Notifications } = await import("../Notifications");
    const { container } = render(createElement(Notifications));
    expect(container).toBeTruthy();
  });

  it("displays the page heading", async () => {
    const { default: Notifications } = await import("../Notifications");
    render(createElement(Notifications));
    expect(screen.getByText("Notifications")).toBeTruthy();
  });

  it("shows unread count", async () => {
    const { default: Notifications } = await import("../Notifications");
    render(createElement(Notifications));
    expect(screen.getByText("1 unread notification")).toBeTruthy();
  });

  it("renders notification title", async () => {
    const { default: Notifications } = await import("../Notifications");
    render(createElement(Notifications));
    expect(screen.getByText("Test Notification")).toBeTruthy();
  });

  it("shows Mark All Read button when unread > 0", async () => {
    const { default: Notifications } = await import("../Notifications");
    render(createElement(Notifications));
    expect(screen.getByText("Mark All Read")).toBeTruthy();
  });
});
