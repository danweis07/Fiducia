import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    adminIntegrations: {
      list: vi.fn().mockResolvedValue({ integrations: [] }),
    },
    request: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/hooks/useAdminIntegrations', () => ({
  useAdminIntegrations: vi.fn(() => ({
    data: { integrations: [] },
    isLoading: false,
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
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

import IntegrationManager from '../IntegrationManager';

describe('IntegrationManager', () => {
  it('renders without crashing', () => {
    render(createElement(IntegrationManager), { wrapper: createWrapper() });
    expect(screen.getByText('Integrations')).toBeTruthy();
  });

  it('shows the description text', () => {
    render(createElement(IntegrationManager), { wrapper: createWrapper() });
    expect(screen.getByText('Manage third-party provider connections.')).toBeTruthy();
  });

  it('renders empty state when no integrations configured', () => {
    render(createElement(IntegrationManager), { wrapper: createWrapper() });
    // With an empty integrations array, no integration cards should be rendered
    // The page heading should still be present
    expect(screen.getByText('Integrations')).toBeTruthy();
    expect(screen.queryByText('Test Connection')).toBeNull();
  });
});
