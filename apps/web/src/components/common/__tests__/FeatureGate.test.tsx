import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

const mockTenant = {
  features: { wires: true, p2p: false } as Record<string, boolean>,
  region: "us" as string,
};

vi.mock("@/contexts/TenantContext", () => ({
  useAuth: () => ({ tenant: mockTenant }),
}));

import { FeatureGate } from "../FeatureGate";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FeatureGate", () => {
  it("renders children when feature is enabled", () => {
    render(
      createElement(
        FeatureGate,
        { feature: "wires" as unknown },
        createElement("span", null, "Wire Transfer"),
      ),
    );
    expect(screen.getByText("Wire Transfer")).toBeTruthy();
  });

  it("renders fallback when feature is disabled", () => {
    render(
      createElement(
        FeatureGate,
        { feature: "p2p" as unknown, fallback: createElement("span", null, "Upgrade") },
        createElement("span", null, "P2P Transfers"),
      ),
    );
    expect(screen.queryByText("P2P Transfers")).toBeNull();
    expect(screen.getByText("Upgrade")).toBeTruthy();
  });

  it("renders children when region matches", () => {
    render(
      createElement(
        FeatureGate,
        { region: "us" as unknown },
        createElement("span", null, "US Content"),
      ),
    );
    expect(screen.getByText("US Content")).toBeTruthy();
  });

  it("renders fallback when region does not match", () => {
    render(
      createElement(
        FeatureGate,
        { region: "eu" as unknown },
        createElement("span", null, "EU Content"),
      ),
    );
    expect(screen.queryByText("EU Content")).toBeNull();
  });

  it("renders children when no feature or region specified", () => {
    render(createElement(FeatureGate, {}, createElement("span", null, "Always Visible")));
    expect(screen.getByText("Always Visible")).toBeTruthy();
  });
});
