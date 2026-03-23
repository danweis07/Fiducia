import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: (cents: number) => `$${(cents / 100).toFixed(2)}`,
  formatCurrencyCompact: (cents: number) => `$${(cents / 100).toFixed(0)}`,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AccountCard", () => {
  it("renders account info with balance and status", async () => {
    const { AccountCard } = await import("../AccountCard");
    render(
      createElement(AccountCard, {
        id: "acc-1",
        type: "checking",
        nickname: "My Checking",
        accountNumberMasked: "****1234",
        balanceCents: 150000,
        availableBalanceCents: 140000,
        status: "active",
      }),
    );
    expect(screen.getByText("My Checking")).toBeTruthy();
    expect(screen.getByText("$1500.00")).toBeTruthy();
    expect(screen.getByText("active")).toBeTruthy();
  });

  it("renders as a link by default", async () => {
    const { AccountCard } = await import("../AccountCard");
    const { container } = render(
      createElement(AccountCard, {
        id: "acc-2",
        type: "savings",
        accountNumberMasked: "****5678",
        balanceCents: 250000,
        availableBalanceCents: 250000,
        status: "active",
      }),
    );
    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/accounts/acc-2");
  });

  it("renders without link when linkable is false", async () => {
    const { AccountCard } = await import("../AccountCard");
    const { container } = render(
      createElement(AccountCard, {
        id: "acc-3",
        type: "checking",
        accountNumberMasked: "****9999",
        balanceCents: 100000,
        availableBalanceCents: 100000,
        status: "active",
        linkable: false,
      }),
    );
    expect(container.querySelector("a")).toBeNull();
  });
});

describe("LoanCard", () => {
  it("renders loan info with progress", async () => {
    const { LoanCard } = await import("../LoanCard");
    render(
      createElement(LoanCard, {
        id: "loan-1",
        loanType: "auto",
        loanNumberMasked: "****4321",
        principalCents: 2000000,
        outstandingBalanceCents: 1500000,
        status: "active",
        daysPastDue: 0,
      }),
    );
    expect(screen.getByText("Auto Loan")).toBeTruthy();
    expect(screen.getByText("$15000.00")).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("renders as a link to loan detail", async () => {
    const { LoanCard } = await import("../LoanCard");
    const { container } = render(
      createElement(LoanCard, {
        id: "loan-2",
        loanType: "personal",
        loanNumberMasked: "****8888",
        principalCents: 1000000,
        outstandingBalanceCents: 800000,
        status: "active",
        daysPastDue: 0,
      }),
    );
    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/loans/loan-2");
  });

  it("shows days past due when delinquent", async () => {
    const { LoanCard } = await import("../LoanCard");
    render(
      createElement(LoanCard, {
        id: "loan-3",
        loanType: "mortgage",
        loanNumberMasked: "****7777",
        principalCents: 30000000,
        outstandingBalanceCents: 28000000,
        status: "delinquent",
        daysPastDue: 15,
      }),
    );
    expect(screen.getByText("15d past due")).toBeTruthy();
  });
});

describe("BalanceDisplay", () => {
  it("renders formatted balance", async () => {
    const { BalanceDisplay } = await import("../BalanceDisplay");
    render(createElement(BalanceDisplay, { cents: 150000 }));
    expect(screen.getByText("$1500.00")).toBeTruthy();
  });

  it("renders with label when provided", async () => {
    const { BalanceDisplay } = await import("../BalanceDisplay");
    render(createElement(BalanceDisplay, { cents: 250000, label: "Available Balance" }));
    expect(screen.getByText("Available Balance")).toBeTruthy();
  });
});
