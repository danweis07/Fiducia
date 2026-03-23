import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AccountCard, accountStatusVariant } from "../AccountCard";

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
}));

const defaultProps = {
  id: "acc-1",
  type: "checking",
  nickname: "My Checking",
  accountNumberMasked: "****1234",
  balanceCents: 150000,
  availableBalanceCents: 145000,
  status: "active",
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <AccountCard {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

describe("AccountCard", () => {
  it("renders account type and masked number", () => {
    renderCard();
    // Account type and masked number appear together in the CardDescription
    expect(screen.getByText(/checking \*\*\*\*1234/i)).toBeTruthy();
  });

  it("renders nickname when provided", () => {
    renderCard();
    expect(screen.getByText("My Checking")).toBeTruthy();
  });

  it("renders formatted balance", () => {
    renderCard();
    expect(screen.getByText("$1500.00")).toBeTruthy();
    expect(screen.getByText(/Available.*\$1450\.00/)).toBeTruthy();
  });

  it("renders status badge", () => {
    renderCard();
    expect(screen.getByText("active")).toBeTruthy();
  });

  it("renders as a link by default", () => {
    renderCard();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/accounts/acc-1");
  });

  it("renders without link when linkable=false", () => {
    renderCard({ linkable: false });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("handles missing nickname gracefully", () => {
    renderCard({ nickname: null });
    expect(screen.queryByText("My Checking")).toBeNull();
  });

  it("renders different account types", () => {
    renderCard({ type: "savings" });
    expect(screen.getByText(/savings/i)).toBeTruthy();
  });
});

describe("accountStatusVariant", () => {
  it("returns secondary for active", () => {
    expect(accountStatusVariant("active")).toBe("secondary");
  });

  it("returns destructive for frozen", () => {
    expect(accountStatusVariant("frozen")).toBe("destructive");
  });

  it("returns outline for other statuses", () => {
    expect(accountStatusVariant("closed")).toBe("outline");
    expect(accountStatusVariant("pending")).toBe("outline");
  });
});
