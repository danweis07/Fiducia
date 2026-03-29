import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      mode: "system",
      layout: "classic",
      font: "inter",
      primaryColor: "215 50% 25%",
      secondaryColor: "40 10% 94%",
      accentColor: "38 75% 50%",
      borderRadius: "md",
      highContrast: false,
      reducedMotion: false,
    },
    resolvedMode: "light" as const,
    setTenantDesignSystem: vi.fn(),
    tenantDesignSystem: null,
    setTheme: vi.fn(),
    updateTheme: vi.fn(),
    resetTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) =>
    createElement("div", null, children),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

import BrandingEditor from "../BrandingEditor";

describe("BrandingEditor", () => {
  it("renders without crashing", async () => {
    render(createElement(BrandingEditor), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Design System")).toBeTruthy();
    });
  });

  it("shows easy mode and advanced mode tabs", async () => {
    render(createElement(BrandingEditor), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Easy Mode")).toBeTruthy();
      expect(screen.getByText("Advanced")).toBeTruthy();
    });
  });

  it("renders the save button", async () => {
    render(createElement(BrandingEditor), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Save & Publish")).toBeTruthy();
    });
  });
});
