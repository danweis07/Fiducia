import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({}),
    sso: {
      list: vi.fn().mockResolvedValue({ providers: [] }),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      test: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => createElement("div", null, "Loading..."),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

import SSOConfiguration from "../SSOConfiguration";

describe("SSOConfiguration", () => {
  it("renders without crashing", async () => {
    render(createElement(SSOConfiguration), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Single Sign-On")).toBeTruthy();
    });
  });

  it("shows the description text", async () => {
    render(createElement(SSOConfiguration), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(
        screen.getByText("Configure SAML or OIDC identity provider integration."),
      ).toBeTruthy();
    });
  });

  it("shows no SSO configured badge by default", async () => {
    render(createElement(SSOConfiguration), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("No SSO Configured")).toBeTruthy();
    });
  });

  it("renders SAML and OIDC tabs", async () => {
    render(createElement(SSOConfiguration), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText("SAML 2.0").length).toBeGreaterThan(0);
      expect(screen.getAllByText("OpenID Connect").length).toBeGreaterThan(0);
    });
  });
});
