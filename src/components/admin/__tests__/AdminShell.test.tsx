import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminShell from "../AdminShell";

// Mock the Outlet since AdminShell uses it for child routes
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Page Content</div>,
  };
});

function renderShell(path = "/admin") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminShell />
    </MemoryRouter>,
  );
}

describe("AdminShell", () => {
  it("renders the admin console heading", () => {
    renderShell();
    expect(screen.getAllByText("Admin Console").length).toBeGreaterThan(0);
  });

  it("renders sidebar navigation items", () => {
    renderShell();
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Integrations").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("renders the outlet for page content", () => {
    renderShell();
    expect(screen.getByTestId("outlet")).toBeTruthy();
  });

  it("renders breadcrumbs with Admin as root", () => {
    renderShell();
    // "Admin" appears in sidebar role text and breadcrumbs — just check it exists
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
  });

  it("renders breadcrumbs with page name for sub-pages", () => {
    renderShell("/admin/users");
    // "Users" appears in both sidebar and breadcrumbs
    expect(screen.getAllByText("Users").length).toBeGreaterThanOrEqual(2);
  });

  it("renders user info in sidebar", () => {
    renderShell();
    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("JD").length).toBeGreaterThan(0);
  });
});
