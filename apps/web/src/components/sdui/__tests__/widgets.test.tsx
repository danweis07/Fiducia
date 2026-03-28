import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("react-router-dom", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { href: to, ...rest }, children),
  useNavigate: () => vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: () => ({
    data: {
      accounts: [
        { id: "a1", nickname: "Checking", accountType: "checking", balanceCents: 150000 },
        { id: "a2", nickname: "Savings", accountType: "savings", balanceCents: 250000 },
      ],
    },
  }),
}));

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: () => ({
    data: { transactions: [] },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useLoans", () => ({
  useLoans: () => ({
    data: {
      loans: [
        { id: "l1", productName: "Auto Loan", status: "active", outstandingBalanceCents: 1200000 },
      ],
    },
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === "cms") {
      return { data: { content: { title: "CMS Title", body: "<p>CMS Body</p>" } } };
    }
    if (queryKey[0] === "goals") {
      return { data: { activeGoals: 2, totalSavedCents: 500000, totalTargetCents: 1000000 } };
    }
    if (queryKey[0] === "financial" && queryKey[1] === "spending") {
      return {
        data: {
          totalSpendingCents: 300000,
          byCategory: [
            { category: "Food", totalCents: 100000, percentOfTotal: 33 },
            { category: "Transport", totalCents: 80000, percentOfTotal: 27 },
          ],
        },
      };
    }
    if (queryKey[0] === "financial" && queryKey[1] === "networth") {
      return {
        data: { netWorthCents: 5000000, totalAssetsCents: 7000000, totalLiabilitiesCents: 2000000 },
      };
    }
    if (queryKey[0] === "billpay") {
      return {
        data: {
          payees: [
            {
              payeeId: "p1",
              billerName: "Electric Co",
              nextDueDate: "2026-04-01",
              nextAmountDueCents: 15000,
            },
            {
              payeeId: "p2",
              billerName: "Internet Inc",
              nextDueDate: "2026-04-05",
              nextAmountDueCents: 7500,
            },
          ],
        },
      };
    }
    return { data: null };
  }),
}));

vi.mock("@/lib/gateway", () => ({
  gateway: {
    cms: { getPublicContent: vi.fn() },
    savingsGoals: { summary: vi.fn() },
    financial: { spending: vi.fn(), netWorth: vi.fn() },
    billpay: { listPayees: vi.fn() },
  },
}));

vi.mock("@/lib/common/currency", () => ({
  formatCurrency: (cents: number) => `$${(cents / 100).toFixed(2)}`,
}));

vi.mock("dompurify", () => ({
  default: { sanitize: (html: string) => html },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseManifest = { componentType: "test", id: "test-1", props: {}, order: 0 };

function makeManifest(props: Record<string, unknown>) {
  return { ...baseManifest, props };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SDUI Widgets", () => {
  // 1. Spacer
  it("Spacer renders div with height style", async () => {
    const { default: Spacer } = await import("../widgets/Spacer");
    const { container } = render(createElement(Spacer, { manifest: makeManifest({ height: 48 }) }));
    const div = container.querySelector("div");
    expect(div).toBeTruthy();
    expect(div!.style.height).toBe("48px");
  });

  // 2. SectionHeader
  it("SectionHeader renders title text", async () => {
    const { default: SectionHeader } = await import("../widgets/SectionHeader");
    render(
      createElement(SectionHeader, { manifest: makeManifest({ title: "Accounts Overview" }) }),
    );
    expect(screen.getByText("Accounts Overview")).toBeTruthy();
  });

  it("SectionHeader renders subtitle when provided", async () => {
    const { default: SectionHeader } = await import("../widgets/SectionHeader");
    render(
      createElement(SectionHeader, {
        manifest: makeManifest({ title: "Title", subtitle: "Subtitle text" }),
      }),
    );
    expect(screen.getByText("Subtitle text")).toBeTruthy();
  });

  // 3. CTAButton
  it("CTAButton renders link with label text", async () => {
    const { default: CTAButton } = await import("../widgets/CTAButton");
    render(
      createElement(CTAButton, { manifest: makeManifest({ label: "Apply Now", link: "/apply" }) }),
    );
    const link = screen.getByText("Apply Now");
    expect(link).toBeTruthy();
    expect(link.closest("a")!.getAttribute("href")).toBe("/apply");
  });

  // 4. FinancialTip
  it("FinancialTip renders title and body text", async () => {
    const { default: FinancialTip } = await import("../widgets/FinancialTip");
    render(
      createElement(FinancialTip, {
        manifest: makeManifest({ title: "Save More", body: "Try automating transfers." }),
      }),
    );
    expect(screen.getByText("Save More")).toBeTruthy();
    expect(screen.getByText("Try automating transfers.")).toBeTruthy();
  });

  // 5. AnnouncementBar
  it("AnnouncementBar renders message and dismiss button", async () => {
    const { default: AnnouncementBar } = await import("../widgets/AnnouncementBar");
    const { container } = render(
      createElement(AnnouncementBar, {
        manifest: makeManifest({ message: "System maintenance tonight", dismissible: true }),
      }),
    );
    expect(screen.getByText("System maintenance tonight")).toBeTruthy();
    const dismissBtn = container.querySelector("button");
    expect(dismissBtn).toBeTruthy();
  });

  it("AnnouncementBar hides after dismiss", async () => {
    const { default: AnnouncementBar } = await import("../widgets/AnnouncementBar");
    const { container } = render(
      createElement(AnnouncementBar, {
        manifest: makeManifest({ message: "Dismissable notice", dismissible: true }),
      }),
    );
    fireEvent.click(container.querySelector("button")!);
    expect(screen.queryByText("Dismissable notice")).toBeNull();
  });

  // 6. FeatureSpotlight
  it("FeatureSpotlight renders title and description", async () => {
    const { default: FeatureSpotlight } = await import("../widgets/FeatureSpotlight");
    render(
      createElement(FeatureSpotlight, {
        manifest: makeManifest({
          title: "Mobile Deposit",
          description: "Deposit checks from your phone.",
        }),
      }),
    );
    expect(screen.getByText("Mobile Deposit")).toBeTruthy();
    expect(screen.getByText("Deposit checks from your phone.")).toBeTruthy();
  });

  // 7. CustomHTML
  it("CustomHTML renders HTML content", async () => {
    const { default: CustomHTML } = await import("../widgets/CustomHTML");
    const { container } = render(
      createElement(CustomHTML, {
        manifest: makeManifest({ html: "<p>Hello <strong>World</strong></p>" }),
      }),
    );
    expect(container.querySelector("strong")!.textContent).toBe("World");
  });

  // 8. TwoColumnLayout
  it("TwoColumnLayout renders with labels", async () => {
    const { default: TwoColumnLayout } = await import("../widgets/TwoColumnLayout");
    render(
      createElement(TwoColumnLayout, {
        manifest: makeManifest({ leftLabel: "Left Column", rightLabel: "Right Column" }),
      }),
    );
    expect(screen.getByText("Left Column")).toBeTruthy();
    expect(screen.getByText("Right Column")).toBeTruthy();
  });

  // 9. ProductOfferCard
  it("ProductOfferCard renders product name and description", async () => {
    const { default: ProductOfferCard } = await import("../widgets/ProductOfferCard");
    render(
      createElement(ProductOfferCard, {
        manifest: makeManifest({
          title: "Cash Back Card",
          description: "Earn 2% on all purchases.",
          badge: "New",
        }),
      }),
    );
    expect(screen.getByText("Cash Back Card")).toBeTruthy();
    expect(screen.getByText("Earn 2% on all purchases.")).toBeTruthy();
    expect(screen.getByText("New")).toBeTruthy();
  });

  // 10. CMSContentBlock
  it("CMSContentBlock renders content", async () => {
    const { default: CMSContentBlock } = await import("../widgets/CMSContentBlock");
    render(
      createElement(CMSContentBlock, {
        manifest: makeManifest({ slug: "test-content" }),
      }),
    );
    expect(screen.getByText("CMS Title")).toBeTruthy();
  });

  // 11. CreditScoreWidget
  it("CreditScoreWidget renders score", async () => {
    const { default: CreditScoreWidget } = await import("../widgets/CreditScoreWidget");
    render(
      createElement(CreditScoreWidget, {
        manifest: makeManifest({ score: 750, change: 12, provider: "Experian" }),
      }),
    );
    expect(screen.getByText("750")).toBeTruthy();
    expect(screen.getByText("+12 pts")).toBeTruthy();
    expect(screen.getByText("Credit Score")).toBeTruthy();
  });

  // 12. CrossSellCarousel
  it("CrossSellCarousel renders items", async () => {
    const { default: CrossSellCarousel } = await import("../widgets/CrossSellCarousel");
    render(
      createElement(CrossSellCarousel, {
        manifest: makeManifest({
          items: [
            { title: "Auto Loan", description: "Great rates", link: "/auto-loans" },
            { title: "Credit Card", description: "Cash back", link: "/credit-cards" },
          ],
        }),
      }),
    );
    expect(screen.getByText("Auto Loan")).toBeTruthy();
    expect(screen.getByText("Credit Card")).toBeTruthy();
  });

  it("CrossSellCarousel returns null with empty items", async () => {
    const { default: CrossSellCarousel } = await import("../widgets/CrossSellCarousel");
    const { container } = render(
      createElement(CrossSellCarousel, {
        manifest: makeManifest({ items: [] }),
      }),
    );
    expect(container.innerHTML).toBe("");
  });

  // 13. AccountSummaryCard
  it("AccountSummaryCard renders account info", async () => {
    const { default: AccountSummaryCard } = await import("../widgets/AccountSummaryCard");
    render(
      createElement(AccountSummaryCard, {
        manifest: makeManifest({ title: "My Accounts", maxAccounts: 5 }),
      }),
    );
    expect(screen.getByText("My Accounts")).toBeTruthy();
    expect(screen.getByText("Checking")).toBeTruthy();
    expect(screen.getByText("Savings")).toBeTruthy();
  });

  // 14. RecentTransactions
  it("RecentTransactions renders transaction list", async () => {
    const { default: RecentTransactions } = await import("../widgets/RecentTransactions");
    render(
      createElement(RecentTransactions, {
        manifest: makeManifest({ title: "Recent Activity", limit: 5 }),
      }),
    );
    expect(screen.getByText("Recent Activity")).toBeTruthy();
    expect(screen.getByText("No recent transactions")).toBeTruthy();
  });

  // 15. SavingsGoalProgress
  it("SavingsGoalProgress renders goal progress", async () => {
    const { default: SavingsGoalProgress } = await import("../widgets/SavingsGoalProgress");
    render(
      createElement(SavingsGoalProgress, {
        manifest: makeManifest({ title: "Savings Goals" }),
      }),
    );
    expect(screen.getByText("Savings Goals")).toBeTruthy();
    expect(screen.getByText("2 active goals")).toBeTruthy();
  });

  // 16. SpendingChart
  it("SpendingChart renders chart", async () => {
    const { default: SpendingChart } = await import("../widgets/SpendingChart");
    render(
      createElement(SpendingChart, {
        manifest: makeManifest({ title: "Spending Overview" }),
      }),
    );
    expect(screen.getByText("Spending Overview")).toBeTruthy();
    expect(screen.getByText("Food")).toBeTruthy();
    expect(screen.getByText("Transport")).toBeTruthy();
  });

  // 17. PromotionalBanner
  it("PromotionalBanner renders banner content", async () => {
    const { default: PromotionalBanner } = await import("../widgets/PromotionalBanner");
    render(
      createElement(PromotionalBanner, {
        manifest: makeManifest({
          title: "Spring Promo",
          description: "Limited time offer!",
          ctaLabel: "Learn More",
          ctaLink: "/promo",
        }),
      }),
    );
    expect(screen.getByText("Spring Promo")).toBeTruthy();
    expect(screen.getByText("Limited time offer!")).toBeTruthy();
    expect(screen.getByText("Learn More")).toBeTruthy();
  });

  it("PromotionalBanner can be dismissed", async () => {
    const { default: PromotionalBanner } = await import("../widgets/PromotionalBanner");
    const { container } = render(
      createElement(PromotionalBanner, {
        manifest: makeManifest({ title: "Dismiss Me", dismissible: true }),
      }),
    );
    expect(screen.getByText("Dismiss Me")).toBeTruthy();
    fireEvent.click(container.querySelector("button")!);
    expect(screen.queryByText("Dismiss Me")).toBeNull();
  });

  // 18. NetWorthTracker
  it("NetWorthTracker renders net worth", async () => {
    const { default: NetWorthTracker } = await import("../widgets/NetWorthTracker");
    render(
      createElement(NetWorthTracker, {
        manifest: makeManifest({ title: "Net Worth" }),
      }),
    );
    expect(screen.getByText("Net Worth")).toBeTruthy();
    expect(screen.getByText("Assets")).toBeTruthy();
    expect(screen.getByText("Liabilities")).toBeTruthy();
  });

  // 19. OnboardingChecklist
  it("OnboardingChecklist renders checklist items", async () => {
    const { default: OnboardingChecklist } = await import("../widgets/OnboardingChecklist");
    render(
      createElement(OnboardingChecklist, {
        manifest: makeManifest({
          title: "Get Started",
          items: [
            { label: "Verify email", completed: true, link: "/verify" },
            { label: "Add account", completed: false, link: "/add" },
          ],
        }),
      }),
    );
    expect(screen.getByText("Get Started")).toBeTruthy();
    expect(screen.getByText("Verify email")).toBeTruthy();
    expect(screen.getByText("Add account")).toBeTruthy();
    expect(screen.getByText("1 of 2 complete")).toBeTruthy();
  });

  // 20. UpcomingBills
  it("UpcomingBills renders bill list", async () => {
    const { default: UpcomingBills } = await import("../widgets/UpcomingBills");
    render(
      createElement(UpcomingBills, {
        manifest: makeManifest({ title: "Upcoming Bills", limit: 3 }),
      }),
    );
    expect(screen.getByText("Upcoming Bills")).toBeTruthy();
    expect(screen.getByText("Electric Co")).toBeTruthy();
    expect(screen.getByText("Internet Inc")).toBeTruthy();
  });

  // 21. QuickActionsGrid
  it("QuickActionsGrid renders action buttons", async () => {
    const { default: QuickActionsGrid } = await import("../widgets/QuickActionsGrid");
    render(
      createElement(QuickActionsGrid, {
        manifest: makeManifest({
          actions: [
            { label: "Send Money", icon: "send", color: "#3b82f6", to: "/send" },
            { label: "Pay Bills", icon: "receipt", color: "#10b981", to: "/bills" },
          ],
        }),
      }),
    );
    expect(screen.getByText("Send Money")).toBeTruthy();
    expect(screen.getByText("Pay Bills")).toBeTruthy();
  });

  // 22. LoanSummary
  it("LoanSummary renders loan info", async () => {
    const { default: LoanSummary } = await import("../widgets/LoanSummary");
    render(
      createElement(LoanSummary, {
        manifest: makeManifest({ title: "Loans" }),
      }),
    );
    expect(screen.getByText("Loans")).toBeTruthy();
    expect(screen.getByText("Auto Loan")).toBeTruthy();
  });
});
