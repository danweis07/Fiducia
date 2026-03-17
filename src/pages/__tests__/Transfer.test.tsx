import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock gateway
vi.mock('@/lib/gateway', () => ({
  gateway: { request: vi.fn().mockResolvedValue({}) },
}));

// Mock hooks
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: {
      accounts: [
        { id: 'acct-1', nickname: 'Checking', accountNumberMasked: '****1234', availableBalanceCents: 250000, type: 'checking' },
        { id: 'acct-2', nickname: 'Savings', accountNumberMasked: '****5678', availableBalanceCents: 500000, type: 'savings' },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTransfer', () => ({
  useCreateTransfer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useBeneficiaries', () => ({
  useBeneficiaries: () => ({
    data: { beneficiaries: [] },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useStandingInstructions', () => ({
  useStandingInstructions: () => ({
    data: { instructions: [] },
    isLoading: false,
  }),
  useUpdateStandingInstruction: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({ handleError: vi.fn() }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('Transfer page', () => {
  it('renders without crashing', async () => {
    const { default: Transfer } = await import('../Transfer');
    const { container } = render(createElement(Transfer), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('displays the Transfer Money heading', async () => {
    const { default: Transfer } = await import('../Transfer');
    render(createElement(Transfer), { wrapper: createWrapper() });
    expect(screen.getByText('Transfer Money')).toBeTruthy();
  });

  it('shows From Account card on step 1', async () => {
    const { default: Transfer } = await import('../Transfer');
    render(createElement(Transfer), { wrapper: createWrapper() });
    expect(screen.getByText('From Account')).toBeTruthy();
  });
});
