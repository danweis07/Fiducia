import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    goals: {
      list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(),
      remove: vi.fn(), contribute: vi.fn(), withdraw: vi.fn(), summary: vi.fn(),
    },
  },
}));

import { gateway } from '@/lib/gateway';
import {
  goalKeys, useSavingsGoals, useSavingsGoal, useCreateSavingsGoal,
  useDeleteSavingsGoal, useContributeToGoal,
  useWithdrawFromGoal, useGoalSummary,
} from '../useSavingsGoals';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('goalKeys', () => {
  it('has correct keys', () => {
    expect(goalKeys.all).toEqual(['goals']);
    expect(goalKeys.list()).toEqual(['goals', 'list']);
    expect(goalKeys.detail('g-1')).toEqual(['goals', 'g-1']);
    expect(goalKeys.summary()).toEqual(['goals', 'summary']);
  });
});

describe('useSavingsGoals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches goals list', async () => {
    const goals = [{ id: 'g-1', name: 'Vacation', targetAmountCents: 500000 }];
    vi.mocked(gateway.goals.list).mockResolvedValue({ goals });
    const { result } = renderHook(() => useSavingsGoals(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.goals).toEqual(goals);
  });
});

describe('useSavingsGoal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches single goal', async () => {
    const goal = { id: 'g-1', name: 'Vacation' };
    vi.mocked(gateway.goals.get).mockResolvedValue(goal);
    const { result } = renderHook(() => useSavingsGoal('g-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(goal);
  });

  it('does not fetch without id', () => {
    const { result } = renderHook(() => useSavingsGoal(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateSavingsGoal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a goal', async () => {
    vi.mocked(gateway.goals.create).mockResolvedValue({ id: 'g-new' });
    const { result } = renderHook(() => useCreateSavingsGoal(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ name: 'Car', targetAmountCents: 1000000, accountId: 'acct-1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.goals.create).toHaveBeenCalled();
  });
});

describe('useDeleteSavingsGoal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes a goal', async () => {
    vi.mocked(gateway.goals.remove).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDeleteSavingsGoal(), { wrapper: createWrapper() });
    await act(async () => { result.current.mutate('g-1'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useContributeToGoal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('contributes to a goal', async () => {
    vi.mocked(gateway.goals.contribute).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useContributeToGoal(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ goalId: 'g-1', amountCents: 5000 });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.goals.contribute).toHaveBeenCalledWith('g-1', 5000, undefined);
  });
});

describe('useWithdrawFromGoal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('withdraws from a goal', async () => {
    vi.mocked(gateway.goals.withdraw).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useWithdrawFromGoal(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ goalId: 'g-1', amountCents: 2000 });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useGoalSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches summary', async () => {
    const summary = { totalGoals: 3, totalSavedCents: 150000 };
    vi.mocked(gateway.goals.summary).mockResolvedValue(summary);
    const { result } = renderHook(() => useGoalSummary(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
  });
});
