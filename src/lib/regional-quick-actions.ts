/**
 * Region-Aware Dashboard Quick Actions
 *
 * Different markets have different primary banking actions.
 * US CUs: check deposit, bill pay. UK/EU: direct debits, contacts.
 * Africa: send money, airtime. India: UPI, scan & pay.
 */

import type { LucideIcon } from "lucide-react";
import type { TenantRegion, TenantFeatures } from "@/types/tenant";
import {
  Send,
  Receipt,
  Camera,
  CreditCard,
  MapPin,
  Smartphone,
  Wallet,
  QrCode,
  Gift,
  FileText,
  ArrowRightLeft,
  Zap,
  Globe,
  Users,
} from "lucide-react";
import { actionColors } from "@/lib/common/design-tokens";

export interface QuickAction {
  labelKey: string;
  icon: LucideIcon;
  color: string;
  to: string;
  /** Feature flag required — if specified and disabled, action is hidden */
  requiredFeature?: keyof TenantFeatures;
}

// ---------------------------------------------------------------------------
// Region-specific quick action sets
// ---------------------------------------------------------------------------

const US_ACTIONS: QuickAction[] = [
  { labelKey: "nav.moveMoney", icon: Send, color: actionColors.transfer, to: "/move-money" },
  {
    labelKey: "dashboard.payBills",
    icon: Receipt,
    color: actionColors.billPay,
    to: "/bills",
    requiredFeature: "billPay",
  },
  {
    labelKey: "nav.depositCheck",
    icon: Camera,
    color: actionColors.deposit,
    to: "/deposit",
    requiredFeature: "rdc",
  },
  {
    labelKey: "nav.cardControls",
    icon: CreditCard,
    color: actionColors.cards,
    to: "/cards",
    requiredFeature: "cardControls",
  },
  { labelKey: "dashboard.findATM", icon: MapPin, color: actionColors.findAtm, to: "/find-us" },
];

const UK_EU_ACTIONS: QuickAction[] = [
  { labelKey: "nav.moveMoney", icon: Send, color: actionColors.transfer, to: "/move-money" },
  {
    labelKey: "dashboard.payContact",
    icon: Users,
    color: actionColors.billPay,
    to: "/p2p",
    requiredFeature: "p2p",
  },
  {
    labelKey: "nav.cardControls",
    icon: CreditCard,
    color: actionColors.cards,
    to: "/cards",
    requiredFeature: "cardControls",
  },
  { labelKey: "nav.statements", icon: FileText, color: actionColors.deposit, to: "/statements" },
  {
    labelKey: "nav.internationalPayments",
    icon: Globe,
    color: actionColors.findAtm,
    to: "/international",
    requiredFeature: "internationalPayments",
  },
];

const AFRICA_ACTIONS: QuickAction[] = [
  { labelKey: "nav.moveMoney", icon: Send, color: actionColors.transfer, to: "/move-money" },
  {
    labelKey: "dashboard.payContact",
    icon: Users,
    color: actionColors.billPay,
    to: "/p2p",
    requiredFeature: "p2p",
  },
  {
    labelKey: "dashboard.payBills",
    icon: Receipt,
    color: actionColors.deposit,
    to: "/bills",
    requiredFeature: "billPay",
  },
  {
    labelKey: "nav.payByAlias",
    icon: Smartphone,
    color: actionColors.cards,
    to: "/alias-payments",
    requiredFeature: "aliasPayments",
  },
  { labelKey: "nav.accounts", icon: Wallet, color: actionColors.findAtm, to: "/accounts" },
];

const INDIA_ACTIONS: QuickAction[] = [
  {
    labelKey: "nav.payByAlias",
    icon: Zap,
    color: actionColors.transfer,
    to: "/alias-payments",
    requiredFeature: "aliasPayments",
  },
  { labelKey: "nav.moveMoney", icon: Send, color: actionColors.billPay, to: "/move-money" },
  { labelKey: "dashboard.scanAndPay", icon: QrCode, color: actionColors.deposit, to: "/scan-pay" },
  {
    labelKey: "nav.cardControls",
    icon: CreditCard,
    color: actionColors.cards,
    to: "/cards",
    requiredFeature: "cardControls",
  },
  { labelKey: "nav.cardOffers", icon: Gift, color: actionColors.findAtm, to: "/card-offers" },
];

const LATAM_ACTIONS: QuickAction[] = [
  { labelKey: "nav.moveMoney", icon: Send, color: actionColors.transfer, to: "/move-money" },
  {
    labelKey: "dashboard.payContact",
    icon: Users,
    color: actionColors.billPay,
    to: "/p2p",
    requiredFeature: "p2p",
  },
  {
    labelKey: "dashboard.payBills",
    icon: Receipt,
    color: actionColors.deposit,
    to: "/bills",
    requiredFeature: "billPay",
  },
  {
    labelKey: "nav.cardControls",
    icon: CreditCard,
    color: actionColors.cards,
    to: "/cards",
    requiredFeature: "cardControls",
  },
  {
    labelKey: "nav.instantPayments",
    icon: Zap,
    color: actionColors.findAtm,
    to: "/instant-payments",
    requiredFeature: "instantPayments",
  },
];

const MENA_ACTIONS: QuickAction[] = [
  { labelKey: "nav.moveMoney", icon: Send, color: actionColors.transfer, to: "/move-money" },
  {
    labelKey: "dashboard.payBills",
    icon: Receipt,
    color: actionColors.billPay,
    to: "/bills",
    requiredFeature: "billPay",
  },
  {
    labelKey: "nav.internationalPayments",
    icon: Globe,
    color: actionColors.deposit,
    to: "/international",
    requiredFeature: "internationalPayments",
  },
  {
    labelKey: "nav.multiCurrency",
    icon: ArrowRightLeft,
    color: actionColors.cards,
    to: "/multi-currency",
    requiredFeature: "multiCurrency",
  },
  {
    labelKey: "nav.cardControls",
    icon: CreditCard,
    color: actionColors.findAtm,
    to: "/cards",
    requiredFeature: "cardControls",
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const REGION_ACTIONS: Record<TenantRegion, QuickAction[]> = {
  us: US_ACTIONS,
  uk: UK_EU_ACTIONS,
  eu: UK_EU_ACTIONS,
  latam: LATAM_ACTIONS,
  apac: INDIA_ACTIONS,
  mena: MENA_ACTIONS,
  africa: AFRICA_ACTIONS,
};

/**
 * Get quick actions for a region, filtered by enabled features.
 * Falls back to US actions if region not found.
 */
export function getQuickActions(region: TenantRegion, features: TenantFeatures): QuickAction[] {
  const actions = REGION_ACTIONS[region] ?? US_ACTIONS;
  return actions.filter((action) => {
    if (!action.requiredFeature) return true;
    return features[action.requiredFeature];
  });
}
