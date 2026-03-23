import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BalanceDisplay } from "../BalanceDisplay";

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
  formatCurrencyCompact: vi.fn((cents: number) => {
    const dollars = cents / 100;
    if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K`;
    return `$${dollars.toFixed(2)}`;
  }),
}));

describe("BalanceDisplay", () => {
  it("renders formatted balance", () => {
    render(<BalanceDisplay cents={150000} />);
    expect(screen.getByText("$1500.00")).toBeTruthy();
  });

  it("renders compact format when compact=true", () => {
    render(<BalanceDisplay cents={1250000} compact />);
    expect(screen.getByText("$12.5K")).toBeTruthy();
  });

  it("renders label when provided", () => {
    render(<BalanceDisplay cents={100000} label="Total Balance" />);
    expect(screen.getByText("Total Balance")).toBeTruthy();
    expect(screen.getByText("$1000.00")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(<BalanceDisplay cents={5000} className="mt-4" />);
    expect(container.firstElementChild?.classList.contains("mt-4")).toBe(true);
  });

  it("handles zero balance", () => {
    render(<BalanceDisplay cents={0} />);
    expect(screen.getByText("$0.00")).toBeTruthy();
  });

  it("handles negative balance", () => {
    render(<BalanceDisplay cents={-5000} />);
    expect(screen.getByText("$-50.00")).toBeTruthy();
  });
});
