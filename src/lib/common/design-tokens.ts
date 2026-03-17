/**
 * Centralized Design Tokens
 *
 * Single source of truth for semantic color mappings used across all components.
 * Maps status strings and categories to CSS classes that reference the theme's
 * CSS custom properties (defined in index.css), ensuring dark mode, high-contrast,
 * and tenant theming all work correctly.
 *
 * RULE: Never use raw Tailwind color utilities (bg-red-100, text-green-700, etc.)
 *       for status/semantic colors. Always use these tokens instead.
 */

// ---------------------------------------------------------------------------
// Status → Color class mappings (badges, icons, indicators)
// ---------------------------------------------------------------------------

export type StatusSeverity = "success" | "warning" | "error" | "info" | "neutral";

export interface StatusStyle {
  /** Background + text + border classes for badge/pill usage */
  badge: string;
  /** Icon container classes (rounded-full background + icon color) */
  icon: string;
  /** Text-only class for inline text coloring */
  text: string;
  /** Semantic severity for programmatic use */
  severity: StatusSeverity;
}

const success: StatusStyle = {
  badge: "bg-risk-low-light text-risk-low border-risk-low/20",
  icon: "bg-risk-low-light text-risk-low",
  text: "text-status-success",
  severity: "success",
};

const warning: StatusStyle = {
  badge: "bg-risk-high-light text-risk-high border-risk-high/20",
  icon: "bg-risk-high-light text-risk-high",
  text: "text-status-warning",
  severity: "warning",
};

const error: StatusStyle = {
  badge: "bg-risk-critical-light text-risk-critical border-risk-critical/20",
  icon: "bg-risk-critical-light text-risk-critical",
  text: "text-destructive",
  severity: "error",
};

const info: StatusStyle = {
  badge: "bg-risk-medium-light text-risk-medium border-risk-medium/20",
  icon: "bg-risk-medium-light text-risk-medium",
  text: "text-primary",
  severity: "info",
};

const neutral: StatusStyle = {
  badge: "bg-muted text-muted-foreground border-border",
  icon: "bg-muted text-muted-foreground",
  text: "text-muted-foreground",
  severity: "neutral",
};

/**
 * Maps any status string to a semantic style.
 * Covers all statuses used across banking pages: transactions, transfers,
 * bill pay, cards, deposits, accounts, and standing instructions.
 */
const statusMap: Record<string, StatusStyle> = {
  // Success / Positive
  posted: success,
  completed: success,
  active: success,
  paid: success,
  approved: success,
  verified: success,

  // Warning / Pending
  pending: warning,
  processing: warning,
  reviewing: warning,
  scheduled: info,

  // Error / Negative
  declined: error,
  failed: error,
  rejected: error,
  overdue: error,
  delinquent: error,

  // Neutral / Inactive
  cancelled: neutral,
  frozen: neutral,
  locked: neutral,
  paused: neutral,
  closed: neutral,
  draft: neutral,
  archived: neutral,
  expired: neutral,
  queued: neutral,
  invited: neutral,

  // Additional success
  published: success,
  concluded: success,
  activated: success,
  authorized: success,
  sent: success,
  delivered: success,
  read: success,

  // Additional error
  suspended: error,
  revoked: error,

  // Additional info
  running: info,
};

/**
 * Get the semantic style for a status string.
 * Falls back to neutral for unknown statuses.
 */
export function getStatusStyle(status: string): StatusStyle {
  return statusMap[status.toLowerCase()] ?? neutral;
}

// ---------------------------------------------------------------------------
// Transaction direction colors
// ---------------------------------------------------------------------------

export const transactionColors = {
  credit: {
    icon: "bg-risk-low-light text-risk-low",
    text: "text-status-success",
  },
  debit: {
    icon: "bg-risk-critical-light text-risk-critical",
    text: "",
  },
} as const;

// ---------------------------------------------------------------------------
// Quick action / category colors (Dashboard, More menu)
// Uses the theme's semantic palette to avoid arbitrary hardcoded colors.
// ---------------------------------------------------------------------------

export const actionColors = {
  transfer: "bg-risk-medium-light text-risk-medium",
  billPay: "bg-risk-low-light text-risk-low",
  deposit: "bg-primary/10 text-primary",
  cards: "bg-risk-high-light text-risk-high",
  findAtm: "bg-risk-critical-light text-risk-critical",
} as const;

// ---------------------------------------------------------------------------
// Deposit capture state colors
// ---------------------------------------------------------------------------

export const captureColors = {
  captured: {
    border: "border-status-success",
    bg: "bg-risk-low-light",
    icon: "text-status-success",
    text: "text-status-success font-medium",
  },
  empty: {
    border: "border-muted-foreground/25",
    bg: "bg-muted/30",
    icon: "text-muted-foreground",
    text: "text-muted-foreground",
  },
} as const;

// ---------------------------------------------------------------------------
// Elevation / Shadow tokens
// ---------------------------------------------------------------------------

export const elevation = {
  /** Subtle shadow for cards in default state */
  card: "shadow-sm",
  /** Medium shadow for dropdowns, popovers */
  dropdown: "shadow-md",
  /** Elevated shadow for modals, dialogs */
  modal: "shadow-lg",
  /** Top-level shadow for sticky headers */
  header: "shadow-md",
} as const;
