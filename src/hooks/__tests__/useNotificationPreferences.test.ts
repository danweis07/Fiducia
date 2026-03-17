import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    notificationPreferences: {
      get: vi.fn(),
      update: vi.fn(),
      test: vi.fn(),
    },
  },
}));

import { gateway } from '@/lib/gateway';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useTestNotification,
} from '../useNotificationPreferences';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches notification preferences successfully', async () => {
    const mockPrefs = {
      channels: { email: true, sms: false, push: true },
      categories: { security: { enabled: true, channels: ['email', 'push'] } },
    };
    vi.mocked(gateway.notificationPreferences.get).mockResolvedValue(mockPrefs);

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPrefs);
    expect(gateway.notificationPreferences.get).toHaveBeenCalledTimes(1);
  });

  it('handles error', async () => {
    vi.mocked(gateway.notificationPreferences.get).mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates preferences successfully', async () => {
    vi.mocked(gateway.notificationPreferences.update).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUpdateNotificationPreferences(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ channels: { email: true, sms: true } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.notificationPreferences.update).toHaveBeenCalledWith({
      channels: { email: true, sms: true },
    });
  });
});

describe('useTestNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends test notification successfully', async () => {
    vi.mocked(gateway.notificationPreferences.test).mockResolvedValue({ sent: true });

    const { result } = renderHook(() => useTestNotification(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('email');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.notificationPreferences.test).toHaveBeenCalledWith('email');
  });
});
