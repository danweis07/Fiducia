import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(() => ({ pathname: "/nonexistent" })),
}));

import NotFound from "../NotFound";

describe("NotFound", () => {
  it("renders 404 page", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByText("Oops! Page not found")).toBeTruthy();
  });

  it("has link back to home", () => {
    render(<NotFound />);
    const link = screen.getByText("Return to Home");
    expect(link.getAttribute("href")).toBe("/");
  });
});
