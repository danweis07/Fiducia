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

import { PublicFooter } from "../PublicFooter";

describe("PublicFooter", () => {
  it("renders footer element", () => {
    const { container } = render(createElement(PublicFooter));
    expect(container.querySelector("footer")).toBeTruthy();
  });

  it("renders tenant name in copyright", () => {
    render(createElement(PublicFooter, { tenantName: "Test Credit Union" }));
    expect(screen.getByText(/Test Credit Union/)).toBeTruthy();
  });

  it("renders default tenant name when none provided", () => {
    render(createElement(PublicFooter));
    expect(screen.getAllByText(/Demo Credit Union/).length).toBeGreaterThan(0);
  });

  it("renders section headings", () => {
    render(createElement(PublicFooter));
    expect(screen.getByText("Personal Banking")).toBeTruthy();
    expect(screen.getByText("Resources")).toBeTruthy();
    expect(screen.getByText("Support")).toBeTruthy();
    expect(screen.getByText("Legal")).toBeTruthy();
  });

  it("renders NCUA badge", () => {
    render(createElement(PublicFooter));
    expect(screen.getByText("NCUA")).toBeTruthy();
  });

  it("renders member services phone number", () => {
    render(createElement(PublicFooter));
    expect(screen.getByText("(800) 555-0199")).toBeTruthy();
  });
});
