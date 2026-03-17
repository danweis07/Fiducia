import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({
    data: {
      accounts: [
        { id: 'acct-1', nickname: 'Checking', accountNumberMasked: '****1234', type: 'checking' },
      ],
    },
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useRDC', () => ({
  useSubmitDeposit: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: vi.fn(() => ({ handleError: vi.fn(() => ({ message: 'Error' })) })),
}));

vi.mock('@/lib/common/currency', () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
  parseToCents: vi.fn((str: string) => Math.round(parseFloat(str || '0') * 100)),
}));

vi.mock('@/lib/common/design-tokens', () => ({
  captureColors: {
    captured: { border: '', bg: '', icon: '', text: '' },
    empty: { border: '', bg: '' },
  },
}));

vi.mock('@/components/common/LoadingSkeleton', () => ({
  PageSkeleton: () => createElement('div', null, 'Loading...'),
}));

vi.mock('@/components/common/SuccessAnimation', () => ({
  SuccessAnimation: ({ title }: { title: string; children?: React.ReactNode }) => createElement('div', null, title),
}));

vi.mock('@/components/common/Spinner', () => ({
  Spinner: () => createElement('div', null, 'Spinner'),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('Deposit', () => {
  it('renders without crashing', async () => {
    const { default: Deposit } = await import('../Deposit');
    const { container } = render(createElement(Deposit), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: Deposit } = await import('../Deposit');
    render(createElement(Deposit), { wrapper: createWrapper() });
    expect(screen.getByText('Deposit Check')).toBeTruthy();
  });

  it('shows front and back capture sections', async () => {
    const { default: Deposit } = await import('../Deposit');
    render(createElement(Deposit), { wrapper: createWrapper() });
    expect(screen.getByText('Front of Check')).toBeTruthy();
    expect(screen.getByText('Back of Check')).toBeTruthy();
  });
});
