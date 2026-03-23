/**
 * Server-Driven UI Renderer
 *
 * Takes a component manifest array from the backend and renders each component
 * using a typed registry. Unknown component types render a dev-mode placeholder.
 *
 * Usage:
 *   <SDUIRenderer screenKey="home" fallback={<Dashboard />} />
 */

import { type ReactNode, Suspense, lazy, useMemo } from "react";
import { useScreenManifest } from "@/hooks/useScreenManifest";
import type { ComponentManifest, ScreenKey, VisibilityCondition } from "@/types/sdui";
import { Spinner } from "@/components/common/Spinner";

// =============================================================================
// COMPONENT REGISTRY
// =============================================================================

/**
 * Maps SDUI component types to lazy-loaded React components.
 * Each registered component receives its manifest `props` as React props.
 */
type SDUIComponent = React.ComponentType<{ manifest: ComponentManifest }>;

const registry: Record<string, React.LazyExoticComponent<SDUIComponent>> = {
  account_summary_card: lazy(() => import("./widgets/AccountSummaryCard")),
  quick_actions_grid: lazy(() => import("./widgets/QuickActionsGrid")),
  recent_transactions: lazy(() => import("./widgets/RecentTransactions")),
  spending_chart: lazy(() => import("./widgets/SpendingChart")),
  savings_goal_progress: lazy(() => import("./widgets/SavingsGoalProgress")),
  loan_summary: lazy(() => import("./widgets/LoanSummary")),
  upcoming_bills: lazy(() => import("./widgets/UpcomingBills")),
  promotional_banner: lazy(() => import("./widgets/PromotionalBanner")),
  product_offer_card: lazy(() => import("./widgets/ProductOfferCard")),
  cross_sell_carousel: lazy(() => import("./widgets/CrossSellCarousel")),
  financial_tip: lazy(() => import("./widgets/FinancialTip")),
  onboarding_checklist: lazy(() => import("./widgets/OnboardingChecklist")),
  announcement_bar: lazy(() => import("./widgets/AnnouncementBar")),
  cms_content_block: lazy(() => import("./widgets/CMSContentBlock")),
  credit_score_widget: lazy(() => import("./widgets/CreditScoreWidget")),
  net_worth_tracker: lazy(() => import("./widgets/NetWorthTracker")),
  cta_button: lazy(() => import("./widgets/CTAButton")),
  feature_spotlight: lazy(() => import("./widgets/FeatureSpotlight")),
  section_header: lazy(() => import("./widgets/SectionHeader")),
  spacer: lazy(() => import("./widgets/Spacer")),
  two_column_layout: lazy(() => import("./widgets/TwoColumnLayout")),
  custom_html: lazy(() => import("./widgets/CustomHTML")),
};

// =============================================================================
// VISIBILITY CHECK
// =============================================================================

function isVisible(condition?: VisibilityCondition): boolean {
  if (!condition) return true;

  const now = new Date();

  if (condition.visibleAfter && new Date(condition.visibleAfter) > now) {
    return false;
  }
  if (condition.visibleBefore && new Date(condition.visibleBefore) < now) {
    return false;
  }

  // featureFlag and capability checks could be wired to PostHog / capabilities
  // For now, pass through
  return true;
}

// =============================================================================
// SINGLE COMPONENT RENDERER
// =============================================================================

function SDUIComponent({ manifest }: { manifest: ComponentManifest }) {
  const Component = registry[manifest.componentType];

  if (!Component) {
    // Dev-mode placeholder for unregistered components
    if (import.meta.env.DEV) {
      return (
        <div className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-lg p-4 text-sm text-amber-700">
          Unknown SDUI component: <code>{manifest.componentType}</code>
        </div>
      );
    }
    return null;
  }

  return (
    <Suspense fallback={<div className="animate-pulse h-24 bg-slate-100 rounded-lg" />}>
      <Component manifest={manifest} />
    </Suspense>
  );
}

// =============================================================================
// SCREEN RENDERER
// =============================================================================

interface SDUIRendererProps {
  screenKey: ScreenKey;
  fallback?: ReactNode;
  className?: string;
}

export function SDUIRenderer({ screenKey, fallback, className }: SDUIRendererProps) {
  const { data, isLoading } = useScreenManifest(screenKey);

  const visibleComponents = useMemo(() => {
    if (!data?.components) return [];
    return data.components.filter((c) => isVisible(c.visibility));
  }, [data?.components]);

  // If no manifest configured or still loading, render fallback
  if (isLoading) {
    return <>{fallback ?? <Spinner />}</>;
  }

  if (!data || visibleComponents.length === 0) {
    return <>{fallback}</>;
  }

  return (
    <div className={className ?? "space-y-6"}>
      {visibleComponents.map((manifest) => (
        <div key={manifest.id} className={manifest.className}>
          <SDUIComponent manifest={manifest} />
        </div>
      ))}
    </div>
  );
}

export { registry as sduiRegistry };
