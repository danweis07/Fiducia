import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useInvoiceProcessor", () => ({
  useInvoices: vi.fn(() => ({ data: { invoices: [] }, isLoading: false })),
  useAnalyzeInvoice: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useConfirmInvoice: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCancelInvoice: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: vi.fn(() => ({ data: { accounts: [] }, isLoading: false })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("InvoiceProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: InvoiceProcessorPage } = await import("../InvoiceProcessor");
    render(createElement(InvoiceProcessorPage), { wrapper: createWrapper() });
  });
});
