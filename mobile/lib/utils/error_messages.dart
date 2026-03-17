/// Centralized error-to-message mapping — mirrors `src/lib/common/error-messages.ts` on web.
///
/// Every banking error code maps to a user-friendly message with:
/// - title: Short headline for SnackBar/dialog
/// - message: Helpful description
/// - action: Suggested next step
/// - severity: Controls SnackBar style

enum ErrorSeverity { error, warning, info }

class ErrorMessage {
  final String title;
  final String message;
  final String action;
  final ErrorSeverity severity;

  const ErrorMessage({
    required this.title,
    required this.message,
    required this.action,
    required this.severity,
  });
}

const _errorMessages = <String, ErrorMessage>{
  // Auth
  'AUTH_REQUIRED': ErrorMessage(title: 'Sign in required', message: 'Your session has ended. Please sign in to continue.', action: 'Sign in', severity: ErrorSeverity.warning),
  'AUTH_EXPIRED': ErrorMessage(title: 'Session expired', message: 'Your session has expired for security. Please sign in again.', action: 'Sign in again', severity: ErrorSeverity.warning),
  'AUTH_MFA_REQUIRED': ErrorMessage(title: 'Verification needed', message: 'Please complete multi-factor authentication to proceed.', action: 'Verify identity', severity: ErrorSeverity.info),
  'AUTH_FORBIDDEN': ErrorMessage(title: 'Access denied', message: 'You do not have permission to perform this action.', action: 'Contact support', severity: ErrorSeverity.error),

  // Account
  'ACCOUNT_NOT_FOUND': ErrorMessage(title: 'Account not found', message: 'The account you are looking for could not be found.', action: 'Go to accounts', severity: ErrorSeverity.error),
  'ACCOUNT_FROZEN': ErrorMessage(title: 'Account frozen', message: 'This account has been frozen and cannot process transactions at this time.', action: 'Contact support', severity: ErrorSeverity.error),
  'ACCOUNT_CLOSED': ErrorMessage(title: 'Account closed', message: 'This account has been closed and is no longer active.', action: 'Go to accounts', severity: ErrorSeverity.error),
  'INSUFFICIENT_FUNDS': ErrorMessage(title: 'Insufficient funds', message: 'There are not enough funds in this account to complete the transaction.', action: 'Check balance', severity: ErrorSeverity.error),

  // Transfer
  'TRANSFER_LIMIT_EXCEEDED': ErrorMessage(title: 'Transfer limit exceeded', message: 'This transfer exceeds your daily or per-transaction limit.', action: 'Try a smaller amount', severity: ErrorSeverity.error),
  'TRANSFER_INVALID_AMOUNT': ErrorMessage(title: 'Invalid amount', message: 'Please enter a valid transfer amount greater than zero.', action: 'Enter a valid amount', severity: ErrorSeverity.warning),
  'TRANSFER_SAME_ACCOUNT': ErrorMessage(title: 'Same account selected', message: 'The source and destination accounts must be different.', action: 'Select a different account', severity: ErrorSeverity.warning),
  'TRANSFER_CUTOFF_PASSED': ErrorMessage(title: 'Cutoff time passed', message: 'The daily processing cutoff has passed. Your transfer will be processed on the next business day.', action: 'Schedule for tomorrow', severity: ErrorSeverity.info),
  'TRANSFER_NOT_FOUND': ErrorMessage(title: 'Transfer not found', message: 'The transfer you are looking for could not be found.', action: 'View transfers', severity: ErrorSeverity.error),

  // Bill Pay
  'BILL_NOT_FOUND': ErrorMessage(title: 'Bill not found', message: 'The bill or payee you are looking for could not be found.', action: 'View payees', severity: ErrorSeverity.error),
  'BILL_ALREADY_PAID': ErrorMessage(title: 'Already paid', message: 'This bill has already been paid.', action: 'View payment history', severity: ErrorSeverity.info),
  'BILL_PAST_DUE': ErrorMessage(title: 'Bill past due', message: 'This bill is past its due date. Late fees may apply.', action: 'Pay now', severity: ErrorSeverity.warning),

  // Card
  'CARD_NOT_FOUND': ErrorMessage(title: 'Card not found', message: 'The card you are looking for could not be found.', action: 'View cards', severity: ErrorSeverity.error),
  'CARD_ALREADY_LOCKED': ErrorMessage(title: 'Card already locked', message: 'This card is already locked.', action: 'Unlock card', severity: ErrorSeverity.info),
  'CARD_LIMIT_INVALID': ErrorMessage(title: 'Invalid card limit', message: 'The spending limit you entered is not valid.', action: 'Adjust limit', severity: ErrorSeverity.warning),

  // RDC
  'RDC_IMAGE_QUALITY': ErrorMessage(title: 'Image quality issue', message: 'The check image could not be read clearly. Please retake the photo in good lighting.', action: 'Retake photo', severity: ErrorSeverity.warning),
  'RDC_AMOUNT_EXCEEDED': ErrorMessage(title: 'Deposit limit exceeded', message: 'This check exceeds your mobile deposit limit.', action: 'Visit a branch', severity: ErrorSeverity.error),
  'RDC_DUPLICATE_CHECK': ErrorMessage(title: 'Duplicate check detected', message: 'This check appears to have already been deposited.', action: 'Check deposit history', severity: ErrorSeverity.error),

  // Validation
  'VALIDATION_ERROR': ErrorMessage(title: 'Validation error', message: 'Some fields contain invalid data. Please review and correct them.', action: 'Review form', severity: ErrorSeverity.warning),
  'INVALID_INPUT': ErrorMessage(title: 'Invalid input', message: 'Please check your input and try again.', action: 'Fix input', severity: ErrorSeverity.warning),

  // Rate Limiting
  'RATE_LIMITED': ErrorMessage(title: 'Too many requests', message: 'You have made too many requests. Please wait a moment and try again.', action: 'Wait and retry', severity: ErrorSeverity.warning),

  // System
  'INTERNAL_ERROR': ErrorMessage(title: 'Something went wrong', message: 'An unexpected error occurred. Our team has been notified.', action: 'Try again', severity: ErrorSeverity.error),
  'SERVICE_UNAVAILABLE': ErrorMessage(title: 'Service unavailable', message: 'This service is temporarily unavailable. Please try again in a few minutes.', action: 'Try again later', severity: ErrorSeverity.error),
  'GATEWAY_ERROR': ErrorMessage(title: 'Connection error', message: 'We could not connect to the banking service. Please check your connection and try again.', action: 'Try again', severity: ErrorSeverity.error),
};

const _fallback = ErrorMessage(
  title: 'Something went wrong',
  message: 'An unexpected error occurred. Please try again.',
  action: 'Try again',
  severity: ErrorSeverity.error,
);

/// Get a user-friendly error message for a given error code.
ErrorMessage getErrorMessage(String code) => _errorMessages[code] ?? _fallback;

/// Extract an error code from a dynamic error object.
String? extractErrorCode(dynamic error) {
  if (error is String) return error;
  if (error is Map) {
    if (error['code'] is String) return error['code'] as String;
    if (error['errorCode'] is String) return error['errorCode'] as String;
    if (error['error'] is Map) {
      final inner = error['error'] as Map;
      if (inner['code'] is String) return inner['code'] as String;
    }
  }
  return null;
}
