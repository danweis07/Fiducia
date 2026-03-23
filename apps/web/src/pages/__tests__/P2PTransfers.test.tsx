import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({}),
    p2p: {
      getEnrollment: vi.fn().mockResolvedValue({ enrollment: null }),
      listTransactions: vi.fn().mockResolvedValue({ transactions: [] }),
      getLimits: vi.fn().mockResolvedValue({ limits: null }),
      enroll: vi.fn().mockResolvedValue({}),
      unenroll: vi.fn().mockResolvedValue({}),
      send: vi.fn().mockResolvedValue({}),
      request: vi.fn().mockResolvedValue({}),
      cancel: vi.fn().mockResolvedValue({}),
    },
    accounts: {
      list: vi.fn().mockResolvedValue({ accounts: [] }),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: () => ({ handleError: vi.fn() }),
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-testid": "app-shell" }, children),
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => createElement("div", null, "Loading..."),
}));

vi.mock("@/components/common/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => createElement("div", null, title),
}));

const mutationResult = {
  mutateAsync: vi.fn(),
  mutate: vi.fn(),
  isPending: false,
  isIdle: true,
  isSuccess: false,
  isError: false,
  data: undefined,
  error: null,
  reset: vi.fn(),
};

vi.mock("@/hooks/useP2P", () => ({
  useP2PEnrollment: () => ({ data: { enrollment: null }, isLoading: false }),
  useEnrollP2P: () => mutationResult,
  useUnenrollP2P: () => mutationResult,
  useSendP2P: () => mutationResult,
  useRequestP2P: () => mutationResult,
  useP2PTransactions: () => ({ data: { transactions: [] }, isLoading: false }),
  useCancelP2PRequest: () => mutationResult,
  useP2PLimits: () => ({ data: { limits: null }, isLoading: false }),
}));

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: { accounts: [] }, isLoading: false }),
  accountKeys: { all: ["accounts"] },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

import P2PTransfers from "../P2PTransfers";

describe("P2PTransfers", () => {
  it("renders without crashing", () => {
    render(createElement(P2PTransfers), { wrapper: createWrapper() });
    expect(screen.getByText("Send & Receive Money")).toBeTruthy();
  });

  it("shows the Zelle description", () => {
    render(createElement(P2PTransfers), { wrapper: createWrapper() });
    expect(screen.getByText("Send money instantly with Zelle")).toBeTruthy();
  });

  it("shows enroll button when not enrolled", () => {
    render(createElement(P2PTransfers), { wrapper: createWrapper() });
    expect(screen.getByText("Enroll in Zelle")).toBeTruthy();
  });

  it("renders transaction history section", () => {
    render(createElement(P2PTransfers), { wrapper: createWrapper() });
    expect(screen.getByText("Transaction History")).toBeTruthy();
  });
});
