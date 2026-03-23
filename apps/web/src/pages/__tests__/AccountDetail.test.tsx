import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock gateway
vi.mock("@/lib/gateway", () => ({
  gateway: { request: vi.fn().mockResolvedValue({}) },
}));

// Mock hooks
const mockAccount = {
  id: "acct-1",
  type: "checking",
  nickname: "My Checking",
  accountNumberMasked: "****1234",
  status: "active",
  balanceCents: 125000,
  availableBalanceCents: 120000,
  interestRateBps: 50,
  routingNumber: "021000021",
  openedAt: "2023-01-01",
};

vi.mock("@/hooks/useAccounts", () => ({
  useAccount: () => ({
    data: { account: mockAccount },
    isLoading: false,
    error: null,
  }),
  useAccounts: () => ({
    data: { accounts: [mockAccount] },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: () => ({
    data: { transactions: [] },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useCDMaturity", () => ({
  useCDMaturity: () => ({ data: null, isLoading: false }),
  useUpdateCDMaturityAction: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useCharges", () => ({
  useCharges: () => ({ data: { charges: [] }, isLoading: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: () => ({ handleError: vi.fn() }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(
        MemoryRouter,
        { initialEntries: ["/accounts/acct-1"] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: "/accounts/:id", element: children }),
        ),
      ),
    );
}

describe("AccountDetail page", () => {
  it("renders without crashing", async () => {
    const { default: AccountDetail } = await import("../AccountDetail");
    const { container } = render(createElement(AccountDetail), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("displays the account nickname", async () => {
    const { default: AccountDetail } = await import("../AccountDetail");
    render(createElement(AccountDetail), { wrapper: createWrapper() });
    expect(screen.getAllByText("My Checking").length).toBeGreaterThan(0);
  });

  it("shows account status badge", async () => {
    const { default: AccountDetail } = await import("../AccountDetail");
    render(createElement(AccountDetail), { wrapper: createWrapper() });
    expect(screen.getByText("active")).toBeTruthy();
  });

  it("displays the Transactions tab", async () => {
    const { default: AccountDetail } = await import("../AccountDetail");
    render(createElement(AccountDetail), { wrapper: createWrapper() });
    expect(screen.getAllByText("Transactions").length).toBeGreaterThan(0);
  });
});
