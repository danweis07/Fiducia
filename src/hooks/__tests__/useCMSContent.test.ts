import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    cms: {
      listContent: vi.fn(),
    },
  },
}));

import { gateway } from '@/lib/gateway';
import { useCMSContent, useCMSBanners, useCMSAnnouncements } from '../useCMSContent';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCMSContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches CMS content with default params', async () => {
    const mockContent = {
      content: [
        { id: 'cms-1', title: 'Welcome Banner', contentType: 'banner' },
        { id: 'cms-2', title: 'Announcement', contentType: 'announcement' },
      ],
    };
    vi.mocked(gateway.cms.listContent).mockResolvedValue(mockContent);

    const { result } = renderHook(() => useCMSContent(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(gateway.cms.listContent).toHaveBeenCalledWith({
      channel: 'web_portal',
      contentType: undefined,
      status: 'published',
      limit: 10,
    });
  });

  it('applies select to extract content array', async () => {
    vi.mocked(gateway.cms.listContent).mockResolvedValue({ content: [] });

    const { result } = renderHook(() => useCMSContent(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('returns empty array when content is undefined', async () => {
    vi.mocked(gateway.cms.listContent).mockResolvedValue({});

    const { result } = renderHook(() => useCMSContent(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('fetches with custom params', async () => {
    vi.mocked(gateway.cms.listContent).mockResolvedValue({ content: [] });

    const { result } = renderHook(
      () => useCMSContent({ channel: 'mobile', contentType: 'banner', limit: 3 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.cms.listContent).toHaveBeenCalledWith({
      channel: 'mobile',
      contentType: 'banner',
      status: 'published',
      limit: 3,
    });
  });

  it('handles error', async () => {
    vi.mocked(gateway.cms.listContent).mockRejectedValue(new Error('CMS unavailable'));

    const { result } = renderHook(() => useCMSContent(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCMSBanners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches banners with correct contentType', async () => {
    vi.mocked(gateway.cms.listContent).mockResolvedValue({ content: [{ id: 'b-1', contentType: 'banner' }] });

    const { result } = renderHook(() => useCMSBanners(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.cms.listContent).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'banner', limit: 5 }),
    );
  });
});

describe('useCMSAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches announcements with correct contentType', async () => {
    vi.mocked(gateway.cms.listContent).mockResolvedValue({
      content: [{ id: 'a-1', contentType: 'announcement' }],
    });

    const { result } = renderHook(() => useCMSAnnouncements(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.cms.listContent).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'announcement', limit: 5 }),
    );
  });
});
