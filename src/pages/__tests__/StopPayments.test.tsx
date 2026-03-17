import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useStopPayments', () => ({
  useStopPayments: vi.fn(() => ({ data: { stopPayments: [] }, isLoading: false })),
  useCreateStopPayment: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCancelStopPayment: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRenewStopPayment: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useStopPaymentFee: vi.fn(() => ({ data: { feeCents: 3000 } })),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({ data: { accounts: [] }, isLoading: false })),
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

vi.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'app-shell' }, children),
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

describe('StopPayments', () => {
  it('renders without crashing', async () => {
    const { default: StopPayments } = await import('../StopPayments');
    const { container } = render(createElement(StopPayments), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: StopPayments } = await import('../StopPayments');
    render(createElement(StopPayments), { wrapper: createWrapper() });
    expect(screen.getByText('Stop Payments')).toBeTruthy();
  });

  it('shows new stop payment button', async () => {
    const { default: StopPayments } = await import('../StopPayments');
    render(createElement(StopPayments), { wrapper: createWrapper() });
    expect(screen.getByText('New Stop Payment')).toBeTruthy();
  });
});
