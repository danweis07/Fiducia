import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: vi.fn(() => ({ handleError: vi.fn() })),
}));

vi.mock("@/hooks/useCards", () => ({
  useCards: vi.fn(() => ({ data: { cards: [] } })),
}));

vi.mock("@/hooks/useCardServices", () => ({
  useTravelNotices: vi.fn(() => ({ data: { notices: [] }, isLoading: false, error: null })),
  useCreateTravelNotice: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCancelTravelNotice: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCardReplacements: vi.fn(() => ({ data: { replacements: [] }, isLoading: false, error: null })),
  useRequestCardReplacement: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useActivateReplacementCard: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("CardServices", () => {
  it("renders without crashing", async () => {
    const { default: CardServices } = await import("../CardServices");
    const { container } = render(createElement(CardServices), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("shows the page heading", async () => {
    const { default: CardServices } = await import("../CardServices");
    render(createElement(CardServices), { wrapper: createWrapper() });
    expect(screen.getByText("Card Services")).toBeTruthy();
  });

  it("shows travel notices and card replacement tabs", async () => {
    const { default: CardServices } = await import("../CardServices");
    render(createElement(CardServices), { wrapper: createWrapper() });
    expect(screen.getByText("Travel Notices")).toBeTruthy();
    expect(screen.getByText("Card Replacement")).toBeTruthy();
  });
});
