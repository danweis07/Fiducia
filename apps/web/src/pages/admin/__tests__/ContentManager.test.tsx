import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    cms: {
      listContent: vi.fn().mockResolvedValue({ content: [] }),
      listChannels: vi.fn().mockResolvedValue({ channels: [] }),
      createContent: vi.fn().mockResolvedValue({}),
      updateContent: vi.fn().mockResolvedValue({}),
      publishContent: vi.fn().mockResolvedValue({}),
      archiveContent: vi.fn().mockResolvedValue({}),
      deleteContent: vi.fn().mockResolvedValue({}),
    },
  },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("ContentManager", () => {
  it("renders without crashing", async () => {
    const { default: ContentManager } = await import("../ContentManager");
    const { container } = render(createElement(ContentManager), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("shows the page heading after loading", async () => {
    const { default: ContentManager } = await import("../ContentManager");
    render(createElement(ContentManager), { wrapper: createWrapper() });
    expect(await screen.findByText("Content Manager")).toBeTruthy();
  });

  it("shows the New Content button after loading", async () => {
    const { default: ContentManager } = await import("../ContentManager");
    render(createElement(ContentManager), { wrapper: createWrapper() });
    expect(await screen.findByText("New Content")).toBeTruthy();
  });

  it("shows stat cards after loading", async () => {
    const { default: ContentManager } = await import("../ContentManager");
    render(createElement(ContentManager), { wrapper: createWrapper() });
    expect(await screen.findByText("Published")).toBeTruthy();
    expect(screen.getByText("Drafts")).toBeTruthy();
    expect(screen.getByText("Scheduled")).toBeTruthy();
  });
});
