import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
  }),
}));

vi.mock("@/lib/i18n", () => ({
  getLanguageDir: vi.fn().mockReturnValue("ltr"),
}));

import { useLocale } from "../useLocale";

describe("useLocale", () => {
  it("returns locale", () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe("en");
  });

  it("returns direction", () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.dir).toBe("ltr");
  });

  it("provides formatNumber function", () => {
    const { result } = renderHook(() => useLocale());
    expect(typeof result.current.formatNumber).toBe("function");

    const formatted = result.current.formatNumber(1234.56);
    expect(formatted).toBeDefined();
  });

  it("provides formatDate function", () => {
    const { result } = renderHook(() => useLocale());
    expect(typeof result.current.formatDate).toBe("function");

    const formatted = result.current.formatDate(new Date("2026-01-15"));
    expect(formatted).toBeDefined();
  });

  it("formatDate handles string dates", () => {
    const { result } = renderHook(() => useLocale());
    const formatted = result.current.formatDate("2026-01-15");
    expect(formatted).toBeDefined();
  });
});
