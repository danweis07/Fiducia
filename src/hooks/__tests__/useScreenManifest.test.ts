import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    sdui: {
      resolve: vi.fn(),
      persona: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import { useScreenManifest, useCurrentPersona, sduiKeys } from "../useScreenManifest";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("sduiKeys", () => {
  it("has correct all key", () => {
    expect(sduiKeys.all).toEqual(["sdui"]);
  });

  it("has correct screen key", () => {
    expect(sduiKeys.screen("dashboard" as unknown)).toEqual(["sdui", "screen", "dashboard"]);
  });

  it("has correct persona key", () => {
    expect(sduiKeys.persona()).toEqual(["sdui", "persona"]);
  });
});

describe("useScreenManifest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches screen manifest successfully", async () => {
    vi.mocked(gateway.sdui.resolve).mockResolvedValue({ screen: "dashboard", components: [] });

    const { result } = renderHook(() => useScreenManifest("dashboard" as unknown), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.sdui.resolve).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useScreenManifest("dashboard" as unknown), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCurrentPersona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches persona successfully", async () => {
    vi.mocked(gateway.sdui.persona).mockResolvedValue({ personaId: "default", segments: [] });

    const { result } = renderHook(() => useCurrentPersona(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.sdui.persona).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCurrentPersona(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
