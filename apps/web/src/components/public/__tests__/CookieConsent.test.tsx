import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

// Clear localStorage before each test so the banner shows
beforeEach(() => {
  localStorage.clear();
});

import { CookieConsentProvider, CookieConsent } from "../CookieConsent";

function renderWithProvider() {
  return render(
    createElement(
      MemoryRouter,
      null,
      createElement(CookieConsentProvider, null, createElement(CookieConsent)),
    ),
  );
}

describe("CookieConsent", () => {
  it("renders without crashing", () => {
    renderWithProvider();
    expect(screen.getByText("Cookie Preferences")).toBeTruthy();
  });

  it("shows accept and reject buttons", () => {
    renderWithProvider();
    expect(screen.getByText("Accept All")).toBeTruthy();
    expect(screen.getByText("Reject Non-Essential")).toBeTruthy();
  });

  it("shows manage preferences button", () => {
    renderWithProvider();
    expect(screen.getByText("Manage Preferences")).toBeTruthy();
  });
});
