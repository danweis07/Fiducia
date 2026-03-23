import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { StructuredData, OrganizationSchema, BreadcrumbSchema } from "../StructuredData";

afterEach(() => {
  cleanup();
  // Clean up any script tags added to head
  document.head.querySelectorAll("script[data-structured]").forEach((el) => el.remove());
});

describe("StructuredData", () => {
  it("injects JSON-LD script into document head", () => {
    render(<StructuredData type="Product" data={{ name: "Savings Account" }} />);
    const script = document.head.querySelector('script[data-structured="Product"]');
    expect(script).not.toBeNull();
    expect(script?.getAttribute("type")).toBe("application/ld+json");
  });

  it("includes @context and @type", () => {
    render(<StructuredData type="WebPage" data={{ name: "Home" }} />);
    const script = document.head.querySelector('script[data-structured="WebPage"]');
    const json = JSON.parse(script?.textContent ?? "{}");
    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@type"]).toBe("WebPage");
    expect(json.name).toBe("Home");
  });

  it("attaches publisher for WebPage type", () => {
    render(<StructuredData type="WebPage" data={{ name: "About" }} />);
    const script = document.head.querySelector('script[data-structured="WebPage"]');
    const json = JSON.parse(script?.textContent ?? "{}");
    expect(json.publisher).toBeDefined();
    expect(json.publisher["@type"]).toBe("CreditUnion");
  });

  it("does not attach publisher for non-page types", () => {
    render(<StructuredData type="Event" data={{ name: "Webinar" }} />);
    const script = document.head.querySelector('script[data-structured="Event"]');
    const json = JSON.parse(script?.textContent ?? "{}");
    expect(json.publisher).toBeUndefined();
  });

  it("cleans up script on unmount", () => {
    const { unmount } = render(<StructuredData type="Product" data={{ name: "Test" }} />);
    expect(document.head.querySelector('script[data-structured="Product"]')).not.toBeNull();
    unmount();
    expect(document.head.querySelector('script[data-structured="Product"]')).toBeNull();
  });
});

describe("OrganizationSchema", () => {
  it("renders CreditUnion structured data", () => {
    render(<OrganizationSchema />);
    const script = document.head.querySelector('script[data-structured="CreditUnion"]');
    expect(script).not.toBeNull();
    const json = JSON.parse(script?.textContent ?? "{}");
    expect(json.name).toBe("Demo Credit Union");
  });
});

describe("BreadcrumbSchema", () => {
  it("renders breadcrumb list", () => {
    render(
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ]}
      />,
    );
    const script = document.head.querySelector('script[data-structured="BreadcrumbList"]');
    const json = JSON.parse(script?.textContent ?? "{}");
    expect(json.itemListElement).toHaveLength(2);
    expect(json.itemListElement[0].position).toBe(1);
    expect(json.itemListElement[1].name).toBe("About");
  });
});
