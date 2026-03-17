import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useCards', () => ({
  useCards: vi.fn(() => ({ data: { cards: [] }, isLoading: false, error: null })),
  useLockCard: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUnlockCard: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useSetCardLimit: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: vi.fn(() => ({ handleError: vi.fn() })),
}));

vi.mock('@/lib/common/currency', () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
}));

vi.mock('@/lib/common/design-tokens', () => ({
  getStatusStyle: vi.fn(() => ({ badge: '', icon: '', text: '' })),
}));

vi.mock('@/components/common/LoadingSkeleton', () => ({
  PageSkeleton: () => createElement('div', null, 'Loading...'),
}));

vi.mock('@/components/common/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => createElement('div', null, title),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('Cards', () => {
  it('renders without crashing', async () => {
    const { default: Cards } = await import('../Cards');
    const { container } = render(createElement(Cards), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: Cards } = await import('../Cards');
    render(createElement(Cards), { wrapper: createWrapper() });
    expect(screen.getByText('Card Management')).toBeTruthy();
  });

  it('shows empty state when no cards', async () => {
    const { default: Cards } = await import('../Cards');
    render(createElement(Cards), { wrapper: createWrapper() });
    expect(screen.getByText('No cards')).toBeTruthy();
  });
});
