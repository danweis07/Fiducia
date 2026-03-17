import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/lib/gateway", () => ({
  gateway: {
    sdui: {
      manifests: {
        list: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        update: vi.fn(),
      },
      personas: {
        list: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
      },
    },
  },
}));

vi.mock("@/components/common/Spinner", () => ({
  Spinner: () => createElement("div", null, "Loading..."),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("ScreenManifests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: Component } = await import("../admin/ScreenManifests");
    const { container } = render(createElement(Component), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });
});
