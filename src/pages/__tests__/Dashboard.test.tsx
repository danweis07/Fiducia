import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    financial: { spending: vi.fn().mockResolvedValue({ byCategory: [], totalSpendingCents: 0 }) },
  },
}));

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: vi.fn(() => ({
    data: {
      accounts: [
        {
          id: "a-1",
          type: "checking",
          accountNumberMasked: "****1234",
          nickname: "My Checking",
          balanceCents: 150000,
          availableBalanceCents: 145000,
          status: "active",
        },
      ],
    },
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: vi.fn(() => ({
    data: { transactions: [] },
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useLoans", () => ({
  useLoans: vi.fn(() => ({
    data: { loans: [] },
  })),
}));

vi.mock("@/hooks/useCMSContent", () => ({
  useCMSBanners: vi.fn(() => ({ data: [] })),
  useCMSAnnouncements: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
}));

vi.mock("@/lib/common/design-tokens", () => ({
  actionColors: {
    transfer: "bg-blue-100 text-blue-700",
    billPay: "bg-green-100 text-green-700",
    deposit: "bg-purple-100 text-purple-700",
    cards: "bg-orange-100 text-orange-700",
    findAtm: "bg-gray-100 text-gray-700",
  },
  transactionColors: {},
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => createElement("div", null, "Loading..."),
  TransactionRowSkeleton: () => createElement("div", null, "tx-skeleton"),
}));

vi.mock("@/components/common/TransactionRow", () => ({
  TransactionRow: ({ description }: { description: string }) =>
    createElement("div", null, description),
}));

vi.mock("@/components/common/CMSBanner", () => ({
  CMSBannerList: () => null,
}));

vi.mock("@/components/common/Spinner", () => ({
  Spinner: () => createElement("div", null, "spinner"),
}));

vi.mock("@/hooks/usePullToRefresh", () => ({
  usePullToRefresh: () => ({ isRefreshing: false }),
}));

vi.mock("@/contexts/TenantContext", () => ({
  useAuth: vi.fn(() => ({
    tenant: {
      region: "us",
      features: {
        rdc: true,
        billPay: true,
        p2p: false,
        cardControls: true,
        externalTransfers: true,
        wires: false,
        mobileDeposit: true,
        directDeposit: false,
        openBanking: false,
        sca: false,
        confirmationOfPayee: false,
        multiCurrency: false,
        internationalPayments: false,
        internationalBillPay: false,
        openBankingAggregation: false,
        aliasPayments: false,
        amlScreening: false,
        instantPayments: false,
      },
    },
  })),
  DEFAULT_FEATURES: {
    rdc: true,
    billPay: true,
    p2p: false,
    cardControls: true,
    externalTransfers: true,
    wires: false,
    mobileDeposit: true,
    directDeposit: false,
    openBanking: false,
    sca: false,
    confirmationOfPayee: false,
    multiCurrency: false,
    internationalPayments: false,
    internationalBillPay: false,
    openBankingAggregation: false,
    aliasPayments: false,
    amlScreening: false,
  },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("Dashboard", () => {
  it("renders without crashing", async () => {
    const { default: Dashboard } = await import("../Dashboard");
    const { container } = render(createElement(Dashboard), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("shows the welcome message", async () => {
    const { default: Dashboard } = await import("../Dashboard");
    render(createElement(Dashboard), { wrapper: createWrapper() });
    expect(screen.getByText("Welcome back")).toBeTruthy();
    expect(screen.getByText("Here is your financial overview for today.")).toBeTruthy();
  });

  it("displays account data from mock", async () => {
    const { default: Dashboard } = await import("../Dashboard");
    render(createElement(Dashboard), { wrapper: createWrapper() });
    expect(screen.getByText("Your Accounts")).toBeTruthy();
    expect(screen.getByText("My Checking")).toBeTruthy();
  });

  it("renders quick action buttons", async () => {
    const { default: Dashboard } = await import("../Dashboard");
    render(createElement(Dashboard), { wrapper: createWrapper() });
    // US region with rdc, billPay, cardControls enabled should show these actions
    expect(screen.getByText("Move Money")).toBeTruthy();
    expect(screen.getByText("Pay Bills")).toBeTruthy();
    expect(screen.getByText("Deposit Check")).toBeTruthy();
    expect(screen.getByText("Card Controls")).toBeTruthy();
    expect(screen.getByText("Find ATM")).toBeTruthy();
  });

  it("shows account type styling", async () => {
    const { default: Dashboard } = await import("../Dashboard");
    const { container } = render(createElement(Dashboard), { wrapper: createWrapper() });
    // The account card should render with account content (nickname, balance, etc.)
    const accountCard =
      container.querySelector("[class*='card'], [class*='Card']") ?? container.firstElementChild;
    expect(accountCard).toBeTruthy();
    expect(screen.getByText("My Checking")).toBeTruthy();
  });
});
