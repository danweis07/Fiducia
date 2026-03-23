import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useAdminAccounts", () => ({
  useAdminAccountList: vi.fn(() => ({
    data: { accounts: [], totalCount: 0 },
    isLoading: false,
  })),
  useAdminAccountAggregates: vi.fn(() => ({
    data: {
      totalAccounts: 100,
      totalDepositsCents: 5000000,
      frozenCount: 2,
    },
    isLoading: false,
  })),
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => <div>Loading...</div>,
}));

import AccountOverview from "../AccountOverview";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  );
}

describe("AccountOverview", () => {
  it("renders without crashing", () => {
    render(<AccountOverview />, { wrapper });
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });
});
