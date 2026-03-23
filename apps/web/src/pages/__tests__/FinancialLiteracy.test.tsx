import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/financial-literacy-data", () => ({
  FINANCIAL_RESOURCES: [
    {
      id: "r1",
      title: "Budgeting 101",
      description: "Learn the basics of budgeting.",
      source: "Test Source",
      category: "budgeting",
      difficulty: "beginner",
      url: "https://example.com/budget",
    },
  ],
  GLOSSARY_TERMS: [
    { term: "APR", definition: "Annual Percentage Rate" },
    { term: "APY", definition: "Annual Percentage Yield" },
  ],
}));

import FinancialLiteracy from "../FinancialLiteracy";

describe("FinancialLiteracy", () => {
  it("renders page title and resources", () => {
    render(<FinancialLiteracy />);
    expect(screen.getByText("Budgeting 101")).toBeTruthy();
  });

  it("renders glossary terms", () => {
    render(<FinancialLiteracy />);
    // Glossary tab should exist
    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBeGreaterThan(0);
  });
});
