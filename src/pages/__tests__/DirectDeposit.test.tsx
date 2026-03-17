import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useDirectDeposit', () => ({
  useEmployers: vi.fn(() => ({ data: { employers: [] }, isLoading: false })),
  useInitiateSwitch: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSwitches: vi.fn(() => ({ data: { switches: [] }, isLoading: false })),
  useCancelSwitch: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
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

describe('DirectDeposit', () => {
  it('renders without crashing', async () => {
    const { default: DirectDeposit } = await import('../DirectDeposit');
    const { container } = render(createElement(DirectDeposit), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: DirectDeposit } = await import('../DirectDeposit');
    render(createElement(DirectDeposit), { wrapper: createWrapper() });
    expect(screen.getByText('Direct Deposit')).toBeTruthy();
  });

  it('shows the switch tab', async () => {
    const { default: DirectDeposit } = await import('../DirectDeposit');
    render(createElement(DirectDeposit), { wrapper: createWrapper() });
    expect(screen.getByText('Switch Direct Deposit')).toBeTruthy();
  });
});
