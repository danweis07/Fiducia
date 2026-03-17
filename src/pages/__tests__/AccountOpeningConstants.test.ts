import { describe, it, expect } from "vitest";
import {
  STEP_ORDER,
  STEP_LABEL_KEYS,
  US_STATES,
  INITIAL_FORM,
  productTypeIcon,
  PRODUCT_TYPE_BADGE_KEYS,
} from "../account-opening/constants";

describe("Account Opening Constants", () => {
  it("STEP_ORDER has all steps", () => {
    expect(STEP_ORDER).toContain("welcome");
    expect(STEP_ORDER).toContain("products");
    expect(STEP_ORDER).toContain("personal");
    expect(STEP_ORDER).toContain("review");
    expect(STEP_ORDER).toContain("processing");
    expect(STEP_ORDER).toContain("funding");
    expect(STEP_ORDER).toContain("confirmation");
    expect(STEP_ORDER.length).toBe(7);
  });

  it("STEP_LABEL_KEYS has keys for all steps", () => {
    STEP_ORDER.forEach((step) => {
      expect(STEP_LABEL_KEYS[step]).toBeDefined();
    });
  });

  it("US_STATES has 51 entries", () => {
    expect(US_STATES.length).toBe(51);
    expect(US_STATES).toContain("CA");
    expect(US_STATES).toContain("NY");
    expect(US_STATES).toContain("DC");
  });

  it("INITIAL_FORM has default empty values", () => {
    expect(INITIAL_FORM.firstName).toBe("");
    expect(INITIAL_FORM.lastName).toBe("");
    expect(INITIAL_FORM.selectedProductIds).toEqual([]);
    expect(INITIAL_FORM.fundingMethod).toBe("");
  });

  describe("productTypeIcon", () => {
    it("returns correct icon for checking", () => {
      const icon = productTypeIcon("checking");
      expect(icon).toBeDefined();
    });

    it("returns correct icon for savings", () => {
      const icon = productTypeIcon("savings");
      expect(icon).toBeDefined();
    });

    it("returns correct icon for money_market", () => {
      const icon = productTypeIcon("money_market");
      expect(icon).toBeDefined();
    });

    it("returns correct icon for cd", () => {
      const icon = productTypeIcon("cd");
      expect(icon).toBeDefined();
    });

    it("returns default icon for unknown type", () => {
      const icon = productTypeIcon("unknown");
      expect(icon).toBeDefined();
    });

    it("returns different icons for different types", () => {
      const checking = productTypeIcon("checking");
      const savings = productTypeIcon("savings");
      const moneyMarket = productTypeIcon("money_market");
      const cd = productTypeIcon("cd");
      // savings should differ from checking
      expect(savings).not.toBe(checking);
      // cd should differ from money_market
      expect(cd).not.toBe(moneyMarket);
    });
  });

  it("PRODUCT_TYPE_BADGE_KEYS has expected keys", () => {
    expect(PRODUCT_TYPE_BADGE_KEYS.checking).toBeDefined();
    expect(PRODUCT_TYPE_BADGE_KEYS.savings).toBeDefined();
    expect(PRODUCT_TYPE_BADGE_KEYS.money_market).toBeDefined();
    expect(PRODUCT_TYPE_BADGE_KEYS.cd).toBeDefined();
  });
});
