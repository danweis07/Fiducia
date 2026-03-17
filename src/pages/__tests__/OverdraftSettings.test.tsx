import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useOverdraft', () => ({
  useOverdraftSettings: vi.fn(() => ({ data: { settings: null }, isLoading: false })),
  useUpdateOverdraftSettings: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useOverdraftHistory: vi.fn(() => ({ data: { events: [] }, isLoading: false })),
  useOverdraftFeeSchedule: vi.fn(() => ({ data: { feeSchedule: [] }, isLoading: false })),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({
    data: {
      accounts: [
        { id: 'acc-1', type: 'checking', nickname: 'Main Checking', accountNumberMasked: '****1234', status: 'active' },
        { id: 'acc-2', type: 'savings', nickname: 'Savings', accountNumberMasked: '****5678', status: 'active' },
      ],
    },
    isLoading: false,
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

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

describe('OverdraftSettings', () => {
  it('renders without crashing', async () => {
    const { default: OverdraftSettings } = await import('../OverdraftSettings');
    const { container } = render(createElement(OverdraftSettings), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: OverdraftSettings } = await import('../OverdraftSettings');
    render(createElement(OverdraftSettings), { wrapper: createWrapper() });
    expect(screen.getByText('Overdraft Protection')).toBeTruthy();
  });

  it('shows account selector description', async () => {
    const { default: OverdraftSettings } = await import('../OverdraftSettings');
    render(createElement(OverdraftSettings), { wrapper: createWrapper() });
    expect(screen.getByText('Choose an account to configure overdraft protection')).toBeTruthy();
  });

  it('shows the select account placeholder', async () => {
    const { default: OverdraftSettings } = await import('../OverdraftSettings');
    render(createElement(OverdraftSettings), { wrapper: createWrapper() });
    expect(screen.getByText('Select an account')).toBeTruthy();
  });

  it('does not show settings card when no account is selected', async () => {
    const { default: OverdraftSettings } = await import('../OverdraftSettings');
    render(createElement(OverdraftSettings), { wrapper: createWrapper() });
    expect(screen.queryByText('Protection Settings')).toBeNull();
  });
});
