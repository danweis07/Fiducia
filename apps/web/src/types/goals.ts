/**
 * Savings Goal Types
 *
 * Goal entities, contributions, and summaries.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// SAVINGS GOALS
// =============================================================================

export type GoalStatus = "active" | "completed" | "paused" | "cancelled";

export interface SavingsGoal {
  id: string;
  name: string;
  iconEmoji: string | null;
  targetAmountCents: number;
  currentAmountCents: number;
  progressPercent: number;
  accountId: string;
  accountMasked: string;
  targetDate: string | null;
  isOnTrack: boolean;
  status: GoalStatus;
  autoContribute: boolean;
  autoContributeAmountCents: number | null;
  autoContributeFrequency: "weekly" | "biweekly" | "monthly" | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amountCents: number;
  type: "manual" | "automatic" | "withdrawal";
  createdAt: string;
}

export interface GoalSummary {
  totalSavedCents: number;
  activeGoals: number;
  completedGoals: number;
  onTrackCount: number;
  behindCount: number;
}
