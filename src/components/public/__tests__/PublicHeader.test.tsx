import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

vi.mock("react-router-dom", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { href: to, ...rest }, children),
  useNavigate: () => vi.fn(),
}));

import { PublicHeader } from "../PublicHeader";

describe("PublicHeader", () => {
  it("renders header element", () => {
    const { container } = render(createElement(PublicHeader));
    expect(container.querySelector("header")).toBeTruthy();
  });

  it("renders tenant name", () => {
    render(createElement(PublicHeader, { tenantName: "Test CU" }));
    expect(screen.getByText("Test CU")).toBeTruthy();
  });

  it("renders default tenant name when none provided", () => {
    render(createElement(PublicHeader));
    expect(screen.getByText("Demo CU")).toBeTruthy();
  });

  it("renders Sign In and Join links", () => {
    render(createElement(PublicHeader));
    expect(screen.getAllByText("Sign In").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Join").length).toBeGreaterThan(0);
  });

  it("renders navigation dropdown labels", () => {
    render(createElement(PublicHeader));
    expect(screen.getByText("Products")).toBeTruthy();
    expect(screen.getByText("Resources")).toBeTruthy();
    expect(screen.getByText("Our Credit Union")).toBeTruthy();
  });

  it("renders Locations link", () => {
    const { container } = render(createElement(PublicHeader));
    const locLinks = Array.from(container.querySelectorAll("a")).filter(
      (a) => a.textContent === "Locations",
    );
    expect(locLinks.length).toBeGreaterThan(0);
  });
});
