import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageSelector } from "../LanguageSelector";

vi.mock("@/contexts/TenantContext", () => ({
  useAuth: vi.fn(() => ({
    tenant: { region: "us" },
  })),
}));

describe("LanguageSelector", () => {
  it("renders the language label", () => {
    render(<LanguageSelector />);
    expect(screen.getByText("Language")).toBeTruthy();
  });

  it("renders the language description", () => {
    const { container } = render(<LanguageSelector />);
    // The component renders t('languageDesc') from the settings namespace
    const desc = container.querySelector("p.text-xs");
    expect(desc).toBeTruthy();
    expect(desc!.textContent).toBeTruthy();
  });

  it("renders a select trigger", () => {
    render(<LanguageSelector />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("renders select groups for language regions", async () => {
    const { container } = render(<LanguageSelector />);
    // Open the select dropdown by clicking on the trigger
    const trigger = screen.getByRole("combobox");
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(trigger);
    // After opening, SelectGroup elements with role="group" should appear in the document
    const groups = document.querySelectorAll("[role='group']");
    expect(groups.length).toBeGreaterThan(0);
  });
});
