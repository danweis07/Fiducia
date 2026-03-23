import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

import { SkipLink } from "../SkipLink";

describe("SkipLink", () => {
  it("renders skip link with default target", () => {
    render(<SkipLink />);
    const link = screen.getByText("a11y.skipToContent");
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("#main-content");
  });

  it("renders skip link with custom target", () => {
    render(<SkipLink targetId="custom-content" />);
    const link = screen.getByText("a11y.skipToContent");
    expect(link.getAttribute("href")).toBe("#custom-content");
  });
});
