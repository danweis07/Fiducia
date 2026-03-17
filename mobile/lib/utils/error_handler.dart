import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import 'error_messages.dart';

/// Centralized error handler for Flutter — mirrors `useErrorHandler` on web.
///
/// Shows a SnackBar with user-friendly messaging derived from the error code.
///
/// Usage:
///   ErrorHandler.show(context, error);
///   ErrorHandler.show(context, error, fallbackTitle: 'Transfer failed');
class ErrorHandler {
  ErrorHandler._();

  /// Show an error SnackBar with user-friendly message.
  static void show(
    BuildContext context,
    dynamic error, {
    String? fallbackTitle,
    String? fallbackMessage,
  }) {
    final code = extractErrorCode(error);
    final mapped = code != null ? getErrorMessage(code) : null;

    final title = mapped?.title ?? fallbackTitle ?? 'Something went wrong';
    final message = mapped?.message ??
        fallbackMessage ??
        (error is Exception ? error.toString() : 'An unexpected error occurred.');
    final severity = mapped?.severity ?? ErrorSeverity.error;

    final backgroundColor = switch (severity) {
      ErrorSeverity.error => DesignTokens.statusError,
      ErrorSeverity.warning => DesignTokens.statusWarning,
      ErrorSeverity.info => DesignTokens.statusInfo,
    };

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: backgroundColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
            ),
            const SizedBox(height: 2),
            Text(
              message,
              style: const TextStyle(fontSize: 13, color: Colors.white70),
            ),
          ],
        ),
        duration: const Duration(seconds: 4),
      ),
    );
  }
}
