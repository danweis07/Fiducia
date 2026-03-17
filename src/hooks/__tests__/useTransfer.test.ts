import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    transfers: {
      list: vi.fn(),
      create: vi.fn(),
      cancel: vi.fn(),
      schedule: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/useAccounts', () => ({
  accountKeys: { all: ['accounts'] as const },
}));

vi.mock('@/hooks/useTransactions', () => ({
  transactionKeys: { all: ['transactions'] as const },
}));

import { useTransfers, useCreateTransfer, useCancelTransfer, transferKeys } from '../useTransfer';
import { gateway } from '@/lib/gateway';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('transferKeys', () => {
  it('has correct all key', () => {
    expect(transferKeys.all).toEqual(['transfers']);
  });

  it('has correct list key with params', () => {
    expect(transferKeys.list({ status: 'pending' })).toEqual(['transfers', 'list', { status: 'pending' }]);
  });
});

describe('useTransfers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches transfers list', async () => {
    vi.mocked(gateway.transfers.list).mockResolvedValue({
      transfers: [
        { id: 'xfr-1', fromAccountId: 'acct-1', toAccountId: 'acct-2', amountCents: 50000, status: 'completed', type: 'internal' },
      ],
      _pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
    });

    const { result } = renderHook(() => useTransfers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.transfers).toHaveLength(1);
  });

  it('passes status filter', async () => {
    vi.mocked(gateway.transfers.list).mockResolvedValue({ transfers: [] });

    const { result } = renderHook(
      () => useTransfers({ status: 'pending' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.transfers.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });

  it('passes pagination params', async () => {
    vi.mocked(gateway.transfers.list).mockResolvedValue({ transfers: [] });

    const { result } = renderHook(
      () => useTransfers({ limit: 10, offset: 5 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.transfers.list).toHaveBeenCalledWith({ limit: 10, offset: 5 });
  });

  it('handles empty transfers', async () => {
    vi.mocked(gateway.transfers.list).mockResolvedValue({ transfers: [] });

    const { result } = renderHook(() => useTransfers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.transfers).toHaveLength(0);
  });

  it('handles error', async () => {
    vi.mocked(gateway.transfers.list).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useTransfers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates internal transfer (checking to savings)', async () => {
    vi.mocked(gateway.transfers.create).mockResolvedValue({
      transfer: { id: 'xfr-1', fromAccountId: 'acct-1', toAccountId: 'acct-2', amountCents: 50000, status: 'pending', type: 'internal' },
    } as never);

    const { result } = renderHook(() => useCreateTransfer(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        fromAccountId: 'acct-1',
        toAccountId: 'acct-2',
        type: 'internal' as never,
        amountCents: 50000,
      });
    });

    expect(gateway.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fromAccountId: 'acct-1',
        toAccountId: 'acct-2',
        amountCents: 50000,
        type: 'internal',
      }),
    );
  });

  it('creates transfer with memo', async () => {
    vi.mocked(gateway.transfers.create).mockResolvedValue({
      transfer: { id: 'xfr-2', status: 'pending' },
    } as never);

    const { result } = renderHook(() => useCreateTransfer(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        fromAccountId: 'acct-1',
        toAccountId: 'acct-2',
        type: 'internal' as never,
        amountCents: 10000,
        memo: 'Monthly savings',
      });
    });

    expect(gateway.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({ memo: 'Monthly savings' }),
    );
  });

  it('creates scheduled transfer', async () => {
    vi.mocked(gateway.transfers.create).mockResolvedValue({
      transfer: { id: 'xfr-3', status: 'scheduled' },
    } as never);

    const { result } = renderHook(() => useCreateTransfer(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        fromAccountId: 'acct-1',
        toAccountId: 'acct-2',
        type: 'internal' as never,
        amountCents: 25000,
        scheduledDate: '2026-04-01',
      });
    });

    expect(gateway.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledDate: '2026-04-01' }),
    );
  });

  it('creates beneficiary-based external transfer', async () => {
    vi.mocked(gateway.transfers.create).mockResolvedValue({
      transfer: { id: 'xfr-4', status: 'pending', type: 'external' },
    } as never);

    const { result } = renderHook(() => useCreateTransfer(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        fromAccountId: 'acct-1',
        toBeneficiaryId: 'ben-1',
        type: 'external' as never,
        amountCents: 100000,
      });
    });

    expect(gateway.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({ toBeneficiaryId: 'ben-1', type: 'external' }),
    );
  });

  it('handles transfer creation error', async () => {
    vi.mocked(gateway.transfers.create).mockRejectedValue(new Error('Insufficient funds'));

    const { result } = renderHook(() => useCreateTransfer(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          fromAccountId: 'acct-1',
          toAccountId: 'acct-2',
          type: 'internal' as never,
          amountCents: 99999999,
        });
      }),
    ).rejects.toThrow('Insufficient funds');
  });

  it('handles over-limit transfer rejection', async () => {
    vi.mocked(gateway.transfers.create).mockRejectedValue(new Error('Amount exceeds daily limit'));

    const { result } = renderHook(() => useCreateTransfer(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          fromAccountId: 'acct-1',
          toAccountId: 'acct-2',
          type: 'internal' as never,
          amountCents: 10000001,
        });
      }),
    ).rejects.toThrow('Amount exceeds daily limit');
  });

  it('passes small amount correctly', async () => {
    vi.mocked(gateway.transfers.create).mockResolvedValue({
      transfer: { id: 'xfr-5', amountCents: 1, status: 'pending' },
    } as never);

    const { result } = renderHook(() => useCreateTransfer(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        fromAccountId: 'acct-1',
        toAccountId: 'acct-2',
        type: 'internal' as never,
        amountCents: 1,
      });
    });

    expect(gateway.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 1 }),
    );
  });
});

describe('useCancelTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels a transfer via gateway', async () => {
    vi.mocked(gateway.transfers.cancel).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCancelTransfer(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('xfr-1');
    });

    expect(gateway.transfers.cancel).toHaveBeenCalledWith('xfr-1');
  });

  it('handles cancel failure', async () => {
    vi.mocked(gateway.transfers.cancel).mockRejectedValue(new Error('Transfer already completed'));

    const { result } = renderHook(() => useCancelTransfer(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync('xfr-1');
      }),
    ).rejects.toThrow('Transfer already completed');
  });

  it('cancels different transfer ids', async () => {
    vi.mocked(gateway.transfers.cancel).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCancelTransfer(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('xfr-99');
    });

    expect(gateway.transfers.cancel).toHaveBeenCalledWith('xfr-99');
  });
});
