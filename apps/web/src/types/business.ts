/**
 * Business Orchestration Types
 *
 * Invoice processing, cash sweep, approval workflows,
 * cash flow forecasts, and treasury vaults.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// BUSINESS ORCHESTRATION — ZERO-TOUCH AP (INVOICE PROCESSOR)
// =============================================================================

export type InvoiceStatus = "pending" | "parsed" | "confirmed" | "scheduled" | "paid" | "failed";

export interface ParsedInvoice {
  id: string;
  fileName: string;
  vendorName: string;
  vendorAddress: string | null;
  amountCents: number;
  currency: string;
  dueDate: string;
  invoiceNumber: string | null;
  remittanceInfo: string | null;
  lineItems: InvoiceLineItem[];
  confidence: number;
  status: InvoiceStatus;
  suggestedAccountId: string | null;
  suggestedAccountName: string | null;
  availableBalanceCents: number | null;
  scheduledDate: string | null;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number | null;
  unitPriceCents: number | null;
  totalCents: number;
}

export interface InvoiceAnalysisResult {
  invoice: ParsedInvoice;
  matchedPayees: { payeeId: string; name: string; confidence: number }[];
}

// =============================================================================
// BUSINESS ORCHESTRATION — SMART SWEEP (CASH MANAGEMENT)
// =============================================================================

export type SweepRuleStatus = "active" | "paused" | "disabled";
export type SweepFrequency = "daily" | "weekly" | "monthly" | "realtime";
export type SweepDirection = "sweep_out" | "sweep_in";

export interface CashSweepRule {
  id: string;
  name: string;
  sourceAccountId: string;
  sourceAccountName: string;
  destinationAccountId: string;
  destinationAccountName: string;
  thresholdCents: number;
  targetBalanceCents: number | null;
  direction: SweepDirection;
  frequency: SweepFrequency;
  status: SweepRuleStatus;
  lastExecutedAt: string | null;
  nextExecutionAt: string | null;
  totalSweptCents: number;
  sweepCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SweepExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  amountCents: number;
  sourceAccountName: string;
  destinationAccountName: string;
  direction: SweepDirection;
  status: "completed" | "failed" | "pending";
  executedAt: string;
  failureReason: string | null;
}

export interface SweepSummary {
  activeRules: number;
  totalSweptCents: number;
  totalSweepCount: number;
  estimatedYieldCents: number;
  recentExecutions: SweepExecution[];
}

// =============================================================================
// BUSINESS ORCHESTRATION — JUST-IN-TIME PERMISSIONS (APPROVAL WORKFLOW)
// =============================================================================

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired" | "cancelled";
export type ApprovalActionType =
  | "transfer"
  | "card_limit_increase"
  | "wire"
  | "ach"
  | "payment"
  | "account_access";

export interface ApprovalRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  approverId: string | null;
  approverName: string | null;
  actionType: ApprovalActionType;
  actionDescription: string;
  amountCents: number | null;
  currentLimitCents: number | null;
  requestedLimitCents: number | null;
  metadata: Record<string, unknown>;
  status: ApprovalStatus;
  expiresAt: string;
  respondedAt: string | null;
  denyReason: string | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalPolicy {
  id: string;
  name: string;
  actionType: ApprovalActionType;
  thresholdCents: number;
  approverRoles: string[];
  autoExpireMinutes: number;
  requireMfa: boolean;
  notifyChannels: ("push" | "email" | "sms" | "slack")[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalSummary {
  pendingCount: number;
  approvedToday: number;
  deniedToday: number;
  avgResponseMinutes: number;
  policies: ApprovalPolicy[];
}

// =============================================================================
// BUSINESS ORCHESTRATION — CASH FLOW FORECAST (LIQUIDITY DASHBOARD)
// =============================================================================

export interface CashFlowForecast {
  currentBalanceCents: number;
  projectedBalanceCents: number;
  projectedDate: string;
  avgDailyInflowCents: number;
  avgDailyOutflowCents: number;
  upcomingPayrollCents: number;
  upcomingBillsCents: number;
  runwayDays: number;
  dataPoints: CashFlowDataPoint[];
  insights: CashFlowInsight[];
}

export interface CashFlowDataPoint {
  date: string;
  balanceCents: number;
  inflowCents: number;
  outflowCents: number;
  isProjected: boolean;
}

export interface CashFlowInsight {
  type: "warning" | "opportunity" | "info";
  title: string;
  description: string;
  actionLabel: string | null;
  actionRoute: string | null;
}

// =============================================================================
// BUSINESS ORCHESTRATION — TREASURY-AS-A-SERVICE (VAULT YIELD OPTIMIZATION)
// =============================================================================

export type TreasuryVaultStatus = "active" | "pending" | "closed";

export interface TreasuryVault {
  id: string;
  name: string;
  providerName: string;
  balanceCents: number;
  apyBps: number;
  accruedInterestCents: number;
  status: TreasuryVaultStatus;
  linkedAccountId: string;
  linkedAccountName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreasurySummary {
  totalVaultBalanceCents: number;
  totalAccruedInterestCents: number;
  weightedAvgApyBps: number;
  vaults: TreasuryVault[];
}
