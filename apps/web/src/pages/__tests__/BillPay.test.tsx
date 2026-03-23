import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    billpay: {
      listPayees: vi.fn().mockResolvedValue({ payees: [] }),
      listPayments: vi.fn().mockResolvedValue({ payments: [] }),
      searchBillers: vi.fn().mockResolvedValue({ billers: [] }),
      enrollPayee: vi.fn().mockResolvedValue({}),
      schedulePayment: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: vi.fn(() => ({ handleError: vi.fn() })),
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
}));

vi.mock("@/lib/common/design-tokens", () => ({
  getStatusStyle: vi.fn(() => ({ badge: "", icon: "", text: "" })),
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => createElement("div", null, "Loading..."),
}));

vi.mock("@/components/common/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => createElement("div", null, title),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("BillPay", () => {
  it("renders without crashing", async () => {
    const { default: BillPay } = await import("../BillPay");
    const { container } = render(createElement(BillPay), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("shows the page heading", async () => {
    const { default: BillPay } = await import("../BillPay");
    render(createElement(BillPay), { wrapper: createWrapper() });
    expect(await screen.findByText("Bill Pay")).toBeTruthy();
  });

  it("shows add payee button", async () => {
    const { default: BillPay } = await import("../BillPay");
    render(createElement(BillPay), { wrapper: createWrapper() });
    expect(await screen.findByText("Add Payee")).toBeTruthy();
  });
});
