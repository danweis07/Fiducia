import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/components/public/PublicShell", () => ({
  PublicShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/public/SEOHead", () => ({
  SEOHead: () => null,
}));

import LoansPage from "../LoansPage";

describe("LoansPage", () => {
  it("renders loan products", () => {
    render(<LoansPage />);
    expect(screen.getByText("Loans for Every Need")).toBeTruthy();
  });
});
