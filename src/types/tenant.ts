/**
 * Tenant / Multi-Tenancy Types
 *
 * Core tenant entity definitions including subscription tiers,
 * user roles, permissions, and tenant context.
 */

// =============================================================================
// DATA CLASSIFICATION
// =============================================================================

export type DataClassification = "public" | "internal" | "confidential" | "restricted";

// =============================================================================
// TENANT / MULTI-TENANCY
// =============================================================================

export type SubscriptionTier = "trial" | "starter" | "professional" | "enterprise";

export type TenantRegion = "us" | "eu" | "uk" | "latam" | "apac" | "mena" | "africa";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  subscriptionTier: SubscriptionTier;
  features: TenantFeatures;
  complianceSettings: ComplianceSettings;
  region: TenantRegion;
  country: string; // ISO 3166-1 alpha-2 (e.g., 'US', 'DE', 'BR')
  defaultCurrency: string; // ISO 4217 (e.g., 'USD', 'EUR', 'BRL')
  timezone: string; // IANA timezone (e.g., 'America/New_York')
  maxUsers: number;
  rateLimits: RateLimitConfig;
  cachePolicy: CachePolicy;
  createdAt: string;
  updatedAt: string;
}

export interface TenantFeatures {
  // Core banking features
  rdc: boolean;
  billPay: boolean;
  p2p: boolean;
  cardControls: boolean;
  externalTransfers: boolean;
  wires: boolean;
  mobileDeposit: boolean;
  directDeposit: boolean;
  openBanking: boolean;
  // International / multi-market features
  sca: boolean;
  confirmationOfPayee: boolean;
  multiCurrency: boolean;
  internationalPayments: boolean;
  internationalBillPay: boolean;
  openBankingAggregation: boolean;
  aliasPayments: boolean;
  amlScreening: boolean;
  instantPayments: boolean;
}

export interface ComplianceSettings {
  dataRetentionYears: number;
  kycRequired: boolean;
  mfaRequired: boolean;
  mfaThresholdCents: number;
  dataResidencyRegion: string;
  /** Session idle timeout in minutes before warning. Default: 15 */
  sessionTimeoutMinutes: number;
  /** Grace period in minutes after warning before auto-logout. Default: 2 */
  sessionGraceMinutes: number;
}

export interface RateLimitConfig {
  /** Default requests per minute across all domains */
  defaultRpm: number;
  /** Per-domain RPM overrides (e.g., { payments: 100, accounts: 2000 }) */
  domainOverrides?: Record<string, number>;
}

export interface CachePolicy {
  /** Default stale time in milliseconds for TanStack Query. Default: 300000 (5min) */
  defaultStaleTimeMs: number;
  /** Per-domain stale time overrides in milliseconds */
  domainOverrides?: Record<string, number>;
}

export type TenantUserRole = "owner" | "admin" | "member" | "viewer";

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantUserRole;
  status: "active" | "invited" | "suspended";
  displayName: string;
  title: string | null;
  invitedBy: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Permission system
export type TenantPermission =
  | "accounts:read"
  | "accounts:write"
  | "transactions:read"
  | "transfers:create"
  | "transfers:approve"
  | "billpay:manage"
  | "cards:manage"
  | "rdc:deposit"
  | "settings:read"
  | "settings:write"
  | "users:manage"
  | "audit:read"
  | "integrations:manage";

const ROLE_PERMISSIONS: Record<TenantUserRole, TenantPermission[]> = {
  owner: [
    "accounts:read",
    "accounts:write",
    "transactions:read",
    "transfers:create",
    "transfers:approve",
    "billpay:manage",
    "cards:manage",
    "rdc:deposit",
    "settings:read",
    "settings:write",
    "users:manage",
    "audit:read",
    "integrations:manage",
  ],
  admin: [
    "accounts:read",
    "accounts:write",
    "transactions:read",
    "transfers:create",
    "transfers:approve",
    "billpay:manage",
    "cards:manage",
    "rdc:deposit",
    "settings:read",
    "settings:write",
    "users:manage",
    "audit:read",
  ],
  member: [
    "accounts:read",
    "transactions:read",
    "transfers:create",
    "billpay:manage",
    "cards:manage",
    "rdc:deposit",
    "settings:read",
  ],
  viewer: ["accounts:read", "transactions:read", "settings:read"],
};

export function getRolePermissions(role: TenantUserRole): TenantPermission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Tenant context passed to components
export interface TenantContext {
  tenantId: string;
  tenantName: string;
  userId: string;
  userRole: TenantUserRole;
  displayName: string;
  permissions: TenantPermission[];
  subscriptionTier: SubscriptionTier;
  features: TenantFeatures;
  region: TenantRegion;
  country: string;
  defaultCurrency: string;
  sessionTimeoutMinutes: number;
  sessionGraceMinutes: number;
}
