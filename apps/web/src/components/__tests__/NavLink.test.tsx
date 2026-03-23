import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  NavLink: ({
    children,
    className,
    to,
    ...props
  }: {
    children: React.ReactNode;
    className?: string | ((props: { isActive: boolean; isPending: boolean }) => string);
    to: string;
    [key: string]: unknown;
  }) => {
    const cls =
      typeof className === "function"
        ? className({ isActive: false, isPending: false })
        : className;
    return (
      <a href={to} className={cls} {...props}>
        {children}
      </a>
    );
  },
}));

import { NavLink } from "../NavLink";

describe("NavLink", () => {
  it("renders with children", () => {
    const { getByText } = render(<NavLink to="/home">Home</NavLink>);
    expect(getByText("Home")).toBeTruthy();
  });

  it("applies className", () => {
    const { container } = render(
      <NavLink to="/test" className="custom">
        Link
      </NavLink>,
    );
    expect(container.querySelector("a")?.className).toContain("custom");
  });
});
