import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoanCard, loanStatusVariant, loanTypeLabels } from "../LoanCard";

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
}));

const defaultProps = {
  id: "loan-1",
  loanType: "auto" as const,
  loanNumberMasked: "****5678",
  principalCents: 2000000,
  outstandingBalanceCents: 1500000,
  status: "active" as const,
  daysPastDue: 0,
  nextPaymentDueDate: "2024-06-15",
  nextPaymentAmountCents: 35000,
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <LoanCard {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

describe("LoanCard", () => {
  it("renders loan type label", () => {
    renderCard();
    expect(screen.getByText("Auto Loan")).toBeTruthy();
  });

  it("renders masked loan number", () => {
    renderCard();
    expect(screen.getByText("****5678")).toBeTruthy();
  });

  it("renders outstanding balance", () => {
    renderCard();
    expect(screen.getByText("$15000.00")).toBeTruthy();
  });

  it("renders progress percentage", () => {
    renderCard();
    // (2000000 - 1500000) / 2000000 = 25%
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("renders as a link to loan detail", () => {
    renderCard();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/loans/loan-1");
  });

  it("shows days past due when > 0", () => {
    renderCard({ daysPastDue: 15, status: "delinquent" });
    expect(screen.getByText("15d past due")).toBeTruthy();
  });

  it("shows status when not past due", () => {
    renderCard({ daysPastDue: 0 });
    expect(screen.getByText("active")).toBeTruthy();
  });

  it("shows next payment info", () => {
    renderCard();
    expect(screen.getByText(/\$350\.00/)).toBeTruthy();
  });

  it("hides next payment when not provided", () => {
    renderCard({ nextPaymentDueDate: null, nextPaymentAmountCents: null });
    expect(screen.queryByText(/Next:/)).toBeNull();
  });

  it("handles zero principal gracefully", () => {
    renderCard({ principalCents: 0 });
    expect(screen.getByText("0%")).toBeTruthy();
  });
});

describe("loanStatusVariant", () => {
  it("returns secondary for active", () => {
    expect(loanStatusVariant("active")).toBe("secondary");
  });

  it("returns destructive for delinquent", () => {
    expect(loanStatusVariant("delinquent")).toBe("destructive");
  });

  it("returns destructive for default", () => {
    expect(loanStatusVariant("default")).toBe("destructive");
  });

  it("returns destructive for charged_off", () => {
    expect(loanStatusVariant("charged_off")).toBe("destructive");
  });

  it("returns outline for other statuses", () => {
    expect(loanStatusVariant("paid_off")).toBe("outline");
  });
});

describe("loanTypeLabels", () => {
  it("has labels for all loan types", () => {
    expect(loanTypeLabels.personal).toBe("Personal Loan");
    expect(loanTypeLabels.auto).toBe("Auto Loan");
    expect(loanTypeLabels.mortgage).toBe("Mortgage");
    expect(loanTypeLabels.heloc).toBe("HELOC");
    expect(loanTypeLabels.student).toBe("Student Loan");
  });
});
