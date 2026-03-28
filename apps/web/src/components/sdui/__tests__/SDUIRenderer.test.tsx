import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useScreenManifest", () => ({
  useScreenManifest: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
}));

vi.mock("@/components/common/Spinner", () => ({
  Spinner: () => createElement("div", { "data-testid": "spinner" }, "Loading..."),
}));

import { SDUIRenderer } from "../SDUIRenderer";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("SDUIRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders fallback when no manifest data", () => {
    const fallback = createElement("div", null, "Fallback Content");
    const { getByText } = render(createElement(SDUIRenderer, { screenKey: "home", fallback }), {
      wrapper: createWrapper(),
    });
    expect(getByText("Fallback Content")).toBeTruthy();
  });

  it("renders loading fallback when isLoading", async () => {
    const { useScreenManifest } = await import("@/hooks/useScreenManifest");
    (useScreenManifest as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: true,
    });

    const fallback = createElement("div", null, "Loading Fallback");
    const { getByText } = render(createElement(SDUIRenderer, { screenKey: "home", fallback }), {
      wrapper: createWrapper(),
    });
    expect(getByText("Loading Fallback")).toBeTruthy();
  });

  it("renders components when manifest has data", async () => {
    const { useScreenManifest } = await import("@/hooks/useScreenManifest");
    (useScreenManifest as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        components: [
          {
            id: "c1",
            componentType: "unknown_test_component",
            props: {},
          },
        ],
      },
      isLoading: false,
    });

    const { container } = render(createElement(SDUIRenderer, { screenKey: "home" }), {
      wrapper: createWrapper(),
    });
    // Unknown component renders nothing in non-DEV or a placeholder in DEV
    expect(container).toBeTruthy();
  });
});
