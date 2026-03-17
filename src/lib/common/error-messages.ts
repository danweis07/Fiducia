/**
 * Centralized Error → User-Friendly Message Mapping
 *
 * Maps every BankingErrorCode to a user-facing message using i18n translation
 * keys from the 'errors' namespace. Falls back to English when translations
 * are unavailable.
 *
 * This is consumed by the useErrorHandler hook so that error handling
 * is consistent across all pages and features.
 */

import i18n from '@/lib/i18n';
import type { ErrorCode } from './error-codes';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorMessage {
  title: string;
  message: string;
  action: string;
  severity: ErrorSeverity;
}

const severityMap: Record<string, ErrorSeverity> = {
  AUTH_REQUIRED: 'warning',
  AUTH_EXPIRED: 'warning',
  AUTH_MFA_REQUIRED: 'info',
  AUTH_FORBIDDEN: 'error',
  ACCOUNT_NOT_FOUND: 'error',
  ACCOUNT_FROZEN: 'error',
  ACCOUNT_CLOSED: 'error',
  INSUFFICIENT_FUNDS: 'error',
  TRANSFER_LIMIT_EXCEEDED: 'error',
  TRANSFER_INVALID_AMOUNT: 'warning',
  TRANSFER_SAME_ACCOUNT: 'warning',
  TRANSFER_CUTOFF_PASSED: 'info',
  TRANSFER_NOT_FOUND: 'error',
  BILL_NOT_FOUND: 'error',
  BILL_ALREADY_PAID: 'info',
  BILL_PAST_DUE: 'warning',
  CARD_NOT_FOUND: 'error',
  CARD_ALREADY_LOCKED: 'info',
  CARD_LIMIT_INVALID: 'warning',
  RDC_IMAGE_QUALITY: 'warning',
  RDC_AMOUNT_EXCEEDED: 'error',
  RDC_DUPLICATE_CHECK: 'error',
  VALIDATION_ERROR: 'warning',
  INVALID_INPUT: 'warning',
  RATE_LIMITED: 'warning',
  INTERNAL_ERROR: 'error',
  SERVICE_UNAVAILABLE: 'error',
  GATEWAY_ERROR: 'error',
};

/**
 * Get the user-friendly error message for a given error code.
 * Uses i18n 'errors' namespace for translated strings.
 * Falls back to a generic message for unknown codes.
 */
export function getErrorMessage(code: string): ErrorMessage {
  const t = i18n.getFixedT(null, 'errors');

  const titleKey = `${code}.title`;
  const messageKey = `${code}.message`;
  const actionKey = `${code}.action`;

  const title = t(titleKey, { defaultValue: '' });
  const hasTranslation = title !== '' && title !== titleKey;

  if (hasTranslation) {
    return {
      title,
      message: t(messageKey),
      action: t(actionKey),
      severity: severityMap[code as ErrorCode] ?? 'error',
    };
  }

  // Fallback for unknown error codes
  return {
    title: t('fallback.title', 'Something went wrong'),
    message: t('fallback.message', 'An unexpected error occurred. Please try again.'),
    action: t('fallback.action', 'Try again'),
    severity: 'error',
  };
}

/**
 * Extract an error code from various error shapes (API response, Error object, string).
 */
export function extractErrorCode(error: unknown): string | null {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.code === 'string') return obj.code;
    if (typeof obj.errorCode === 'string') return obj.errorCode;
    if (obj.error && typeof obj.error === 'object') {
      const inner = obj.error as Record<string, unknown>;
      if (typeof inner.code === 'string') return inner.code;
    }
  }
  return null;
}
