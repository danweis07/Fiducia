import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({}),
    loanProducts: {
      list: vi.fn().mockResolvedValue({ products: [] }),
    },
    loanOrigination: {
      getApplication: vi.fn().mockResolvedValue({}),
      createApplication: vi.fn().mockResolvedValue({}),
      createDocument: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock('@/hooks/useLoanOrigination', () => ({
  useLoanProducts: () => ({
    data: {
      products: [
        {
          id: 'auto-1',
          name: 'Auto Loan',
          shortName: 'Auto',
          description: 'Finance your vehicle',
          loanType: 'auto',
          interestRateBps: 599,
          rateType: 'fixed',
          minTermMonths: 12,
          maxTermMonths: 72,
          minAmountCents: 500000,
          maxAmountCents: 10000000,
          originationFeeBps: 0,
          latePaymentFeeCents: 2500,
          latePaymentGraceDays: 15,
          isActive: true,
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateLoanApplication: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGetLoanApplication: () => ({ data: null, isLoading: false }),
  useUploadLoanDocument: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'app-shell' }, children),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

import LoanApplication from '../LoanApplication';

describe('LoanApplication', () => {
  it('renders without crashing', () => {
    render(createElement(LoanApplication), { wrapper: createWrapper() });
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });

  it('renders the loan application heading', () => {
    render(createElement(LoanApplication), { wrapper: createWrapper() });
    expect(screen.getByText('Apply for a Loan')).toBeTruthy();
  });

  it('shows loan product selection on first step', () => {
    render(createElement(LoanApplication), { wrapper: createWrapper() });
    expect(screen.getByText('Choose Your Loan Type')).toBeTruthy();
  });

  it('displays available loan products', () => {
    render(createElement(LoanApplication), { wrapper: createWrapper() });
    expect(screen.getByText('Auto Loan')).toBeTruthy();
  });
});
