/**
 * Navigation Configuration
 *
 * Centralized nav item definitions with feature-gate metadata.
 * Used by Header, MobileBottomNav, and route config to ensure
 * consistent feature gating across the app.
 */

import type { LucideIcon } from "lucide-react";
import type { TenantFeatures, TenantRegion } from "@/types/tenant";
import {
  LayoutDashboard,
  Wallet,
  Send,
  CreditCard,
  Camera,
  ExternalLink,
  MapPin,
  TrendingUp,
  Gift,
  GraduationCap,
  Calculator,
  FileText,
  MessageSquare,
  ShieldAlert,
  BookOpen,
  Banknote,
  Plane,
  Smartphone,
  Shield,
  BellRing,
  FolderOpen,
  Users,
  ArrowUpRight,
  Ban,
  DollarSign,
  Target,
  Landmark,
  Sparkles,
  ArrowRightLeft,
  BarChart3,
  Globe,
  Settings,
  Zap,
} from "lucide-react";

export type NavGroup = "money" | "accounts" | "business" | "tools" | "security";

export interface NavItem {
  path: string;
  icon: LucideIcon;
  labelKey: string;
  /** Feature flag(s) required — all must be enabled. If omitted, always visible. */
  requiredFeature?: keyof TenantFeatures | (keyof TenantFeatures)[];
  /** Restrict to these regions. If omitted, visible in all regions. */
  requiredRegion?: TenantRegion[];
  /** Group for categorized display in overflow menus */
  group?: NavGroup;
}

/** Localized group labels */
export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  money: "nav.groupMoney",
  accounts: "nav.groupAccounts",
  business: "nav.groupBusiness",
  tools: "nav.groupTools",
  security: "nav.groupSecurity",
};

// ---------------------------------------------------------------------------
// Primary nav (always-visible tab bar)
// ---------------------------------------------------------------------------

export const primaryNavItems: NavItem[] = [
  { path: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { path: "/accounts", icon: Wallet, labelKey: "nav.accounts" },
  { path: "/move-money", icon: Send, labelKey: "nav.moveMoney" },
  { path: "/cards", icon: CreditCard, labelKey: "nav.cards" },
];

// ---------------------------------------------------------------------------
// Mobile primary nav (bottom bar)
// ---------------------------------------------------------------------------

export const mobilePrimaryNavItems: NavItem[] = [
  { path: "/dashboard", icon: LayoutDashboard, labelKey: "nav.home" },
  { path: "/accounts", icon: Wallet, labelKey: "nav.accounts" },
  { path: "/move-money", icon: Send, labelKey: "nav.moveMoney" },
  { path: "/deposit", icon: Camera, labelKey: "nav.deposit", requiredFeature: "rdc" },
];

// ---------------------------------------------------------------------------
// Overflow / "More" nav items — feature-gated
// ---------------------------------------------------------------------------

export const overflowNavItems: NavItem[] = [
  // Business features
  { path: "/business", icon: Landmark, labelKey: "nav.businessHub", group: "business" },
  { path: "/invoices", icon: Sparkles, labelKey: "nav.invoiceAI", group: "business" },
  { path: "/cash-sweeps", icon: ArrowRightLeft, labelKey: "nav.cashSweeps", group: "business" },
  { path: "/approvals", icon: Shield, labelKey: "nav.approvals", group: "business" },
  { path: "/liquidity", icon: BarChart3, labelKey: "nav.liquidity", group: "business" },

  // Money movement
  {
    path: "/deposit",
    icon: Camera,
    labelKey: "nav.depositCheck",
    requiredFeature: "rdc",
    group: "money",
  },
  {
    path: "/wire-transfer",
    icon: ArrowUpRight,
    labelKey: "nav.wireTransfer",
    requiredFeature: "wires",
    group: "money",
  },
  {
    path: "/instant-payments",
    icon: Zap,
    labelKey: "nav.instantPayments",
    requiredFeature: "instantPayments",
    group: "money",
  },
  {
    path: "/international",
    icon: Globe,
    labelKey: "nav.internationalPayments",
    requiredFeature: "internationalPayments",
    group: "money",
  },
  {
    path: "/alias-payments",
    icon: Smartphone,
    labelKey: "nav.payByAlias",
    requiredFeature: "aliasPayments",
    group: "money",
  },
  {
    path: "/multi-currency",
    icon: Wallet,
    labelKey: "nav.multiCurrency",
    requiredFeature: "multiCurrency",
    group: "money",
  },
  {
    path: "/p2p",
    icon: DollarSign,
    labelKey: "nav.sendAndReceive",
    requiredFeature: "p2p",
    group: "money",
  },
  { path: "/stop-payments", icon: Ban, labelKey: "nav.stopPayments", group: "money" },

  // Accounts & management
  { path: "/statements", icon: FileText, labelKey: "nav.statements", group: "accounts" },
  {
    path: "/linked-accounts",
    icon: ExternalLink,
    labelKey: "nav.linkedAccounts",
    requiredFeature: "externalTransfers",
    group: "accounts",
  },
  { path: "/joint-accounts", icon: Users, labelKey: "nav.jointAccounts", group: "accounts" },
  { path: "/savings-goals", icon: Target, labelKey: "nav.savingsGoals", group: "accounts" },
  {
    path: "/direct-deposit",
    icon: Banknote,
    labelKey: "nav.directDeposit",
    requiredFeature: "directDeposit",
    group: "accounts",
  },
  { path: "/overdraft", icon: Shield, labelKey: "nav.overdraftProtection", group: "accounts" },
  { path: "/card-offers", icon: Gift, labelKey: "nav.cardOffers", group: "accounts" },
  {
    path: "/card-services",
    icon: Plane,
    labelKey: "nav.cardServices",
    requiredFeature: "cardControls",
    group: "accounts",
  },
  { path: "/check-ordering", icon: BookOpen, labelKey: "nav.orderChecks", group: "accounts" },

  // Tools & insights
  { path: "/financial", icon: TrendingUp, labelKey: "nav.financialInsights", group: "tools" },
  { path: "/spending-alerts", icon: BellRing, labelKey: "nav.spendingAlerts", group: "tools" },
  { path: "/calculators", icon: Calculator, labelKey: "nav.calculators", group: "tools" },
  { path: "/learn", icon: GraduationCap, labelKey: "nav.financialEducation", group: "tools" },
  { path: "/find-us", icon: MapPin, labelKey: "nav.findATM", group: "tools" },

  // Security & compliance
  { path: "/messages", icon: MessageSquare, labelKey: "nav.secureMessages", group: "security" },
  { path: "/disputes", icon: ShieldAlert, labelKey: "nav.disputes", group: "security" },
  { path: "/document-vault", icon: FolderOpen, labelKey: "nav.documentVault", group: "security" },
  { path: "/devices", icon: Smartphone, labelKey: "nav.devices", group: "security" },
  { path: "/regulatory", icon: Shield, labelKey: "nav.regulatoryTransparency", group: "security" },
];

// ---------------------------------------------------------------------------
// Mobile "more" sheet items (superset of overflow + settings)
// ---------------------------------------------------------------------------

export const mobileMoreItems: NavItem[] = [
  ...overflowNavItems,
  { path: "/settings", icon: Settings, labelKey: "nav.settings" },
];

// ---------------------------------------------------------------------------
// Filtering helper
// ---------------------------------------------------------------------------

/**
 * Filter nav items based on tenant features and region.
 * Items without requiredFeature/requiredRegion are always included.
 */
export function filterNavItems(
  items: NavItem[],
  features?: TenantFeatures,
  region?: TenantRegion,
): NavItem[] {
  return items.filter((item) => {
    // Feature check
    if (item.requiredFeature) {
      if (!features) return false;
      const required = Array.isArray(item.requiredFeature)
        ? item.requiredFeature
        : [item.requiredFeature];
      if (!required.every((f) => features[f])) return false;
    }

    // Region check
    if (item.requiredRegion) {
      if (!region || !item.requiredRegion.includes(region)) return false;
    }

    return true;
  });
}

/**
 * Group nav items by their `group` property.
 * Items without a group go into 'tools' by default.
 * Returns groups in a consistent display order.
 */
const GROUP_ORDER: NavGroup[] = ["money", "accounts", "business", "tools", "security"];

export function groupNavItems(items: NavItem[]): Map<NavGroup, NavItem[]> {
  const groups = new Map<NavGroup, NavItem[]>();
  for (const item of items) {
    const group = item.group ?? "tools";
    const list = groups.get(group) ?? [];
    list.push(item);
    groups.set(group, list);
  }
  // Return in consistent order
  const ordered = new Map<NavGroup, NavItem[]>();
  for (const g of GROUP_ORDER) {
    const items = groups.get(g);
    if (items && items.length > 0) {
      ordered.set(g, items);
    }
  }
  return ordered;
}
