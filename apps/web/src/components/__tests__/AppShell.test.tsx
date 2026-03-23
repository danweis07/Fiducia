import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/Header", () => ({
  Header: () => createElement("header", { "data-testid": "header" }, "Header"),
}));

vi.mock("@/components/MobileBottomNav", () => ({
  MobileBottomNav: () => createElement("nav", { "data-testid": "mobile-nav" }, "Nav"),
}));

vi.mock("@/components/common/OfflineBanner", () => ({
  OfflineBanner: () => null,
}));

vi.mock("@/components/common/ChatWidget", () => ({
  ChatWidget: () => null,
}));

import { AppShell } from "../AppShell";

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(MemoryRouter, null, children);
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when provided", () => {
    const { getByText } = render(
      createElement(AppShell, null, createElement("div", null, "Child Content")),
      { wrapper },
    );
    expect(getByText("Child Content")).toBeTruthy();
  });

  it("renders header and mobile nav", () => {
    const { getByTestId } = render(
      createElement(AppShell, null, createElement("div", null, "Content")),
      { wrapper },
    );
    expect(getByTestId("header")).toBeTruthy();
    expect(getByTestId("mobile-nav")).toBeTruthy();
  });
});
