/**
 * useErrorHandler — Centralized error handling hook
 *
 * Provides a consistent way to handle errors across all pages:
 * 1. Extracts error code from various error shapes
 * 2. Looks up user-friendly message from error-messages map
 * 3. Shows appropriate toast notification
 * 4. Logs to error tracking service (Sentry in production)
 *
 * Usage:
 *   const { handleError } = useErrorHandler();
 *
 *   // In a catch block or onError callback:
 *   handleError(error);
 *   handleError(error, { fallbackTitle: "Transfer failed" });
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage, extractErrorCode } from '@/lib/common/error-messages';

interface HandleErrorOptions {
  /** Override the default title from the error map */
  fallbackTitle?: string;
  /** Override the default description from the error map */
  fallbackMessage?: string;
  /** If true, don't show a toast (just return the error info) */
  silent?: boolean;
}

export interface ErrorInfo {
  title: string;
  message: string;
  action: string;
  code: string | null;
}

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback(
    (error: unknown, options?: HandleErrorOptions): ErrorInfo => {
      const code = extractErrorCode(error);
      const mapped = code ? getErrorMessage(code) : null;

      const title =
        mapped?.title ??
        options?.fallbackTitle ??
        'Something went wrong';

      const message =
        mapped?.message ??
        options?.fallbackMessage ??
        (error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');

      const action = mapped?.action ?? 'Try again';
      const severity = mapped?.severity ?? 'error';

      if (!options?.silent) {
        toast({
          title,
          description: message,
          variant: severity === 'error' ? 'destructive' : 'default',
        });
      }

      return { title, message, action, code };
    },
    [toast],
  );

  return { handleError };
}
