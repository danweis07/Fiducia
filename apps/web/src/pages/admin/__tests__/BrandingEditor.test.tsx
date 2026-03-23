import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

import BrandingEditor from "../BrandingEditor";

describe("BrandingEditor", () => {
  it("renders without crashing", () => {
    render(createElement(BrandingEditor), { wrapper: createWrapper() });
    expect(screen.getByText("Branding")).toBeTruthy();
  });

  it("shows the description text", () => {
    render(createElement(BrandingEditor), { wrapper: createWrapper() });
    expect(screen.getByText("Customize the look and feel for your customers.")).toBeTruthy();
  });

  it("renders color and typography sections", () => {
    render(createElement(BrandingEditor), { wrapper: createWrapper() });
    expect(screen.getByText("Colors")).toBeTruthy();
    expect(screen.getByText("Typography")).toBeTruthy();
    expect(screen.getByText("Preview")).toBeTruthy();
  });
});
