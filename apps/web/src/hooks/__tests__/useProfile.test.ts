import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    auth: {
      profile: vi.fn(),
      updateProfile: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import { useProfile, useUpdateProfile, profileKeys } from "../useProfile";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("profileKeys", () => {
  it("has correct all key", () => {
    expect(profileKeys.all).toEqual(["profile"]);
  });

  it("has correct current key", () => {
    expect(profileKeys.current()).toEqual(["profile", "current"]);
  });
});

describe("useProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches profile successfully", async () => {
    const mockProfile = {
      id: "user-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "5551234567",
    };
    vi.mocked(gateway.auth.profile).mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfile);
    expect(gateway.auth.profile).toHaveBeenCalledTimes(1);
  });

  it("handles error", async () => {
    vi.mocked(gateway.auth.profile).mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Unauthorized");
  });

  it("starts in loading state", () => {
    vi.mocked(gateway.auth.profile).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});

describe("useUpdateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates profile successfully", async () => {
    vi.mocked(gateway.auth.updateProfile).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ firstName: "Jane", lastName: "Smith" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.auth.updateProfile).toHaveBeenCalledWith({
      firstName: "Jane",
      lastName: "Smith",
    });
  });

  it("handles update error", async () => {
    vi.mocked(gateway.auth.updateProfile).mockRejectedValue(new Error("Validation error"));

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ phone: "invalid" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Validation error");
  });
});
