import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useAIChat", () => ({
  useAIChat: () => ({
    messages: [],
    sendMessage: vi.fn(),
    clearChat: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("@/components/common/Spinner", () => ({
  Spinner: () => <span data-testid="spinner">Loading</span>,
}));

// scrollIntoView is not implemented in jsdom
Element.prototype.scrollIntoView = vi.fn();

import { ChatWidget } from "../ChatWidget";

describe("ChatWidget", () => {
  it("renders the floating trigger button", () => {
    render(<ChatWidget />);
    // The trigger button is always visible
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("opens chat panel when trigger is clicked", () => {
    render(<ChatWidget />);
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);
    expect(screen.getByText("Banking Assistant")).toBeTruthy();
  });

  it("shows empty state message when no messages exist", () => {
    render(<ChatWidget />);
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);
    expect(screen.getByText("How can I help you today?")).toBeTruthy();
  });

  it("renders input field when chat is open", () => {
    render(<ChatWidget />);
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);
    expect(screen.getByPlaceholderText("Type a message...")).toBeTruthy();
  });
});
