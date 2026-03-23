/**
 * Server-Driven UI (SDUI) Types
 *
 * Component manifests allow the backend to dictate what UI components
 * render on each screen, tailored to user personas calculated from
 * behavioral and demographic data.
 *
 * The flow:
 *   1. Backend calculates user persona from profile + account data
 *   2. Admin configures screen manifests per persona via CMS
 *   3. Frontend requests manifest for a screen key (e.g., "home", "accounts")
 *   4. Backend resolves persona → returns component manifest array
 *   5. Frontend renders components via a typed registry
 */

// =============================================================================
// USER PERSONA
// =============================================================================

export type PersonaId =
  | "default"
  | "new_member"
  | "business_owner"
  | "high_net_worth"
  | "young_professional"
  | "retiree"
  | "low_engagement"
  | "credit_builder"
  | string;

export interface UserPersona {
  personaId: PersonaId;
  label: string;
  description: string;
  rules: PersonaRule[];
  priority: number;
}

export interface PersonaRule {
  field: PersonaField;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in" | "contains";
  value: string | number | boolean | string[];
}

export type PersonaField =
  | "account_count"
  | "total_balance_cents"
  | "account_types"
  | "member_since_days"
  | "transaction_count_30d"
  | "has_loans"
  | "has_credit_card"
  | "has_business_account"
  | "subscription_tier"
  | "login_count_30d"
  | "age_range"
  | "credit_score_range";

// =============================================================================
// COMPONENT MANIFEST
// =============================================================================

/**
 * A single UI component to render, with its type and configuration props.
 * The frontend component registry maps `componentType` to a React component.
 */
export interface ComponentManifest {
  id: string;
  componentType: SDUIComponentType;
  props: Record<string, unknown>;
  /** Layout order within the screen */
  order: number;
  /** Optional visibility conditions evaluated client-side */
  visibility?: VisibilityCondition;
  /** Optional wrapper class for layout control */
  className?: string;
  /** Optional experiment ID for A/B testing this component */
  experimentId?: string;
}

export type SDUIComponentType =
  // Dashboard widgets
  | "account_summary_card"
  | "quick_actions_grid"
  | "recent_transactions"
  | "spending_chart"
  | "savings_goal_progress"
  | "loan_summary"
  | "upcoming_bills"
  // Promotional / engagement
  | "promotional_banner"
  | "product_offer_card"
  | "cross_sell_carousel"
  | "financial_tip"
  | "onboarding_checklist"
  // Informational
  | "announcement_bar"
  | "cms_content_block"
  | "credit_score_widget"
  | "net_worth_tracker"
  // Actions
  | "cta_button"
  | "feature_spotlight"
  // Layout
  | "section_header"
  | "spacer"
  | "two_column_layout"
  // Custom / escape hatch
  | "custom_html"
  | string;

export interface VisibilityCondition {
  /** Client-side feature flag check */
  featureFlag?: string;
  /** Only show if capability is enabled */
  capability?: string;
  /** Date range (ISO strings) */
  visibleAfter?: string;
  visibleBefore?: string;
}

// =============================================================================
// SCREEN MANIFEST
// =============================================================================

/**
 * A full screen layout definition: which components appear, in what order,
 * for a given persona on a given screen.
 */
export interface ScreenManifest {
  id: string;
  firmId: string;
  screenKey: ScreenKey;
  personaId: PersonaId;
  label: string;
  components: ComponentManifest[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type ScreenKey =
  | "home"
  | "accounts"
  | "account_detail"
  | "move_money"
  | "cards"
  | "more"
  | string;

// =============================================================================
// RESOLVED RESPONSE (what the API returns to the frontend)
// =============================================================================

export interface ResolvedScreen {
  screenKey: ScreenKey;
  personaId: PersonaId;
  personaLabel: string;
  components: ComponentManifest[];
  manifestVersion: number;
}

// =============================================================================
// ADMIN CRUD
// =============================================================================

export interface ScreenManifestCreateInput {
  screenKey: ScreenKey;
  personaId: PersonaId;
  label: string;
  components: Omit<ComponentManifest, "id">[];
}

export interface ScreenManifestUpdateInput {
  label?: string;
  components?: Omit<ComponentManifest, "id">[];
  isActive?: boolean;
}

export interface PersonaCreateInput {
  personaId: PersonaId;
  label: string;
  description: string;
  rules: PersonaRule[];
  priority: number;
}
