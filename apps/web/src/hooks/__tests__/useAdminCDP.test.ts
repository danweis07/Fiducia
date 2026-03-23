import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    adminCDP: {
      getConfig: vi
        .fn()
        .mockResolvedValue({ config: { enabled: false, writeKey: "", dataPlaneUrl: "" } }),
      updateConfig: vi.fn().mockResolvedValue({}),
      listDestinations: vi.fn().mockResolvedValue({ destinations: [] }),
      createDestination: vi.fn().mockResolvedValue({}),
      updateDestination: vi.fn().mockResolvedValue({}),
      deleteDestination: vi.fn().mockResolvedValue({}),
      listRecentEvents: vi.fn().mockResolvedValue({ events: [] }),
      getEventSummary: vi.fn().mockResolvedValue({ summary: null }),
    },
  },
}));

import {
  adminCDPKeys,
  useCDPConfig,
  useUpdateCDPConfig,
  useCDPDestinations,
  useCreateCDPDestination,
  useUpdateCDPDestination,
  useDeleteCDPDestination,
  useCDPRecentEvents,
  useCDPEventSummary,
} from "../useAdminCDP";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("useAdminCDP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adminCDPKeys returns expected key structures", () => {
    expect(adminCDPKeys.all).toEqual(["admin-cdp"]);
    expect(adminCDPKeys.config()).toEqual(["admin-cdp", "config"]);
    expect(adminCDPKeys.destinations()).toEqual(["admin-cdp", "destinations"]);
    expect(adminCDPKeys.events({ limit: 10 })).toEqual(["admin-cdp", "events", { limit: 10 }]);
    expect(adminCDPKeys.summary("7d")).toEqual(["admin-cdp", "summary", "7d"]);
  });

  it("useCDPConfig fetches config", async () => {
    const { result } = renderHook(() => useCDPConfig(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it("useCDPDestinations fetches destinations", async () => {
    const { result } = renderHook(() => useCDPDestinations(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("useCDPRecentEvents fetches events", async () => {
    const { result } = renderHook(() => useCDPRecentEvents(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("useCDPEventSummary fetches summary", async () => {
    const { result } = renderHook(() => useCDPEventSummary("7d"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("useUpdateCDPConfig returns mutate function", () => {
    const { result } = renderHook(() => useUpdateCDPConfig(), { wrapper: createWrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });

  it("useCreateCDPDestination returns mutate function", () => {
    const { result } = renderHook(() => useCreateCDPDestination(), { wrapper: createWrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });

  it("useUpdateCDPDestination returns mutate function", () => {
    const { result } = renderHook(() => useUpdateCDPDestination(), { wrapper: createWrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });

  it("useDeleteCDPDestination returns mutate function", () => {
    const { result } = renderHook(() => useDeleteCDPDestination(), { wrapper: createWrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});
