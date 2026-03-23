import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    locations: {
      search: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import { locationKeys, useLocationSearch } from "../useLocations";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("locationKeys", () => {
  it("has correct all key", () => {
    expect(locationKeys.all).toEqual(["locations"]);
  });

  it("has correct search key", () => {
    expect(locationKeys.search({ latitude: 40.7, longitude: -74.0 })).toEqual([
      "locations",
      "search",
      { latitude: 40.7, longitude: -74.0 },
    ]);
  });
});

describe("useLocationSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches locations when params provided", async () => {
    const mockLocations = [{ id: "loc-1", name: "Main Branch", latitude: 40.7, longitude: -74.0 }];
    vi.mocked(gateway.locations.search).mockResolvedValue({ locations: mockLocations });

    const { result } = renderHook(
      () => useLocationSearch({ latitude: 40.7, longitude: -74.0, radiusMiles: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.locations.search).toHaveBeenCalledWith({
      latitude: 40.7,
      longitude: -74.0,
      radiusMiles: 10,
    });
  });

  it("does not fetch when params is null", () => {
    const { result } = renderHook(() => useLocationSearch(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(gateway.locations.search).not.toHaveBeenCalled();
  });
});
