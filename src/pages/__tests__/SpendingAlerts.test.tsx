import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useSpendingAlerts', () => ({
  useSpendingAlerts: vi.fn(() => ({ data: { alerts: [] }, isLoading: false })),
  useCreateAlert: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateAlert: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteAlert: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useAlertHistory: vi.fn(() => ({ data: { events: [] } })),
  useAlertSummary: vi.fn(() => ({ data: null })),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({ data: { accounts: [] }, isLoading: false })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
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

describe('SpendingAlerts', () => {
  it('renders without crashing', async () => {
    const { default: SpendingAlertsPage } = await import('../SpendingAlerts');
    const { container } = render(createElement(SpendingAlertsPage), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: SpendingAlertsPage } = await import('../SpendingAlerts');
    render(createElement(SpendingAlertsPage), { wrapper: createWrapper() });
    expect(screen.getByText('Spending Alerts')).toBeTruthy();
  });

  it('shows new alert button', async () => {
    const { default: SpendingAlertsPage } = await import('../SpendingAlerts');
    render(createElement(SpendingAlertsPage), { wrapper: createWrapper() });
    expect(screen.getByText('New Alert')).toBeTruthy();
  });
});
