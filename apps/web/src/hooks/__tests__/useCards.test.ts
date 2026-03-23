import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    cards: {
      list: vi.fn(),
      lock: vi.fn(),
      unlock: vi.fn(),
      setLimit: vi.fn(),
    },
  },
}));

import { useCards, useLockCard, useUnlockCard, useSetCardLimit, cardKeys } from "../useCards";
import { gateway } from "@/lib/gateway";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockCards = [
  {
    id: "card-1",
    cardNumberMasked: "****4242",
    type: "debit",
    status: "active",
    dailyLimitCents: 200000,
  },
  {
    id: "card-2",
    cardNumberMasked: "****5353",
    type: "credit",
    status: "active",
    dailyLimitCents: 500000,
  },
  {
    id: "card-3",
    cardNumberMasked: "****7878",
    type: "debit",
    status: "locked",
    dailyLimitCents: 100000,
  },
];

describe("cardKeys", () => {
  it("has correct all key", () => {
    expect(cardKeys.all).toEqual(["cards"]);
  });
});

describe("useCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches cards list", async () => {
    vi.mocked(gateway.cards.list).mockResolvedValue({ cards: mockCards });

    const { result } = renderHook(() => useCards(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.cards).toHaveLength(3);
  });

  it("returns cards with correct properties", async () => {
    vi.mocked(gateway.cards.list).mockResolvedValue({ cards: [mockCards[0]] });

    const { result } = renderHook(() => useCards(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const card = result.current.data?.cards[0];
    expect(card).toMatchObject({
      id: "card-1",
      cardNumberMasked: "****4242",
      type: "debit",
      status: "active",
      dailyLimitCents: 200000,
    });
  });

  it("handles empty cards list", async () => {
    vi.mocked(gateway.cards.list).mockResolvedValue({ cards: [] });

    const { result } = renderHook(() => useCards(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.cards).toHaveLength(0);
  });

  it("handles error", async () => {
    vi.mocked(gateway.cards.list).mockRejectedValue(new Error("Service unavailable"));

    const { result } = renderHook(() => useCards(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Service unavailable");
  });

  it("includes locked cards in results", async () => {
    vi.mocked(gateway.cards.list).mockResolvedValue({ cards: mockCards });

    const { result } = renderHook(() => useCards(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const locked = result.current.data?.cards.filter(
      (c: { status: string }) => c.status === "locked",
    );
    expect(locked).toHaveLength(1);
  });

  it("starts in loading state", () => {
    vi.mocked(gateway.cards.list).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCards(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });
});

describe("useLockCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("locks a card", async () => {
    vi.mocked(gateway.cards.lock).mockResolvedValue({
      card: { id: "card-1", status: "locked" },
    } as never);

    const { result } = renderHook(() => useLockCard(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync("card-1");
    });

    expect(gateway.cards.lock).toHaveBeenCalledWith("card-1");
  });

  it("handles lock failure", async () => {
    vi.mocked(gateway.cards.lock).mockRejectedValue(new Error("Card already locked"));

    const { result } = renderHook(() => useLockCard(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync("card-3");
      }),
    ).rejects.toThrow("Card already locked");
  });

  it("locks different cards by id", async () => {
    vi.mocked(gateway.cards.lock).mockResolvedValue({ card: { id: "card-2" } } as never);

    const { result } = renderHook(() => useLockCard(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync("card-2");
    });

    expect(gateway.cards.lock).toHaveBeenCalledWith("card-2");
  });
});

describe("useUnlockCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unlocks a card", async () => {
    vi.mocked(gateway.cards.unlock).mockResolvedValue({
      card: { id: "card-3", status: "active" },
    } as never);

    const { result } = renderHook(() => useUnlockCard(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync("card-3");
    });

    expect(gateway.cards.unlock).toHaveBeenCalledWith("card-3");
  });

  it("handles unlock failure for active card", async () => {
    vi.mocked(gateway.cards.unlock).mockRejectedValue(new Error("Card is not locked"));

    const { result } = renderHook(() => useUnlockCard(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync("card-1");
      }),
    ).rejects.toThrow("Card is not locked");
  });

  it("handles network error during unlock", async () => {
    vi.mocked(gateway.cards.unlock).mockRejectedValue(new Error("Network timeout"));

    const { result } = renderHook(() => useUnlockCard(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync("card-3");
      }),
    ).rejects.toThrow("Network timeout");
  });
});

describe("useSetCardLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets card daily limit", async () => {
    vi.mocked(gateway.cards.setLimit).mockResolvedValue({
      card: { id: "card-1", dailyLimitCents: 300000 },
    } as never);

    const { result } = renderHook(() => useSetCardLimit(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: "card-1", dailyLimitCents: 300000 });
    });

    expect(gateway.cards.setLimit).toHaveBeenCalledWith("card-1", 300000);
  });

  it("sets very low limit", async () => {
    vi.mocked(gateway.cards.setLimit).mockResolvedValue({
      card: { id: "card-1", dailyLimitCents: 100 },
    } as never);

    const { result } = renderHook(() => useSetCardLimit(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: "card-1", dailyLimitCents: 100 });
    });

    expect(gateway.cards.setLimit).toHaveBeenCalledWith("card-1", 100);
  });

  it("sets high limit", async () => {
    vi.mocked(gateway.cards.setLimit).mockResolvedValue({
      card: { id: "card-2", dailyLimitCents: 10000000 },
    } as never);

    const { result } = renderHook(() => useSetCardLimit(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: "card-2", dailyLimitCents: 10000000 });
    });

    expect(gateway.cards.setLimit).toHaveBeenCalledWith("card-2", 10000000);
  });

  it("handles error when setting limit", async () => {
    vi.mocked(gateway.cards.setLimit).mockRejectedValue(new Error("Limit exceeds maximum"));

    const { result } = renderHook(() => useSetCardLimit(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ id: "card-1", dailyLimitCents: 99999999 });
      }),
    ).rejects.toThrow("Limit exceeds maximum");
  });

  it("sets zero limit (effectively disabling card usage)", async () => {
    vi.mocked(gateway.cards.setLimit).mockResolvedValue({
      card: { id: "card-1", dailyLimitCents: 0 },
    } as never);

    const { result } = renderHook(() => useSetCardLimit(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: "card-1", dailyLimitCents: 0 });
    });

    expect(gateway.cards.setLimit).toHaveBeenCalledWith("card-1", 0);
  });
});
