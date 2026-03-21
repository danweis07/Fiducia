import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockAuth = {
  isLoading: false,
  isAuthenticated: true,
  isOwnerOrAdmin: vi.fn(() => true),
};

vi.mock("@/contexts/TenantContext", () => ({
  useAuth: vi.fn(() => mockAuth),
}));

vi.mock("@/lib/demo", () => ({
  isDemoMode: vi.fn(() => false),
}));

import { AdminProtectedRoute } from "../AdminProtectedRoute";
import { isDemoMode } from "@/lib/demo";

function renderRoute() {
  return render(
    <MemoryRouter>
      <AdminProtectedRoute>
        <div>Admin Content</div>
      </AdminProtectedRoute>
    </MemoryRouter>,
  );
}

describe("AdminProtectedRoute", () => {
  it("renders children for admin users", () => {
    renderRoute();
    expect(screen.getByText("Admin Content")).toBeTruthy();
  });

  it("shows loading spinner when auth is loading", () => {
    mockAuth.isLoading = true;
    mockAuth.isAuthenticated = false;
    const { container } = renderRoute();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    mockAuth.isLoading = false;
    mockAuth.isAuthenticated = true;
  });

  it("redirects to home when not authenticated", () => {
    mockAuth.isAuthenticated = false;
    mockAuth.isOwnerOrAdmin.mockReturnValue(false);
    renderRoute();
    expect(screen.queryByText("Admin Content")).toBeNull();
    mockAuth.isAuthenticated = true;
    mockAuth.isOwnerOrAdmin.mockReturnValue(true);
  });

  it("redirects to dashboard for non-admin users", () => {
    mockAuth.isOwnerOrAdmin.mockReturnValue(false);
    renderRoute();
    expect(screen.queryByText("Admin Content")).toBeNull();
    mockAuth.isOwnerOrAdmin.mockReturnValue(true);
  });

  it("bypasses auth checks in demo mode", () => {
    (isDemoMode as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockAuth.isAuthenticated = false;
    mockAuth.isOwnerOrAdmin.mockReturnValue(false);
    renderRoute();
    expect(screen.getByText("Admin Content")).toBeTruthy();
    // Reset
    (isDemoMode as ReturnType<typeof vi.fn>).mockReturnValue(false);
    mockAuth.isAuthenticated = true;
    mockAuth.isOwnerOrAdmin.mockReturnValue(true);
  });
});
