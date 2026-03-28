import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    member: {
      addresses: vi.fn(),
      updateAddress: vi.fn(),
      documents: vi.fn(),
      identifiers: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useMemberAddresses,
  useUpdateMemberAddress,
  useMemberDocuments,
  useMemberIdentifiers,
  memberKeys,
} from "../useMemberProfile";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("memberKeys", () => {
  it("has correct all key", () => {
    expect(memberKeys.all).toEqual(["member"]);
  });

  it("has correct addresses key", () => {
    expect(memberKeys.addresses()).toEqual(["member", "addresses"]);
  });

  it("has correct documents key", () => {
    expect(memberKeys.documents()).toEqual(["member", "documents"]);
  });

  it("has correct identifiers key", () => {
    expect(memberKeys.identifiers()).toEqual(["member", "identifiers"]);
  });
});

describe("useMemberAddresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches addresses successfully", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        type: "home",
        line1: "123 Main St",
        city: "Springfield",
        state: "IL",
        zip: "62701",
      },
    ];
    vi.mocked(gateway.member.addresses).mockResolvedValue({
      addresses: mockAddresses as unknown as import("@/types").MemberAddress[],
    });

    const { result } = renderHook(() => useMemberAddresses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(gateway.member.addresses).toHaveBeenCalledTimes(1);
  });

  it("handles error", async () => {
    vi.mocked(gateway.member.addresses).mockRejectedValue(new Error("Failed"));

    const { result } = renderHook(() => useMemberAddresses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdateMemberAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates address successfully", async () => {
    const mockAddr = { id: "addr-1" } as unknown as import("@/types").MemberAddress;
    vi.mocked(gateway.member.updateAddress).mockResolvedValue({ address: mockAddr });

    const { result } = renderHook(() => useUpdateMemberAddress(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: "addr-1", line1: "456 Oak Ave", city: "Chicago" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.member.updateAddress).toHaveBeenCalledWith("addr-1", {
      line1: "456 Oak Ave",
      city: "Chicago",
    });
  });
});

describe("useMemberDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches documents successfully", async () => {
    const mockDocs = [{ id: "doc-1", type: "id_card", status: "verified" }];
    vi.mocked(gateway.member.documents).mockResolvedValue({
      documents: mockDocs as unknown as import("@/types").MemberDocument[],
    });

    const { result } = renderHook(() => useMemberDocuments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.documents).toHaveLength(1);
  });
});

describe("useMemberIdentifiers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches identifiers successfully", async () => {
    const mockIds = [{ id: "ident-1", type: "ssn", valueMasked: "****1234" }];
    vi.mocked(gateway.member.identifiers).mockResolvedValue({
      identifiers: mockIds as unknown as import("@/types").MemberIdentifier[],
    });

    const { result } = renderHook(() => useMemberIdentifiers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.identifiers).toHaveLength(1);
  });
});
