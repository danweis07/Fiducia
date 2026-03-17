import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useDisputes', () => ({
  disputeKeys: { all: ['disputes'] },
  useDisputes: vi.fn(() => ({ data: { disputes: [] }, isLoading: false })),
  useDispute: vi.fn(() => ({ data: null, isLoading: false })),
  useFileDispute: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useAddDisputeDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCancelDispute: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDisputeTimeline: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock('@/hooks/useTransactions', () => ({
  useTransactions: vi.fn(() => ({ data: { transactions: [] } })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('@/lib/common/currency', () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
}));

// Mock AppShell since it depends on auth context, header, etc.
vi.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'app-shell' }, children),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('Disputes', () => {
  it('renders without crashing', async () => {
    const { default: Disputes } = await import('../Disputes');
    const { container } = render(createElement(Disputes), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: Disputes } = await import('../Disputes');
    render(createElement(Disputes), { wrapper: createWrapper() });
    expect(screen.getByText('Transaction Disputes')).toBeTruthy();
  });

  it('shows file dispute button', async () => {
    const { default: Disputes } = await import('../Disputes');
    render(createElement(Disputes), { wrapper: createWrapper() });
    expect(screen.getByText('File Dispute')).toBeTruthy();
  });

  it('shows empty state when no disputes', async () => {
    const { default: Disputes } = await import('../Disputes');
    render(createElement(Disputes), { wrapper: createWrapper() });
    expect(screen.getByText('No disputes found.')).toBeTruthy();
  });
});
