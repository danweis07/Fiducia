import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    adminIntegrations: {
      list: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import { useAdminIntegrations, adminIntegrationKeys } from "../useAdminIntegrations";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("adminIntegrationKeys", () => {
  it("has correct all key", () => {
    expect(adminIntegrationKeys.all).toEqual(["admin-integrations"]);
  });

  it("has correct list key", () => {
    expect(adminIntegrationKeys.list()).toEqual(["admin-integrations", "list"]);
  });
});

describe("useAdminIntegrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches integrations successfully", async () => {
    vi.mocked(gateway.adminIntegrations.list).mockResolvedValue({ integrations: [] });

    const { result } = renderHook(() => useAdminIntegrations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.adminIntegrations.list).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAdminIntegrations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("calls gateway.adminIntegrations.list once", async () => {
    vi.mocked(gateway.adminIntegrations.list).mockResolvedValue({ integrations: [] });

    const { result } = renderHook(() => useAdminIntegrations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.adminIntegrations.list).toHaveBeenCalledTimes(1);
  });
});
