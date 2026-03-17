import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    overdraft: {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
      getHistory: vi.fn(),
      getFeeSchedule: vi.fn(),
    },
  },
}));

import { gateway } from '@/lib/gateway';
import {
  useOverdraftSettings,
  useUpdateOverdraftSettings,
  useOverdraftHistory,
  useOverdraftFeeSchedule,
} from '../useOverdraft';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('useOverdraftSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches overdraft settings for an account', async () => {
    const mockSettings = { isEnabled: true, protectionType: 'linked_account', linkedAccountId: 'acct-2' };
    vi.mocked(gateway.overdraft.getSettings).mockResolvedValue(mockSettings);

    const { result } = renderHook(() => useOverdraftSettings('acct-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSettings);
    expect(gateway.overdraft.getSettings).toHaveBeenCalledWith('acct-1');
  });

  it('does not fetch when accountId is undefined', () => {
    const { result } = renderHook(() => useOverdraftSettings(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(gateway.overdraft.getSettings).not.toHaveBeenCalled();
  });
});

describe('useUpdateOverdraftSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls gateway.overdraft.updateSettings on mutate', async () => {
    vi.mocked(gateway.overdraft.updateSettings).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUpdateOverdraftSettings(), { wrapper: createWrapper() });

    const params = { accountId: 'acct-1', isEnabled: true, protectionType: 'linked_account' as const };
    await act(async () => {
      result.current.mutate(params);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.overdraft.updateSettings).toHaveBeenCalledWith(params);
  });
});

describe('useOverdraftHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches overdraft history for an account', async () => {
    const mockHistory = { events: [{ id: 'e-1', amountCents: 3500, date: '2026-01-15' }] };
    vi.mocked(gateway.overdraft.getHistory).mockResolvedValue(mockHistory);

    const { result } = renderHook(() => useOverdraftHistory('acct-1', 10, 0), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.overdraft.getHistory).toHaveBeenCalledWith('acct-1', 10, 0);
  });

  it('does not fetch when accountId is undefined', () => {
    const { result } = renderHook(() => useOverdraftHistory(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useOverdraftFeeSchedule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches fee schedule', async () => {
    const mockSchedule = { overdraftFeeCents: 3500, courtesyPayFeeCents: 2800 };
    vi.mocked(gateway.overdraft.getFeeSchedule).mockResolvedValue(mockSchedule);

    const { result } = renderHook(() => useOverdraftFeeSchedule(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSchedule);
  });
});
