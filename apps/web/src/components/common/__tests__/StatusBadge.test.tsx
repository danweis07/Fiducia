import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "../StatusBadge";

describe("StatusBadge", () => {
  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  it("renders status text", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("active")).toBeTruthy();
  });

  it("normalizes status to lowercase", () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText("active")).toBeTruthy();
  });

  it("normalizes mixed case", () => {
    render(<StatusBadge status="Pending" />);
    expect(screen.getByText("pending")).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Various statuses
  // ---------------------------------------------------------------------------

  it("renders active status", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("active")).toBeTruthy();
  });

  it("renders pending status", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("pending")).toBeTruthy();
  });

  it("renders completed status", () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText("completed")).toBeTruthy();
  });

  it("renders failed status", () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText("failed")).toBeTruthy();
  });

  it("renders locked status", () => {
    render(<StatusBadge status="locked" />);
    expect(screen.getByText("locked")).toBeTruthy();
  });

  it("renders cancelled status", () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText("cancelled")).toBeTruthy();
  });

  it("renders posted status", () => {
    render(<StatusBadge status="posted" />);
    expect(screen.getByText("posted")).toBeTruthy();
  });

  it("renders scheduled status", () => {
    render(<StatusBadge status="scheduled" />);
    expect(screen.getByText("scheduled")).toBeTruthy();
  });

  it("renders processing status", () => {
    render(<StatusBadge status="processing" />);
    expect(screen.getByText("processing")).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Structure
  // ---------------------------------------------------------------------------

  it("renders as a badge element", () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstElementChild;
    expect(badge).toBeTruthy();
  });

  it("has capitalize class for proper display", () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain("capitalize");
  });

  // ---------------------------------------------------------------------------
  // Custom className
  // ---------------------------------------------------------------------------

  it("applies custom className", () => {
    const { container } = render(<StatusBadge status="active" className="my-custom" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain("my-custom");
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it("handles empty string status", () => {
    const { container } = render(<StatusBadge status="" />);
    expect(container.firstElementChild).toBeTruthy();
  });

  it("handles long status text", () => {
    render(<StatusBadge status="pending_review_by_compliance" />);
    expect(screen.getByText("pending_review_by_compliance")).toBeTruthy();
  });

  it("renders unknown status without crashing", () => {
    render(<StatusBadge status="unknown_status_value" />);
    expect(screen.getByText("unknown_status_value")).toBeTruthy();
  });
});
