import { describe, it, expect } from "vitest";
import {
  STEP_ORDER,
  STEP_LABEL_KEYS,
  loanTypeIcon,
  LOAN_TYPE_LABEL_KEYS,
  EMPLOYMENT_STATUS_KEYS,
  LOAN_PURPOSE_KEYS,
  US_STATES,
  INITIAL_FORM,
} from "../loan-application/constants";

describe("Loan Application Constants", () => {
  it("STEP_ORDER has all steps", () => {
    expect(STEP_ORDER).toContain("select-product");
    expect(STEP_ORDER).toContain("personal-info");
    expect(STEP_ORDER).toContain("employment");
    expect(STEP_ORDER).toContain("loan-details");
    expect(STEP_ORDER).toContain("documents");
    expect(STEP_ORDER).toContain("review");
    expect(STEP_ORDER).toContain("submitted");
    expect(STEP_ORDER.length).toBe(7);
  });

  it("STEP_LABEL_KEYS has keys for all steps", () => {
    STEP_ORDER.forEach((step) => {
      expect(STEP_LABEL_KEYS[step]).toBeDefined();
    });
  });

  describe("loanTypeIcon", () => {
    it("returns icon for auto", () => {
      expect(loanTypeIcon("auto")).toBeDefined();
    });
    it("returns icon for mortgage", () => {
      expect(loanTypeIcon("mortgage")).toBeDefined();
    });
    it("returns icon for heloc", () => {
      expect(loanTypeIcon("heloc")).toBeDefined();
    });
    it("returns icon for student", () => {
      expect(loanTypeIcon("student")).toBeDefined();
    });
    it("returns icon for business", () => {
      expect(loanTypeIcon("business")).toBeDefined();
    });
    it("returns default icon for unknown", () => {
      expect(loanTypeIcon("unknown")).toBeDefined();
    });
    it("returns different icons for different types", () => {
      const auto = loanTypeIcon("auto");
      const mortgage = loanTypeIcon("mortgage");
      expect(auto).not.toBe(mortgage);
    });
  });

  it("LOAN_TYPE_LABEL_KEYS has entries", () => {
    expect(LOAN_TYPE_LABEL_KEYS.personal).toBeDefined();
    expect(LOAN_TYPE_LABEL_KEYS.auto).toBeDefined();
    expect(LOAN_TYPE_LABEL_KEYS.mortgage).toBeDefined();
  });

  it("EMPLOYMENT_STATUS_KEYS has entries", () => {
    expect(EMPLOYMENT_STATUS_KEYS.length).toBeGreaterThan(0);
    EMPLOYMENT_STATUS_KEYS.forEach((entry) => {
      expect(entry.value).toBeDefined();
      expect(entry.labelKey).toBeDefined();
    });
  });

  it("LOAN_PURPOSE_KEYS has entries for each loan type", () => {
    expect(LOAN_PURPOSE_KEYS.personal).toBeDefined();
    expect(LOAN_PURPOSE_KEYS.auto).toBeDefined();
    expect(LOAN_PURPOSE_KEYS.mortgage).toBeDefined();
    expect(LOAN_PURPOSE_KEYS.personal.length).toBeGreaterThan(0);
  });

  it("US_STATES has 51 entries", () => {
    expect(US_STATES.length).toBe(51);
  });

  it("INITIAL_FORM has expected defaults", () => {
    expect(INITIAL_FORM.selectedProductId).toBe("");
    expect(INITIAL_FORM.firstName).toBe("");
    expect(INITIAL_FORM.hasCoApplicant).toBe(false);
    expect(INITIAL_FORM.termMonths).toBe("");
  });
});
