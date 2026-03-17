import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useCheckOrders', () => ({
  useCheckStyles: vi.fn(() => ({ data: { styles: [] }, isLoading: false })),
  useCheckOrderConfig: vi.fn(() => ({ data: { shippingOptions: [], quantities: [50, 100, 150, 200] } })),
  useCheckOrders: vi.fn(() => ({ data: { orders: [] }, isLoading: false })),
  useCreateCheckOrder: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCancelCheckOrder: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({ data: { accounts: [] }, isLoading: false })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
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

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('CheckOrdering', () => {
  it('renders without crashing', async () => {
    const { default: CheckOrdering } = await import('../CheckOrdering');
    const { container } = render(createElement(CheckOrdering), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: CheckOrdering } = await import('../CheckOrdering');
    render(createElement(CheckOrdering), { wrapper: createWrapper() });
    expect(screen.getByText('Order Checks')).toBeTruthy();
  });

  it('shows check designs tab', async () => {
    const { default: CheckOrdering } = await import('../CheckOrdering');
    render(createElement(CheckOrdering), { wrapper: createWrapper() });
    expect(screen.getByText('Check Designs')).toBeTruthy();
  });
});
