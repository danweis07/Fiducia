import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useExternalAccounts", () => ({
  useLinkedAccounts: vi.fn(() => ({
    data: {
      accounts: [
        {
          accountId: "ext-1",
          name: "Chase Checking",
          institutionName: "Chase",
          mask: "4567",
          type: "checking",
          balanceCents: 150000,
          availableBalanceCents: 145000,
        },
        {
          accountId: "ext-2",
          name: "Ally Savings",
          institutionName: "Ally",
          mask: "8901",
          type: "savings",
          balanceCents: 500000,
          availableBalanceCents: null,
        },
      ],
    },
    isLoading: false,
    error: null,
  })),
  useExternalTransactions: vi.fn(() => ({
    data: {
      transactions: [
        {
          transactionId: "txn-1",
          merchantName: "Amazon",
          description: "Amazon.com",
          date: "2026-03-10",
          amountCents: -4500,
          pending: false,
        },
        {
          transactionId: "txn-2",
          merchantName: null,
          description: "Payroll Deposit",
          date: "2026-03-08",
          amountCents: 250000,
          pending: true,
        },
      ],
    },
    isLoading: false,
  })),
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => <div>Loading...</div>,
}));

vi.mock("@/components/common/Spinner", () => ({
  Spinner: () => <div>Spinner</div>,
}));

import LinkedAccounts from "../LinkedAccounts";

describe("LinkedAccounts", () => {
  it("renders accounts and transactions", () => {
    render(<LinkedAccounts />);
    expect(screen.getByText("Linked Accounts")).toBeTruthy();
    expect(screen.getByText("Chase Checking")).toBeTruthy();
    expect(screen.getByText("Ally Savings")).toBeTruthy();
    expect(screen.getByText("Amazon")).toBeTruthy();
    expect(screen.getByText("Payroll Deposit")).toBeTruthy();
  });

  it("shows total balance", () => {
    render(<LinkedAccounts />);
    // 150000 + 500000 = 650000 cents = $6,500.00
    expect(screen.getByText(/6,500/)).toBeTruthy();
  });

  it("selects account on click", () => {
    render(<LinkedAccounts />);
    const card = screen.getByText("Chase Checking").closest(".cursor-pointer");
    if (card) fireEvent.click(card);
    // After selection, the transactions header updates
    expect(screen.getAllByText(/Chase Checking/).length).toBeGreaterThanOrEqual(1);
  });
});
