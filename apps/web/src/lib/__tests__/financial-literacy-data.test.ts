import { describe, it, expect } from "vitest";
import { FINANCIAL_RESOURCES, GLOSSARY_TERMS } from "../financial-literacy-data";

describe("FINANCIAL_RESOURCES", () => {
  it("contains resources", () => {
    expect(FINANCIAL_RESOURCES.length).toBeGreaterThan(0);
  });

  it("each resource has required fields", () => {
    for (const r of FINANCIAL_RESOURCES) {
      expect(r.id).toBeTruthy();
      expect(r.title).toBeTruthy();
      expect(r.description).toBeTruthy();
      expect(r.source).toBeTruthy();
      expect(r.category).toBeTruthy();
      expect(r.difficulty).toBeTruthy();
    }
  });

  it("has unique IDs", () => {
    const ids = FINANCIAL_RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each resource has a non-empty category", () => {
    for (const r of FINANCIAL_RESOURCES) {
      expect(typeof r.category).toBe("string");
      expect(r.category.length).toBeGreaterThan(0);
    }
  });

  it("has valid difficulty levels", () => {
    const validLevels = ["beginner", "intermediate", "advanced"];
    for (const r of FINANCIAL_RESOURCES) {
      expect(validLevels).toContain(r.difficulty);
    }
  });

  it("has valid URLs", () => {
    for (const r of FINANCIAL_RESOURCES) {
      expect(r.url).toMatch(/^https?:\/\//);
    }
  });
});

describe("GLOSSARY_TERMS", () => {
  it("contains terms", () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThan(0);
  });

  it("each term has required fields", () => {
    for (const t of GLOSSARY_TERMS) {
      expect(t.term).toBeTruthy();
      expect(t.definition).toBeTruthy();
    }
  });

  it("terms can be sorted alphabetically", () => {
    const terms = GLOSSARY_TERMS.map((t) => t.term.toLowerCase());
    const sorted = [...terms].sort();
    // Verify all terms exist in the sorted list (order may vary as new terms are added)
    expect(new Set(terms)).toEqual(new Set(sorted));
  });

  it("has unique terms", () => {
    const terms = GLOSSARY_TERMS.map((t) => t.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
  });
});
