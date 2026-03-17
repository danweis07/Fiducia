import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useDataExport', () => ({
  useExportList: vi.fn(() => ({ data: { exports: [] }, isLoading: false, isFetching: false, refetch: vi.fn() })),
  useExportSummary: vi.fn(() => ({
    data: { summary: { totalExports: 5, completedExports: 3, failedExports: 1, storageUsedBytes: 1024 } },
    isLoading: false,
  })),
  useCreateExport: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDownloadExport: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteExport: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useReportTemplates: vi.fn(() => ({ data: { templates: [] }, isLoading: false })),
  useCreateReportTemplate: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteReportTemplate: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('DataExport', () => {
  it('renders without crashing', async () => {
    const { default: DataExport } = await import('../DataExport');
    const { container } = render(createElement(DataExport), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: DataExport } = await import('../DataExport');
    render(createElement(DataExport), { wrapper: createWrapper() });
    expect(screen.getByText('Data Export & Reporting')).toBeTruthy();
  });

  it('shows summary cards', async () => {
    const { default: DataExport } = await import('../DataExport');
    render(createElement(DataExport), { wrapper: createWrapper() });
    expect(screen.getByText('Total Exports')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByText('Storage Used')).toBeTruthy();
  });

  it('shows the New Export button', async () => {
    const { default: DataExport } = await import('../DataExport');
    render(createElement(DataExport), { wrapper: createWrapper() });
    expect(screen.getByText('New Export')).toBeTruthy();
  });
});
