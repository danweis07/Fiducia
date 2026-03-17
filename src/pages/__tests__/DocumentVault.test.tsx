import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useDocumentVault', () => ({
  useVaultDocuments: vi.fn(() => ({ data: { documents: [] }, isLoading: false })),
  useUploadDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useVaultDocument: vi.fn(() => ({ data: null })),
  useUpdateVaultDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteVaultDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useVaultSummary: vi.fn(() => ({ data: null })),
  useSearchVaultDocuments: vi.fn(() => ({ data: { documents: [] } })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'app-shell' }, children),
}));

vi.mock('@/components/common/LoadingSkeleton', () => ({
  PageSkeleton: () => createElement('div', null, 'Loading...'),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('DocumentVault', () => {
  it('renders without crashing', async () => {
    const { default: DocumentVaultPage } = await import('../DocumentVault');
    const { container } = render(createElement(DocumentVaultPage), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: DocumentVaultPage } = await import('../DocumentVault');
    render(createElement(DocumentVaultPage), { wrapper: createWrapper() });
    expect(screen.getByText('Document Vault')).toBeTruthy();
  });

  it('shows upload button', async () => {
    const { default: DocumentVaultPage } = await import('../DocumentVault');
    render(createElement(DocumentVaultPage), { wrapper: createWrapper() });
    expect(screen.getByText('Upload Document')).toBeTruthy();
  });
});
