import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/sentry', () => ({
  captureError: vi.fn(),
}));

import { ErrorBoundary, PageErrorBoundary } from '../ErrorBoundary';

// A component that always throws
function Thrower({ message = 'Test error' }: { message?: string }) {
  throw new Error(message);
}

// Suppress console.error for expected errors
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('renders default fallback on error', () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
    expect(screen.getByText('Go Home')).toBeTruthy();
  });

  it('renders custom fallback on error', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error</div>}>
        <Thrower />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom Error')).toBeTruthy();
  });

  it('calls onError callback', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Thrower message="callback test" />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'callback test' }),
      expect.any(Object)
    );
  });

  it('shows network error message for dynamic import failures', () => {
    render(
      <ErrorBoundary>
        <Thrower message="Failed to fetch dynamically imported module" />
      </ErrorBoundary>
    );
    expect(screen.getByText(/network issue/)).toBeTruthy();
  });
});

describe('PageErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <PageErrorBoundary>
        <div>Page Content</div>
      </PageErrorBoundary>
    );
    expect(screen.getByText('Page Content')).toBeTruthy();
  });

  it('renders page-level error UI on error', () => {
    render(
      <PageErrorBoundary>
        <Thrower />
      </PageErrorBoundary>
    );
    expect(screen.getByText('Page Failed to Load')).toBeTruthy();
    expect(screen.getByText('Reload Page')).toBeTruthy();
  });
});
