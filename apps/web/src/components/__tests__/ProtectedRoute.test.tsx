import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseAuth = vi.fn();
vi.mock("@/contexts/TenantContext", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

const mockIsDemoMode = vi.fn();
vi.mock("@/lib/demo", () => ({
  isDemoMode: () => mockIsDemoMode(),
}));

vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock("@/components/common/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { ProtectedRoute } from "../ProtectedRoute";

describe("ProtectedRoute", () => {
  it("renders children in demo mode", () => {
    mockIsDemoMode.mockReturnValue(true);
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText("Protected Content")).toBeTruthy();
  });

  it("shows spinner when loading", () => {
    mockIsDemoMode.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false });
    render(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByTestId("spinner")).toBeTruthy();
  });

  it("redirects when not authenticated", () => {
    mockIsDemoMode.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
    render(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByTestId("navigate")).toBeTruthy();
  });

  it("renders children when authenticated", () => {
    mockIsDemoMode.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });
    render(
      <ProtectedRoute>
        <div>Authenticated Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText("Authenticated Content")).toBeTruthy();
  });
});
