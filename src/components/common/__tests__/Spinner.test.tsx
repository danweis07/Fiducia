import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner, PageSpinner } from "../Spinner";

describe("Spinner", () => {
  it("renders with default md size", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(container.querySelector(".h-6")).toBeTruthy();
  });

  it("renders with sm size", () => {
    const { container } = render(<Spinner size="sm" />);
    expect(container.querySelector(".h-4")).toBeTruthy();
  });

  it("renders with lg size", () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector(".h-8")).toBeTruthy();
  });
});

describe("PageSpinner", () => {
  it("renders with loading role and screen reader text", () => {
    render(<PageSpinner />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Loading...")).toBeTruthy();
  });
});
