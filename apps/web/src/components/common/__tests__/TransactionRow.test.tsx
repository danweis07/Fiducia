import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionRow } from "../TransactionRow";

describe("TransactionRow", () => {
  it("renders description", () => {
    render(<TransactionRow description="Coffee Shop" amountCents={-450} />);
    expect(screen.getByText("Coffee Shop")).toBeTruthy();
  });

  it("displays formatted debit amount", () => {
    render(<TransactionRow description="Purchase" amountCents={-5000} />);
    expect(screen.getByText("$50.00")).toBeTruthy();
  });

  it("displays formatted credit amount with plus sign", () => {
    render(<TransactionRow description="Deposit" amountCents={10000} />);
    expect(screen.getByText("+$100.00")).toBeTruthy();
  });

  it("shows category", () => {
    render(<TransactionRow description="Groceries" amountCents={-2500} category="food" />);
    expect(screen.getByText("food")).toBeTruthy();
  });

  it("shows pending badge", () => {
    render(<TransactionRow description="A Purchase" amountCents={-100} status="pending" />);
    expect(screen.getByText("Pending")).toBeTruthy();
  });

  it("shows date when provided", () => {
    render(<TransactionRow description="Payment" amountCents={-1000} date="2025-06-15" />);
    expect(screen.getByText(/Jun/)).toBeTruthy();
  });

  it("shows running balance", () => {
    render(<TransactionRow description="ATM" amountCents={-2000} runningBalanceCents={150000} />);
    expect(screen.getByText("$1,500.00")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(
      <TransactionRow description="Test" amountCents={100} className="custom" />,
    );
    expect(container.firstChild).toHaveClass("custom");
  });
});
