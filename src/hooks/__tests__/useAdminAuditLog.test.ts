import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    adminAudit: {
      log: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import { useAdminAuditLog, adminAuditKeys } from "../useAdminAuditLog";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("adminAuditKeys", () => {
  it("has correct all key", () => {
    expect(adminAuditKeys.all).toEqual(["admin-audit"]);
  });

  it("has correct log key", () => {
    expect(adminAuditKeys.log({ action: "login" })).toEqual([
      "admin-audit",
      "log",
      { action: "login" },
    ]);
  });
});

describe("useAdminAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches audit log successfully", async () => {
    vi.mocked(gateway.adminAudit.log).mockResolvedValue({ entries: [], total: 0 });

    const { result } = renderHook(() => useAdminAuditLog(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("fetches with params", async () => {
    vi.mocked(gateway.adminAudit.log).mockResolvedValue({ entries: [], total: 0 });

    const { result } = renderHook(() => useAdminAuditLog({ action: "transfer", limit: 50 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.adminAudit.log).toHaveBeenCalledWith({ action: "transfer", limit: 50 });
  });

  it("handles error", async () => {
    vi.mocked(gateway.adminAudit.log).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAdminAuditLog(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
