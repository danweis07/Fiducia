import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    externalAccounts: {
      list: vi.fn(),
      exchange: vi.fn(),
      balances: vi.fn(),
      transactions: vi.fn(),
    },
  },
}));

import { gateway } from '@/lib/gateway';
import {
  externalAccountKeys,
  useLinkedAccounts,
  useLinkAccount,
  useExternalBalances,
  useExternalTransactions,
} from '../useExternalAccounts';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('externalAccountKeys', () => {
  it('has correct all key', () => {
    expect(externalAccountKeys.all).toEqual(['external-accounts']);
  });

  it('has correct list key', () => {
    expect(externalAccountKeys.list()).toEqual(['external-accounts', 'list']);
  });

  it('has correct balances key', () => {
    expect(externalAccountKeys.balances('ext-1')).toEqual(['external-accounts', 'balances', 'ext-1']);
  });

  it('has correct transactions key', () => {
    expect(externalAccountKeys.transactions('ext-1')).toEqual(['external-accounts', 'transactions', 'ext-1']);
  });
});

describe('useLinkedAccounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches linked accounts', async () => {
    const mockAccounts = [{ id: 'ext-1', name: 'External Checking', institution: 'Chase' }];
    vi.mocked(gateway.externalAccounts.list).mockResolvedValue({ accounts: mockAccounts });

    const { result } = renderHook(() => useLinkedAccounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.accounts).toHaveLength(1);
  });
});

describe('useLinkAccount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exchanges public token on mutate', async () => {
    vi.mocked(gateway.externalAccounts.exchange).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useLinkAccount(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('public-token-abc');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.externalAccounts.exchange).toHaveBeenCalledWith('public-token-abc');
  });
});

describe('useExternalBalances', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches balances for an account', async () => {
    const mockBalances = { balances: [{ current: 150000, available: 140000 }] };
    vi.mocked(gateway.externalAccounts.balances).mockResolvedValue(mockBalances);

    const { result } = renderHook(() => useExternalBalances('ext-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.externalAccounts.balances).toHaveBeenCalledWith('ext-1');
  });
});

describe('useExternalTransactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches transactions for an account', async () => {
    const mockTxns = { transactions: [{ id: 'txn-1', amountCents: 5000 }] };
    vi.mocked(gateway.externalAccounts.transactions).mockResolvedValue(mockTxns);

    const { result } = renderHook(() => useExternalTransactions('ext-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.externalAccounts.transactions).toHaveBeenCalledWith({ accountId: 'ext-1' });
  });

  it('calls without accountId when undefined', async () => {
    vi.mocked(gateway.externalAccounts.transactions).mockResolvedValue({ transactions: [] });

    const { result } = renderHook(() => useExternalTransactions(undefined), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.externalAccounts.transactions).toHaveBeenCalledWith({});
  });
});
