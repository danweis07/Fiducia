import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/public/PublicShell", () => ({
  PublicShell: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-testid": "public-shell" }, children),
}));

vi.mock("@/components/public/SEOHead", () => ({
  SEOHead: () => null,
}));

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(MemoryRouter, null, children);
}

import ContactPage from "../ContactPage";

describe("ContactPage", () => {
  it("renders without crashing", () => {
    render(createElement(ContactPage), { wrapper: createWrapper() });
    expect(screen.getByText("Contact Us")).toBeTruthy();
  });

  it("shows contact methods", () => {
    render(createElement(ContactPage), { wrapper: createWrapper() });
    expect(screen.getByText("(800) 555-0199")).toBeTruthy();
    expect(screen.getByText("support@example-cu.org")).toBeTruthy();
  });

  it("shows emergency contacts section", () => {
    render(createElement(ContactPage), { wrapper: createWrapper() });
    expect(screen.getByText("Report Fraud")).toBeTruthy();
    expect(screen.getByText("Lost or Stolen Card")).toBeTruthy();
  });

  it("shows appointment booking section", () => {
    render(createElement(ContactPage), { wrapper: createWrapper() });
    expect(screen.getByText("Book an Appointment")).toBeTruthy();
  });

  it("shows banking details section", () => {
    render(createElement(ContactPage), { wrapper: createWrapper() });
    expect(screen.getByText("Banking Details")).toBeTruthy();
    expect(screen.getByText("021000021")).toBeTruthy();
    expect(screen.getByText("WFCUUS33")).toBeTruthy();
  });

  it("shows social media section", () => {
    render(createElement(ContactPage), { wrapper: createWrapper() });
    expect(screen.getByText("Connect with Us")).toBeTruthy();
  });
});
