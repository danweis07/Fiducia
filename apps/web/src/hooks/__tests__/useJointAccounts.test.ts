import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    jointAccounts: {
      listOwners: vi.fn(),
      addOwner: vi.fn(),
      removeOwner: vi.fn(),
      updatePermissions: vi.fn(),
      listInvitations: vi.fn(),
      acceptInvitation: vi.fn(),
      declineInvitation: vi.fn(),
      summary: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  jointAccountKeys,
  useJointOwners,
  useAddJointOwner,
  useRemoveJointOwner,
  usePendingInvitations,
  useAcceptInvitation,
  useDeclineInvitation,
  useJointAccountSummary,
} from "../useJointAccounts";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("jointAccountKeys", () => {
  it("has correct all key", () => {
    expect(jointAccountKeys.all).toEqual(["jointAccounts"]);
  });
  it("has correct owners key", () => {
    expect(jointAccountKeys.owners("acct-1")).toEqual(["jointAccounts", "owners", "acct-1"]);
  });
  it("has correct invitations key", () => {
    expect(jointAccountKeys.invitations).toEqual(["jointAccounts", "invitations"]);
  });
  it("has correct summary key", () => {
    expect(jointAccountKeys.summary).toEqual(["jointAccounts", "summary"]);
  });
});

describe("useJointOwners", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches owners for account", async () => {
    const owners = [
      { id: "owner-1", name: "Alice" },
    ] as unknown as import("@/types").JointAccountOwner[];
    vi.mocked(gateway.jointAccounts.listOwners).mockResolvedValue({ owners });
    const { result } = renderHook(() => useJointOwners("acct-1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.owners).toEqual(owners);
  });

  it("does not fetch without accountId", () => {
    const { result } = renderHook(() => useJointOwners(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useAddJointOwner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway addOwner", async () => {
    const mockInvitation = {} as import("@/types").JointAccountInvitation;
    vi.mocked(gateway.jointAccounts.addOwner).mockResolvedValue({ invitation: mockInvitation });
    const { result } = renderHook(() => useAddJointOwner(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({
        accountId: "acct-1",
        email: "bob@test.com",
        firstName: "Bob",
        lastName: "Smith",
        relationship: "spouse" as import("@/types").JointOwnerRelationship,
        permissions: "full" as import("@/types").JointOwnerPermission,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.jointAccounts.addOwner).toHaveBeenCalled();
  });
});

describe("useRemoveJointOwner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway removeOwner", async () => {
    vi.mocked(gateway.jointAccounts.removeOwner).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRemoveJointOwner(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ accountId: "acct-1", ownerId: "owner-1" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePendingInvitations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches invitations", async () => {
    vi.mocked(gateway.jointAccounts.listInvitations).mockResolvedValue({ invitations: [] });
    const { result } = renderHook(() => usePendingInvitations(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.invitations).toEqual([]);
  });
});

describe("useAcceptInvitation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway acceptInvitation", async () => {
    vi.mocked(gateway.jointAccounts.acceptInvitation).mockResolvedValue({
      success: true,
      invitationId: "inv-1",
    });
    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate("inv-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeclineInvitation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway declineInvitation", async () => {
    vi.mocked(gateway.jointAccounts.declineInvitation).mockResolvedValue({
      success: true,
      invitationId: "inv-1",
    });
    const { result } = renderHook(() => useDeclineInvitation(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate("inv-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useJointAccountSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches summary", async () => {
    const summary = {
      summary: {
        primaryAccountCount: 2,
        jointAccountCount: 3,
        totalAccountCount: 5,
        pendingInvitationCount: 1,
      },
    };
    vi.mocked(gateway.jointAccounts.summary).mockResolvedValue(summary);
    const { result } = renderHook(() => useJointAccountSummary(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
  });
});
