import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    devices: {
      list: vi.fn(),
      get: vi.fn(),
      rename: vi.fn(),
      remove: vi.fn(),
      activity: vi.fn(),
      trust: vi.fn(),
      untrust: vi.fn(),
    },
  },
}));

import { gateway } from '@/lib/gateway';
import {
  useDevices,
  useDevice,
  useRenameDevice,
  useRemoveDevice,
  useDeviceActivity,
  useTrustDevice,
  useUntrustDevice,
} from '../useDevices';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('useDevices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches device list', async () => {
    const mockDevices = [{ id: 'd-1', name: 'iPhone', trusted: true }];
    vi.mocked(gateway.devices.list).mockResolvedValue({ devices: mockDevices });

    const { result } = renderHook(() => useDevices(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.devices).toHaveLength(1);
  });
});

describe('useDevice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches single device by id', async () => {
    vi.mocked(gateway.devices.get).mockResolvedValue({ id: 'd-1', name: 'iPhone' });

    const { result } = renderHook(() => useDevice('d-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.devices.get).toHaveBeenCalledWith('d-1');
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useDevice(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(gateway.devices.get).not.toHaveBeenCalled();
  });
});

describe('useRenameDevice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls gateway.devices.rename on mutate', async () => {
    vi.mocked(gateway.devices.rename).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRenameDevice(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ deviceId: 'd-1', name: 'My iPad' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.devices.rename).toHaveBeenCalledWith('d-1', 'My iPad');
  });
});

describe('useRemoveDevice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls gateway.devices.remove on mutate', async () => {
    vi.mocked(gateway.devices.remove).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRemoveDevice(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('d-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.devices.remove).toHaveBeenCalledWith('d-1');
  });
});

describe('useDeviceActivity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches activity for a device', async () => {
    const mockActivity = [{ id: 'a-1', action: 'login', timestamp: '2026-01-01T00:00:00Z' }];
    vi.mocked(gateway.devices.activity).mockResolvedValue({ activity: mockActivity });

    const { result } = renderHook(() => useDeviceActivity('d-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.devices.activity).toHaveBeenCalledWith('d-1');
  });

  it('does not fetch when deviceId is empty', () => {
    const { result } = renderHook(() => useDeviceActivity(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useTrustDevice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls gateway.devices.trust on mutate', async () => {
    vi.mocked(gateway.devices.trust).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useTrustDevice(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('d-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.devices.trust).toHaveBeenCalledWith('d-1');
  });
});

describe('useUntrustDevice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls gateway.devices.untrust on mutate', async () => {
    vi.mocked(gateway.devices.untrust).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUntrustDevice(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('d-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.devices.untrust).toHaveBeenCalledWith('d-1');
  });
});
