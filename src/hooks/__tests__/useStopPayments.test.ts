import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    stopPayments: {
      list: vi.fn(), get: vi.fn(), create: vi.fn(),
      cancel: vi.fn(), renew: vi.fn(), fee: vi.fn(),
    },
  },
}));

import { gateway } from '@/lib/gateway';
import {
  stopPaymentKeys, useStopPayments, useStopPayment,
  useCreateStopPayment, useCancelStopPayment, useRenewStopPayment,
  useStopPaymentFee,
} from '../useStopPayments';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('stopPaymentKeys', () => {
  it('has correct keys', () => {
    expect(stopPaymentKeys.all).toEqual(['stopPayments']);
    expect(stopPaymentKeys.detail('sp-1')).toEqual(['stopPayments', 'sp-1']);
    expect(stopPaymentKeys.fee()).toEqual(['stopPayments', 'fee']);
  });
});

describe('useStopPayments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches stop payments', async () => {
    vi.mocked(gateway.stopPayments.list).mockResolvedValue({ stopPayments: [] });
    const { result } = renderHook(() => useStopPayments(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useStopPayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches single stop payment', async () => {
    vi.mocked(gateway.stopPayments.get).mockResolvedValue({ id: 'sp-1' });
    const { result } = renderHook(() => useStopPayment('sp-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useCreateStopPayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a stop payment', async () => {
    vi.mocked(gateway.stopPayments.create).mockResolvedValue({ id: 'sp-new' });
    const { result } = renderHook(() => useCreateStopPayment(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({
        accountId: 'acct-1', checkNumber: '1001', reason: 'Lost', duration: '6months',
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useCancelStopPayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancels a stop payment', async () => {
    vi.mocked(gateway.stopPayments.cancel).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useCancelStopPayment(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate('sp-1'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useRenewStopPayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renews a stop payment', async () => {
    vi.mocked(gateway.stopPayments.renew).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRenewStopPayment(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ stopPaymentId: 'sp-1', duration: '12months' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useStopPaymentFee', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches fee', async () => {
    vi.mocked(gateway.stopPayments.fee).mockResolvedValue({ feeCents: 3500 });
    const { result } = renderHook(() => useStopPaymentFee(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.feeCents).toBe(3500);
  });
});
