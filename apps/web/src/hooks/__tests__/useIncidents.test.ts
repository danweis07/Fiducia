import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useIncidents, useIncident, useSystemHealth } from "../useIncidents";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    incidents: {
      list: vi.fn().mockResolvedValue({ incidents: [{ id: "inc-1", title: "Outage" }] }),
      get: vi.fn().mockResolvedValue({ incident: { id: "inc-1", title: "Outage" } }),
      create: vi.fn(),
      update: vi.fn(),
      addTimeline: vi.fn(),
      notifyStakeholders: vi.fn(),
    },
    rollbacks: {
      list: vi.fn().mockResolvedValue({ rollbacks: [] }),
      initiate: vi.fn(),
    },
    changeRequests: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
    },
    systemHealth: {
      snapshot: vi.fn().mockResolvedValue({ status: "healthy" }),
      deployments: vi.fn(),
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useIncidents", () => {
  it("fetches incidents list", async () => {
    const { result } = renderHook(() => useIncidents(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.incidents).toHaveLength(1);
    expect(result.current.data?.incidents[0].id).toBe("inc-1");
  });

  it("supports status filter", async () => {
    const { result } = renderHook(() => useIncidents({ status: "open" as never }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useIncident", () => {
  it("fetches single incident", async () => {
    const { result } = renderHook(() => useIncident("inc-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.incident.id).toBe("inc-1");
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useIncident(""), {
      wrapper: createWrapper(),
    });
    expect(result.current.isFetching).toBe(false);
  });
});

describe("useSystemHealth", () => {
  it("fetches system health snapshot", async () => {
    const { result } = renderHook(() => useSystemHealth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.health.status).toBe("healthy");
  });
});
