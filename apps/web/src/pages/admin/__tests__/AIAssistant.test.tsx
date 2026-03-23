import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    ai: {
      listPrompts: vi.fn().mockResolvedValue({ prompts: [] }),
      updatePrompt: vi.fn().mockResolvedValue({}),
      chat: vi.fn().mockResolvedValue({ reply: "" }),
    },
    request: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock("@/components/common/Spinner", () => ({
  Spinner: ({ size: _size }: { size?: string }) => createElement("div", null, "Loading..."),
}));

vi.mock("@/components/common/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => createElement("div", null, title),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

import AIAssistant from "../AIAssistant";

describe("AIAssistant", () => {
  it("renders without crashing", async () => {
    render(createElement(AIAssistant), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("AI Assistant")).toBeTruthy();
    });
  });

  it("shows the description text", async () => {
    render(createElement(AIAssistant), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(
        screen.getByText("Manage system prompts, test responses, and review escalations."),
      ).toBeTruthy();
    });
  });

  it("renders tab triggers", async () => {
    render(createElement(AIAssistant), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Prompts")).toBeTruthy();
      expect(screen.getByText("Test Console")).toBeTruthy();
      expect(screen.getByText("Escalations")).toBeTruthy();
    });
  });

  it("shows empty state when no prompts are configured", async () => {
    render(createElement(AIAssistant), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("No prompts configured")).toBeTruthy();
    });
  });
});
