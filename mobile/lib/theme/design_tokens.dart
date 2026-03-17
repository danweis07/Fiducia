import 'package:flutter/material.dart';

/// Centralized design tokens — mirrors `src/lib/common/design-tokens.ts` on web.
///
/// Single source of truth for semantic colors used across all screens.
/// Ensures visual consistency between web and mobile platforms.
class DesignTokens {
  DesignTokens._();

  // ─── Primary palette (aligned with web CSS custom properties) ────────
  /// Navy blue — matches web `--primary: 215 50% 25%` ≈ #203A61
  static const Color primary = Color(0xFF203A61);

  /// Accent gold — matches web `--accent: 38 75% 50%`
  static const Color accent = Color(0xFFDFA515);

  // ─── Risk / Severity colors ──────────────────────────────────────────

  static const Color riskCritical = Color(0xFFEF4444);
  static const Color riskCriticalLight = Color(0xFFFEF2F2);

  static const Color riskHigh = Color(0xFFF59E0B);
  static const Color riskHighLight = Color(0xFFFEFCE8);

  static const Color riskMedium = Color(0xFF3B82F6);
  static const Color riskMediumLight = Color(0xFFEFF6FF);

  static const Color riskLow = Color(0xFF10B981);
  static const Color riskLowLight = Color(0xFFECFDF5);

  // ─── Status colors ───────────────────────────────────────────────────

  static const Color statusSuccess = Color(0xFF16A34A);
  static const Color statusWarning = Color(0xFFD97706);
  static const Color statusError = Color(0xFFDC2626);
  static const Color statusInfo = Color(0xFF203A61);

  // ─── Transaction direction ───────────────────────────────────────────

  static const Color credit = riskLow;
  static const Color creditBg = riskLowLight;
  static const Color debit = riskCritical;
  static const Color debitBg = riskCriticalLight;

  // ─── Status → Color mapping ──────────────────────────────────────────

  /// Returns (background, foreground) colors for a status string.
  static (Color bg, Color fg) statusColors(String status) {
    switch (status.toLowerCase()) {
      // Success states
      case 'posted':
      case 'completed':
      case 'active':
      case 'paid':
      case 'approved':
      case 'verified':
        return (riskLowLight, riskLow);

      // Warning states
      case 'pending':
      case 'processing':
      case 'reviewing':
        return (riskHighLight, riskHigh);

      // Info states
      case 'scheduled':
        return (riskMediumLight, riskMedium);

      // Error states
      case 'declined':
      case 'failed':
      case 'rejected':
      case 'overdue':
      case 'delinquent':
        return (riskCriticalLight, riskCritical);

      // Neutral states
      case 'cancelled':
      case 'frozen':
      case 'locked':
      case 'paused':
      case 'closed':
      default:
        return (const Color(0xFFF3F4F6), const Color(0xFF6B7280));
    }
  }

  // ─── Quick action category colors ────────────────────────────────────

  static const Color actionTransfer = riskMedium;
  static const Color actionTransferBg = riskMediumLight;
  static const Color actionBillPay = riskLow;
  static const Color actionBillPayBg = riskLowLight;
  static const Color actionDeposit = primary;
  static const Color actionCards = riskHigh;
  static const Color actionCardsBg = riskHighLight;
  static const Color actionFindAtm = riskCritical;
  static const Color actionFindAtmBg = riskCriticalLight;
}
