/**
 * Shared Retry Utility for Edge Functions
 *
 * Provides exponential backoff retry logic for API calls.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  context?: string;
}

const DEFAULT_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateDelay(
  attempt: number,
  initialDelayMs = DEFAULT_OPTIONS.initialDelayMs,
  maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
): number {
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt - 1);
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Check if HTTP status is retryable
 */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Fetch with retry logic for transient failures
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: RetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelayMs = DEFAULT_OPTIONS.initialDelayMs,
    maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
    context = "fetch",
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Success or non-retryable error
      if (response.ok || !isRetryableStatus(response.status)) {
        return response;
      }

      // Retryable HTTP error
      const errorText = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${errorText}`);
      console.warn(`Retry attempt ${attempt}/${maxRetries} failed with status ${response.status}`);
    } catch (error) {
      // Network error
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Retry attempt ${attempt}/${maxRetries} failed with network error`);
    }

    // Wait before retry (unless this was the last attempt)
    if (attempt < maxRetries) {
      const delayMs = calculateDelay(attempt, initialDelayMs, maxDelayMs);
      console.warn(
        `Waiting ${Math.round(delayMs)}ms before retry attempt ${attempt + 1}/${maxRetries}`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error(`${context}: All ${maxRetries} retry attempts failed`);
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retryOptions: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelayMs = DEFAULT_OPTIONS.initialDelayMs,
    maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
    context = "operation",
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Retry attempt ${attempt}/${maxRetries} failed with error`);

      if (attempt < maxRetries) {
        const delayMs = calculateDelay(attempt, initialDelayMs, maxDelayMs);
        console.warn(
          `Waiting ${Math.round(delayMs)}ms before retry attempt ${attempt + 1}/${maxRetries}`,
        );
        await sleep(delayMs);
      }
    }
  }

  throw lastError ?? new Error(`${context}: All ${maxRetries} retry attempts failed`);
}
