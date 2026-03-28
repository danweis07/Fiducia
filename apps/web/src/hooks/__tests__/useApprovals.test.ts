import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    approvals: {
      listRequests: vi.fn(),
      getRequest: vi.fn(),
      approve: vi.fn(),
      deny: vi.fn(),
      cancel: vi.fn(),
      listPolicies: vi.fn(),
      createPolicy: vi.fn(),
      updatePolicy: vi.fn(),
      deletePolicy: vi.fn(),
      getSummary: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useApprovalRequests,
  useApprovalRequest,
  useApproveRequest,
  useDenyRequest,
  useCancelApprovalRequest,
  useApprovalPolicies,
  useCreateApprovalPolicy,
  useUpdateApprovalPolicy,
  useDeleteApprovalPolicy,
  useApprovalSummary,
} from "../useApprovals";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useApprovalRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches requests successfully", async () => {
    vi.mocked(gateway.approvals.listRequests).mockResolvedValue({ requests: [] });

    const { result } = renderHook(() => useApprovalRequests(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.approvals.listRequests).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useApprovalRequests(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useApprovalRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single request", async () => {
    vi.mocked(gateway.approvals.getRequest).mockResolvedValue({
      request: { id: "r-1", status: "pending" },
    } as never);

    const { result } = renderHook(() => useApprovalRequest("r-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useApprovalRequest(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.approvals.getRequest).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useApprovalRequest("r-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useApproveRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useApproveRequest(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useDenyRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useDenyRequest(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useCancelApprovalRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCancelApprovalRequest(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useApprovalPolicies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches policies successfully", async () => {
    vi.mocked(gateway.approvals.listPolicies).mockResolvedValue({ policies: [] });

    const { result } = renderHook(() => useApprovalPolicies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.approvals.listPolicies).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useApprovalPolicies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateApprovalPolicy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateApprovalPolicy(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useUpdateApprovalPolicy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useUpdateApprovalPolicy(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useDeleteApprovalPolicy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useDeleteApprovalPolicy(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useApprovalSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches summary successfully", async () => {
    vi.mocked(gateway.approvals.getSummary).mockResolvedValue({
      summary: {
        pendingCount: 5,
        approvedToday: 0,
        deniedToday: 0,
        avgResponseMinutes: 0,
        policies: [],
      },
    });

    const { result } = renderHook(() => useApprovalSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.approvals.getSummary).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useApprovalSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
