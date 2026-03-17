import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock gateway
vi.mock('@/lib/gateway', () => ({
  gateway: { request: vi.fn().mockResolvedValue({}) },
}));

// Mock AppShell
vi.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'app-shell' }, children),
}));

// Mock secure messaging hooks
vi.mock('@/hooks/useSecureMessaging', () => ({
  useMessageThreads: () => ({
    data: { threads: [] },
    isLoading: false,
    error: null,
  }),
  useThread: () => ({ data: null, isLoading: false, error: null }),
  useCreateThread: () => ({ mutate: vi.fn(), isPending: false }),
  useReplyToThread: () => ({ mutate: vi.fn(), isPending: false }),
  useArchiveThread: () => ({ mutate: vi.fn(), isPending: false }),
  useMessageDepartments: () => ({ data: { departments: [] } }),
  useUnreadMessageCount: () => ({ data: { count: 0 } }),
  useMarkThreadRead: () => ({ mutate: vi.fn() }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('SecureMessages page', () => {
  it('renders without crashing', async () => {
    const { default: SecureMessages } = await import('../SecureMessages');
    const { container } = render(createElement(SecureMessages), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('displays the Secure Messages heading', async () => {
    const { default: SecureMessages } = await import('../SecureMessages');
    render(createElement(SecureMessages), { wrapper: createWrapper() });
    expect(screen.getByText('Secure Messages')).toBeTruthy();
  });

  it('shows empty state when no threads', async () => {
    const { default: SecureMessages } = await import('../SecureMessages');
    render(createElement(SecureMessages), { wrapper: createWrapper() });
    expect(screen.getByText('No messages yet')).toBeTruthy();
  });

  it('shows New Message button', async () => {
    const { default: SecureMessages } = await import('../SecureMessages');
    render(createElement(SecureMessages), { wrapper: createWrapper() });
    expect(screen.getByText('New Message')).toBeTruthy();
  });
});
