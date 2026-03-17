import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    exports: {
      list: vi.fn(),
      summary: vi.fn(),
      create: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
    },
    reportTemplates: {
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { gateway } from '@/lib/gateway';
import {
  useExportList,
  useExportSummary,
  useCreateExport,
  useDownloadExport,
  useDeleteExport,
  useReportTemplates,
  useCreateReportTemplate,
  useDeleteReportTemplate,
} from '../useDataExport';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useExportList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches export list successfully', async () => {
    const mockExports = [{ id: 'exp-1', status: 'completed', reportType: 'transactions' }];
    vi.mocked(gateway.exports.list).mockResolvedValue(mockExports);

    const { result } = renderHook(() => useExportList({ status: 'completed' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(gateway.exports.list).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('fetches with no params', async () => {
    vi.mocked(gateway.exports.list).mockResolvedValue([]);

    const { result } = renderHook(() => useExportList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.exports.list).toHaveBeenCalledWith(undefined);
  });
});

describe('useExportSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches export summary successfully', async () => {
    const mockSummary = { totalExports: 5, pendingCount: 1, completedCount: 4 };
    vi.mocked(gateway.exports.summary).mockResolvedValue(mockSummary);

    const { result } = renderHook(() => useExportSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSummary);
  });
});

describe('useCreateExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates export successfully', async () => {
    vi.mocked(gateway.exports.create).mockResolvedValue({ id: 'exp-new', status: 'pending' });

    const { result } = renderHook(() => useCreateExport(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        reportType: 'transactions' as never,
        format: 'csv' as never,
        dateRangeStart: '2026-01-01',
        dateRangeEnd: '2026-03-01',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.exports.create).toHaveBeenCalledTimes(1);
  });
});

describe('useDownloadExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads export successfully', async () => {
    vi.mocked(gateway.exports.download).mockResolvedValue({ url: 'https://example.com/file.csv' });

    const { result } = renderHook(() => useDownloadExport(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('exp-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.exports.download).toHaveBeenCalledWith('exp-1');
  });
});

describe('useDeleteExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes export successfully', async () => {
    vi.mocked(gateway.exports.delete).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteExport(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('exp-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.exports.delete).toHaveBeenCalledWith('exp-1');
  });
});

describe('useReportTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches report templates successfully', async () => {
    const mockTemplates = [{ id: 'tpl-1', name: 'Monthly Report', reportType: 'transactions' }];
    vi.mocked(gateway.reportTemplates.list).mockResolvedValue(mockTemplates);

    const { result } = renderHook(() => useReportTemplates(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useCreateReportTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates report template successfully', async () => {
    vi.mocked(gateway.reportTemplates.create).mockResolvedValue({ id: 'tpl-new' });

    const { result } = renderHook(() => useCreateReportTemplate(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        name: 'Quarterly Report',
        reportType: 'transactions',
        defaultFormat: 'csv',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.reportTemplates.create).toHaveBeenCalledTimes(1);
  });
});

describe('useDeleteReportTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes report template successfully', async () => {
    vi.mocked(gateway.reportTemplates.delete).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteReportTemplate(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('tpl-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.reportTemplates.delete).toHaveBeenCalledWith('tpl-1');
  });
});
