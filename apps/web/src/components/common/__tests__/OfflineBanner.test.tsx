import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

let mockOnline = true;

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => mockOnline,
}));

import { OfflineBanner } from "../OfflineBanner";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OfflineBanner", () => {
  it("renders nothing when online", () => {
    mockOnline = true;
    const { container } = render(<OfflineBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("renders offline message when offline", () => {
    mockOnline = false;
    render(<OfflineBanner />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/You are offline/)).toBeTruthy();
  });
});
