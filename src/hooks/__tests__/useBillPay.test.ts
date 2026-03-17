import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    bills: {
      list: vi.fn(),
      create: vi.fn(),
      pay: vi.fn(),
      cancel: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/useAccounts', () => ({
  accountKeys: { all: ['accounts'] as const },
}));

vi.mock('@/hooks/useTransactions', () => ({
  transactionKeys: { all: ['transactions'] as const },
}));

import { useBills, useCreateBill, usePayBill, useCancelBill, billKeys } from '../useBillPay';
import { gateway } from '@/lib/gateway';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockBills = [
  { id: 'bill-1', payeeName: 'Electric Company', amountCents: 15000, dueDate: '2026-03-20', status: 'scheduled' },
  { id: 'bill-2', payeeName: 'Internet Provider', amountCents: 8999, dueDate: '2026-03-25', status: 'scheduled' },
  { id: 'bill-3', payeeName: 'Water Utility', amountCents: 4500, dueDate: '2026-03-15', status: 'paid' },
];

describe('billKeys', () => {
  it('has correct all key', () => {
    expect(billKeys.all).toEqual(['bills']);
  });

  it('has correct list key', () => {
    expect(billKeys.list({ status: 'scheduled' })).toEqual(['bills', 'list', { status: 'scheduled' }]);
  });
});

describe('useBills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches bills list', async () => {
    vi.mocked(gateway.bills.list).mockResolvedValue({
      bills: mockBills,
      _pagination: { total: 3, limit: 50, offset: 0, hasMore: false },
    });

    const { result } = renderHook(() => useBills(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.bills).toHaveLength(3);
    expect(result.current.data?.bills[0].payeeName).toBe('Electric Company');
  });

  it('passes status filter', async () => {
    vi.mocked(gateway.bills.list).mockResolvedValue({ bills: [] });

    const { result } = renderHook(
      () => useBills({ status: 'scheduled' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.bills.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'scheduled' }),
    );
  });

  it('passes pagination', async () => {
    vi.mocked(gateway.bills.list).mockResolvedValue({ bills: [] });

    const { result } = renderHook(
      () => useBills({ limit: 10, offset: 20 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.bills.list).toHaveBeenCalledWith({ limit: 10, offset: 20 });
  });

  it('handles empty bills', async () => {
    vi.mocked(gateway.bills.list).mockResolvedValue({ bills: [] });

    const { result } = renderHook(() => useBills(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.bills).toHaveLength(0);
  });

  it('handles error', async () => {
    vi.mocked(gateway.bills.list).mockRejectedValue(new Error('Service down'));

    const { result } = renderHook(() => useBills(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateBill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a bill payment', async () => {
    vi.mocked(gateway.bills.create).mockResolvedValue({
      bill: { id: 'bill-new', payeeName: 'Electric Company', amountCents: 15000, status: 'scheduled' },
    });

    const { result } = renderHook(() => useCreateBill(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        payeeName: 'Electric Company',
        payeeAccountNumber: '12345678',
        amountCents: 15000,
        dueDate: '2026-03-20',
        fromAccountId: 'acct-1',
      });
    });

    expect(gateway.bills.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payeeName: 'Electric Company',
        payeeAccountNumber: '12345678',
        amountCents: 15000,
        dueDate: '2026-03-20',
        fromAccountId: 'acct-1',
      }),
    );
  });

  it('creates a bill with autopay', async () => {
    vi.mocked(gateway.bills.create).mockResolvedValue({
      bill: { id: 'bill-ap', status: 'scheduled' },
    });

    const { result } = renderHook(() => useCreateBill(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        payeeName: 'Internet Provider',
        payeeAccountNumber: '87654321',
        amountCents: 8999,
        dueDate: '2026-04-01',
        fromAccountId: 'acct-1',
        autopay: true,
      });
    });

    expect(gateway.bills.create).toHaveBeenCalledWith(
      expect.objectContaining({ autopay: true }),
    );
  });

  it('creates a recurring bill', async () => {
    vi.mocked(gateway.bills.create).mockResolvedValue({
      bill: { id: 'bill-rec', status: 'scheduled' },
    });

    const { result } = renderHook(() => useCreateBill(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        payeeName: 'Rent',
        payeeAccountNumber: '999888',
        amountCents: 120000,
        dueDate: '2026-04-01',
        fromAccountId: 'acct-1',
        recurringRule: { frequency: 'monthly' },
      });
    });

    expect(gateway.bills.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recurringRule: { frequency: 'monthly' },
      }),
    );
  });

  it('handles creation error', async () => {
    vi.mocked(gateway.bills.create).mockRejectedValue(new Error('Invalid payee'));

    const { result } = renderHook(() => useCreateBill(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          payeeName: '',
          payeeAccountNumber: '',
          amountCents: 0,
          dueDate: '',
          fromAccountId: 'acct-1',
        });
      }),
    ).rejects.toThrow('Invalid payee');
  });
});

describe('usePayBill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pays a bill', async () => {
    vi.mocked(gateway.bills.pay).mockResolvedValue({ bill: { id: 'bill-1', status: 'paid' } } as never);

    const { result } = renderHook(() => usePayBill(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('bill-1');
    });

    expect(gateway.bills.pay).toHaveBeenCalledWith('bill-1');
  });

  it('handles pay failure', async () => {
    vi.mocked(gateway.bills.pay).mockRejectedValue(new Error('Insufficient funds'));

    const { result } = renderHook(() => usePayBill(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync('bill-1');
      }),
    ).rejects.toThrow('Insufficient funds');
  });
});

describe('useCancelBill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels a bill', async () => {
    vi.mocked(gateway.bills.cancel).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCancelBill(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('bill-1');
    });

    expect(gateway.bills.cancel).toHaveBeenCalledWith('bill-1');
  });

  it('handles cancel failure for already paid bill', async () => {
    vi.mocked(gateway.bills.cancel).mockRejectedValue(new Error('Bill already paid'));

    const { result } = renderHook(() => useCancelBill(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync('bill-3');
      }),
    ).rejects.toThrow('Bill already paid');
  });

  it('cancels different bill ids', async () => {
    vi.mocked(gateway.bills.cancel).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCancelBill(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('bill-2');
    });

    expect(gateway.bills.cancel).toHaveBeenCalledWith('bill-2');
  });
});
