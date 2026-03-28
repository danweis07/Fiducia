/**
 * Admin Console Types
 *
 * Types specific to the tenant admin console.
 * Reuses banking.ts types where applicable (e.g., AuditLogEntry).
 */

import type { KYCStatus, AccountType, AccountStatus, IntegrationDomain } from "./banking";

// =============================================================================
// ADMIN DASHBOARD
// =============================================================================

export interface AdminDashboardMetrics {
  totalCustomers: number;
  totalDepositsCents: number;
  activeAccounts: number;
  monthlyTransactions: number;
  newSignups30d: number;
  pendingKycReviews: number;
  openSupportTickets: number;
}

export interface ActivityFeedItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  detail: string;
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

export interface UserListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  kycStatus: KYCStatus;
  accountCount: number;
  lastLogin: string | null;
  status: "active" | "suspended" | "closed";
  createdAt: string;
}

// =============================================================================
// ACCOUNT OVERVIEW
// =============================================================================

export interface AdminAccountItem {
  id: string;
  customerName: string;
  type: AccountType;
  balanceCents: number;
  status: AccountStatus;
  openedAt: string;
  accountNumberMasked: string;
}

export interface AccountAggregates {
  totalCheckingCents: number;
  totalSavingsCents: number;
  totalCDCents: number;
  totalMoneyMarketCents: number;
  totalAccounts: number;
}

// =============================================================================
// INTEGRATION MANAGER
// =============================================================================

export type IntegrationHealth = "healthy" | "degraded" | "down";

export interface IntegrationStatus {
  id: string;
  domain: IntegrationDomain;
  domainLabel: string;
  provider: string;
  isConnected: boolean;
  health: IntegrationHealth;
  lastSyncAt: string | null;
  webhookUrl: string | null;
  apiKeyMasked: string | null;
}

// =============================================================================
// COMPLIANCE
// =============================================================================

export interface ComplianceReview {
  id: string;
  customerName: string;
  submissionDate: string;
  documentType: string;
  status: "pending" | "approved" | "rejected";
}

export interface AMLAlert {
  id: string;
  customerName: string;
  transactionAmountCents: number;
  reason: string;
  status: "open" | "investigating" | "cleared" | "escalated";
  flaggedAt: string;
}

export interface GDPRRequest {
  id: string;
  customerName: string;
  requestType: "erasure" | "export" | "rectification";
  status: "pending" | "in_progress" | "completed";
  requestedAt: string;
  completedAt: string | null;
}

// =============================================================================
// ANALYTICS
// =============================================================================

export interface AnalyticsDataPoint {
  date: string;
  value: number;
}

export interface TransactionVolumeByType {
  type: string;
  count: number;
  amountCents: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
}

export interface TrendMetric {
  label: string;
  value: number;
  previousValue: number;
  format: "number" | "currency" | "percentage";
}

// =============================================================================
// AUDIT LOG (extends banking AuditLogEntry for admin-specific actions)
// =============================================================================

export type AdminAuditAction =
  | "user.suspend"
  | "user.activate"
  | "user.reset_password"
  | "account.freeze"
  | "account.unfreeze"
  | "settings.update"
  | "branding.update"
  | "integration.configure"
  | "compliance.approve"
  | "compliance.reject"
  | "feature.toggle";

export interface AdminAuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AdminAuditAction;
  entityType: string;
  entityId: string;
  ipAddress: string;
  details: string;
}

// =============================================================================
// DESIGN SYSTEM
// =============================================================================

/** A color + its foreground (text/icon) color, both as HSL strings "H S% L%" */
export interface ColorPair {
  base: string;
  foreground: string;
}

/** Full color palette — every CSS custom property the app uses */
export interface ColorPalette {
  // Brand
  primary: ColorPair;
  secondary: ColorPair;
  accent: ColorPair;

  // Surfaces
  background: ColorPair;
  card: ColorPair;
  popover: ColorPair;
  muted: ColorPair;

  // Feedback
  destructive: ColorPair;

  // Utility (single values, no foreground)
  border: string;
  input: string;
  ring: string;

  // Sidebar (independent palette)
  sidebar: {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    ring: string;
  };

  // Semantic: risk levels
  riskCritical: string;
  riskCriticalLight: string;
  riskHigh: string;
  riskHighLight: string;
  riskMedium: string;
  riskMediumLight: string;
  riskLow: string;
  riskLowLight: string;

  // Semantic: status
  statusCritical: string;
  statusWarning: string;
  statusSuccess: string;
  statusInfo: string;

  // Neutral scale
  slate50: string;
  slate100: string;
  slate200: string;
  slate500: string;
  slate600: string;
  slate700: string;
  slate800: string;

  // Accent highlights
  gold: string;
  goldLight: string;
}

/** Logo system — multiple variants for different contexts */
export interface LogoSystem {
  primary: string | null;
  mark: string | null;
  primaryDark: string | null;
  footer: string | null;
}

/** Typography tokens */
export interface TypographyTokens {
  headingFont: string;
  bodyFont: string;
  fontScale: "compact" | "default" | "spacious";
}

/** Surface/layout tokens */
export interface SurfaceTokens {
  borderRadius: "none" | "sm" | "md" | "lg" | "full";
  cardElevation: "flat" | "subtle" | "raised";
  layoutTheme: "modern" | "classic" | "compact" | "sidebar" | "dashboard";
}

/** Full design system configuration — single source of truth for all visual tokens */
export interface DesignSystemConfig {
  version: 1;
  mode: "easy" | "advanced";
  presetId: string | null;
  logos: LogoSystem;
  colors: {
    light: ColorPalette;
    dark: ColorPalette | null;
  };
  typography: TypographyTokens;
  surfaces: SurfaceTokens;
  customCss: string;
}

/** @deprecated Use DesignSystemConfig instead */
export type BrandingConfig = DesignSystemConfig;

// =============================================================================
// TENANT SETTINGS
// =============================================================================

export interface FeatureToggle {
  key: string;
  label: string;
  enabled: boolean;
  description: string;
}

export type MFAPolicy = "required_all" | "required_above_threshold" | "optional";

// =============================================================================
// CMS — CONTENT MANAGEMENT
// =============================================================================

export type CMSContentType = "article" | "announcement" | "banner" | "faq" | "legal" | "promotion";
export type CMSContentStatus = "draft" | "scheduled" | "published" | "archived";

export interface CMSChannel {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface CMSContent {
  id: string;
  slug: string;
  title: string;
  body: string;
  contentType: CMSContentType;
  status: CMSContentStatus;
  channels: string[];
  metadata: Record<string, unknown>;
  locale: string;
  authorId: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  expiresAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CMSContentVersion {
  id: string;
  contentId: string;
  version: number;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  status: string;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: string;
}

// =============================================================================
// SSO — SINGLE SIGN-ON
// =============================================================================

export interface SSOProvider {
  id: string;
  providerType: "saml" | "oidc";
  name: string;
  isEnabled: boolean;
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  certificate?: string;
  clientId?: string;
  clientSecret?: string;
  discoveryUrl?: string;
  emailDomainRestriction?: string;
  autoProvisionUsers: boolean;
  defaultRole: string;
  forceSso: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// CMS — API TOKENS
// =============================================================================

export interface CMSApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  allowedChannels: string[] | null;
  rateLimit: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  createdAt: string;
  /** Only returned once at creation time */
  rawToken?: string;
}

// =============================================================================
// DATA EXPORT & REPORTING
// =============================================================================

export type ExportFormat = "csv" | "pdf" | "json" | "xlsx";
export type ExportStatus = "pending" | "processing" | "completed" | "failed" | "expired";

export type ReportType =
  | "transactions"
  | "accounts"
  | "compliance"
  | "audit"
  | "financial_summary"
  | "member_activity"
  | "loan_portfolio"
  | "deposit_summary";

export interface ExportRequest {
  id: string;
  reportType: ReportType;
  format: ExportFormat;
  status: ExportStatus;
  filters: Record<string, unknown>;
  dateRangeStart: string;
  dateRangeEnd: string;
  requestedBy: string;
  requestedAt: string;
  completedAt: string | null;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  rowCount: number | null;
  expiresAt: string | null;
  error: string | null;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  reportType: ReportType;
  defaultFormat: ExportFormat;
  defaultFilters: Record<string, unknown>;
  schedule: ReportSchedule | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "quarterly";

export interface ReportSchedule {
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  recipients: string[];
  isActive: boolean;
}

export interface ReportSummary {
  totalExports: number;
  completedExports: number;
  failedExports: number;
  storageUsedBytes: number;
  recentExports: ExportRequest[];
}
