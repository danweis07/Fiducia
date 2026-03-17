import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { AIMetaTags } from "../AIMetaTags";

describe("AIMetaTags", () => {
  it("renders null (no visible output)", () => {
    const { container } = render(createElement(AIMetaTags));
    expect(container.innerHTML).toBe("");
  });

  it("injects robots meta tag into document head", () => {
    render(createElement(AIMetaTags));
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots).toBeTruthy();
    expect(robots!.getAttribute("content")).toContain("index, follow");
  });

  it("injects ai:site-type meta tag", () => {
    render(createElement(AIMetaTags));
    const siteType = document.querySelector('meta[name="ai:site-type"]');
    expect(siteType).toBeTruthy();
    expect(siteType!.getAttribute("content")).toBe("credit-union-website");
  });

  it("injects link to llms.txt", () => {
    render(createElement(AIMetaTags));
    const link = document.querySelector('link[rel="ai-content"]');
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/llms.txt");
  });
});
