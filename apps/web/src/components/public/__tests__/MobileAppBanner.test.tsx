import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";

// The component checks localStorage and window.innerWidth in useEffect,
// so by default it won't render (visible starts as false and only becomes
// true on mobile when not dismissed). We test that it renders null by default.

beforeEach(() => {
  localStorage.clear();
});

import { MobileAppBanner } from "../MobileAppBanner";

describe("MobileAppBanner", () => {
  it("renders nothing on non-mobile viewport (default)", () => {
    // window.innerWidth is typically > 768 in jsdom
    const { container } = render(createElement(MobileAppBanner));
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when previously dismissed", () => {
    localStorage.setItem("app_banner_dismissed", Date.now().toString());
    Object.defineProperty(window, "innerWidth", { value: 400, writable: true });
    const { container } = render(createElement(MobileAppBanner));
    expect(container.innerHTML).toBe("");
    // Reset
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
  });
});
