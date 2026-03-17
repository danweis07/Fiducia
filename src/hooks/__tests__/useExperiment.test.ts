import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    experiments: {
      assign: vi.fn(),
      track: vi.fn(),
    },
  },
}));

import { gateway } from '@/lib/gateway';
import { useExperiment } from '../useExperiment';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useExperiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches assignment and auto-tracks impression', async () => {
    const mockAssignment = { id: 'asgn-1', variantId: 'variant-a', experimentId: 'exp-1' };
    vi.mocked(gateway.experiments.assign).mockResolvedValue(mockAssignment);
    vi.mocked(gateway.experiments.track).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useExperiment('exp-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.assignment).toBeDefined());
    expect(result.current.variantId).toBe('variant-a');
    expect(result.current.isLoading).toBe(false);
    expect(gateway.experiments.assign).toHaveBeenCalledWith('exp-1');

    // Auto-impression tracking
    await waitFor(() =>
      expect(gateway.experiments.track).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'impression', experimentId: 'exp-1', variantId: 'variant-a' }),
      ),
    );
  });

  it('is disabled when experimentId is undefined', () => {
    const { result } = renderHook(() => useExperiment(undefined), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.assignment).toBeUndefined();
    expect(gateway.experiments.assign).not.toHaveBeenCalled();
  });

  it('trackClick calls track with click event', async () => {
    const mockAssignment = { id: 'asgn-1', variantId: 'variant-b', experimentId: 'exp-2' };
    vi.mocked(gateway.experiments.assign).mockResolvedValue(mockAssignment);
    vi.mocked(gateway.experiments.track).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useExperiment('exp-2'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.assignment).toBeDefined());

    act(() => {
      result.current.trackClick({ button: 'cta' });
    });

    await waitFor(() =>
      expect(gateway.experiments.track).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'click', metadata: { button: 'cta' } }),
      ),
    );
  });

  it('trackDismiss calls track with dismiss event', async () => {
    const mockAssignment = { id: 'asgn-1', variantId: 'variant-a', experimentId: 'exp-3' };
    vi.mocked(gateway.experiments.assign).mockResolvedValue(mockAssignment);
    vi.mocked(gateway.experiments.track).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useExperiment('exp-3'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.assignment).toBeDefined());

    act(() => {
      result.current.trackDismiss();
    });

    await waitFor(() =>
      expect(gateway.experiments.track).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'dismiss' }),
      ),
    );
  });

  it('trackConversion calls track with conversion event', async () => {
    const mockAssignment = { id: 'asgn-1', variantId: 'variant-a', experimentId: 'exp-4' };
    vi.mocked(gateway.experiments.assign).mockResolvedValue(mockAssignment);
    vi.mocked(gateway.experiments.track).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useExperiment('exp-4'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.assignment).toBeDefined());

    act(() => {
      result.current.trackConversion({ value: 100 });
    });

    await waitFor(() =>
      expect(gateway.experiments.track).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'conversion', metadata: { value: 100 } }),
      ),
    );
  });
});
