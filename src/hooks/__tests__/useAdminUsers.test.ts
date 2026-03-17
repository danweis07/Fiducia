import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    adminUsers: {
      list: vi.fn(),
    },
  },
}));

import { gateway } from '@/lib/gateway';
import { useAdminUsers, adminUserKeys } from '../useAdminUsers';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('adminUserKeys', () => {
  it('has correct all key', () => {
    expect(adminUserKeys.all).toEqual(['admin-users']);
  });

  it('has correct list key with params', () => {
    expect(adminUserKeys.list({ status: 'active', search: 'john' })).toEqual([
      'admin-users', 'list', { status: 'active', search: 'john' },
    ]);
  });

  it('has correct list key with empty params', () => {
    expect(adminUserKeys.list({})).toEqual(['admin-users', 'list', {}]);
  });
});

describe('useAdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches admin users successfully', async () => {
    const mockUsers = [
      { id: 'u-1', email: 'admin@example.com', status: 'active', role: 'admin' },
      { id: 'u-2', email: 'user@example.com', status: 'active', role: 'member' },
    ];
    vi.mocked(gateway.adminUsers.list).mockResolvedValue(mockUsers);

    const { result } = renderHook(
      () => useAdminUsers({ status: 'active' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(gateway.adminUsers.list).toHaveBeenCalledWith({ status: 'active' });
  });

  it('fetches with default empty params', async () => {
    vi.mocked(gateway.adminUsers.list).mockResolvedValue([]);

    const { result } = renderHook(() => useAdminUsers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.adminUsers.list).toHaveBeenCalledWith({});
  });

  it('handles error', async () => {
    vi.mocked(gateway.adminUsers.list).mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useAdminUsers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Forbidden');
  });

  it('passes search and pagination params', async () => {
    vi.mocked(gateway.adminUsers.list).mockResolvedValue([]);

    const { result } = renderHook(
      () => useAdminUsers({ search: 'john', limit: 25, offset: 50 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.adminUsers.list).toHaveBeenCalledWith({
      search: 'john',
      limit: 25,
      offset: 50,
    });
  });

  it('starts in loading state', () => {
    vi.mocked(gateway.adminUsers.list).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAdminUsers(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});
