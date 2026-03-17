import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useWireTransfers', () => ({
  useWires: vi.fn(() => ({ data: { wires: [] }, isLoading: false })),
  useCreateDomesticWire: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreateInternationalWire: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCancelWire: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useWireFees: vi.fn(() => ({ data: { fees: { domesticFeeCents: 2500, internationalFeeCents: 4500 } } })),
  useWireLimits: vi.fn(() => ({ data: null })),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({ data: { accounts: [] }, isLoading: false })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: vi.fn(() => ({ handleError: vi.fn() })),
}));

vi.mock('@/lib/common/currency', () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
}));

vi.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'app-shell' }, children),
}));

vi.mock('@/components/common/LoadingSkeleton', () => ({
  PageSkeleton: () => createElement('div', null, 'Loading...'),
}));

vi.mock('@/components/common/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => createElement('div', null, title),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('WireTransfer', () => {
  it('renders without crashing', async () => {
    const { default: WireTransfer } = await import('../WireTransfer');
    const { container } = render(createElement(WireTransfer), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: WireTransfer } = await import('../WireTransfer');
    render(createElement(WireTransfer), { wrapper: createWrapper() });
    expect(screen.getByText('Wire Transfers')).toBeTruthy();
  });

  it('shows new wire transfer form', async () => {
    const { default: WireTransfer } = await import('../WireTransfer');
    render(createElement(WireTransfer), { wrapper: createWrapper() });
    expect(screen.getByText('New Wire Transfer')).toBeTruthy();
  });
});
