import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock gateway
vi.mock('@/lib/gateway', () => ({
  gateway: { request: vi.fn().mockResolvedValue({}) },
}));

// Mock hooks
const mockLoan = {
  id: 'loan-1',
  loanNumberMasked: '****5678',
  status: 'active',
  principalCents: 2500000,
  outstandingBalanceCents: 2000000,
  interestRateBps: 650,
  termMonths: 60,
  principalPaidCents: 500000,
  interestPaidCents: 150000,
  firstPaymentDate: '2023-06-01',
  maturityDate: '2028-06-01',
  disbursedAt: '2023-05-01',
  nextPaymentDueDate: '2026-04-01',
  nextPaymentAmountCents: 50000,
  paymentsRemaining: 26,
  autopayAccountId: null,
  daysPastDue: 0,
};

vi.mock('@/hooks/useLoans', () => ({
  useLoan: () => ({ data: { loan: mockLoan }, isLoading: false, error: null }),
  useLoanSchedule: () => ({ data: { schedule: [] }, isLoading: false }),
  useLoanPayments: () => ({ data: { payments: [] }, isLoading: false }),
  useMakeLoanPayment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: { accounts: [{ id: 'acct-1', nickname: 'Checking', type: 'checking', accountNumberMasked: '****1234', availableBalanceCents: 250000 }] },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, { initialEntries: ['/loans/loan-1'] },
        createElement(Routes, null,
          createElement(Route, { path: '/loans/:id', element: children })
        )
      )
    );
}

describe('LoanDetail page', () => {
  it('renders without crashing', async () => {
    const { default: LoanDetail } = await import('../LoanDetail');
    const { container } = render(createElement(LoanDetail), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('displays the loan number in breadcrumb', async () => {
    const { default: LoanDetail } = await import('../LoanDetail');
    render(createElement(LoanDetail), { wrapper: createWrapper() });
    expect(screen.getByText('Loan ****5678')).toBeTruthy();
  });

  it('shows loan status badge', async () => {
    const { default: LoanDetail } = await import('../LoanDetail');
    render(createElement(LoanDetail), { wrapper: createWrapper() });
    expect(screen.getByText('active')).toBeTruthy();
  });

  it('displays Overview tab by default', async () => {
    const { default: LoanDetail } = await import('../LoanDetail');
    render(createElement(LoanDetail), { wrapper: createWrapper() });
    expect(screen.getByText('Loan Details')).toBeTruthy();
  });
});
