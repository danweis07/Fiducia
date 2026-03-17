import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    cmsTokens: {
      list: vi.fn().mockResolvedValue({ tokens: [] }),
      create: vi.fn().mockResolvedValue({ token: {} }),
      revoke: vi.fn().mockResolvedValue({}),
    },
    cms: {
      listChannels: vi.fn().mockResolvedValue({ channels: [] }),
    },
  },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('ApiTokens', () => {
  it('renders without crashing', async () => {
    const { default: ApiTokens } = await import('../ApiTokens');
    const { container } = render(createElement(ApiTokens), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading after loading', async () => {
    const { default: ApiTokens } = await import('../ApiTokens');
    render(createElement(ApiTokens), { wrapper: createWrapper() });
    expect(await screen.findByText('API Tokens')).toBeTruthy();
  });

  it('shows the Create Token button after loading', async () => {
    const { default: ApiTokens } = await import('../ApiTokens');
    render(createElement(ApiTokens), { wrapper: createWrapper() });
    expect(await screen.findByText('Create Token')).toBeTruthy();
  });

  it('shows the security notice after loading', async () => {
    const { default: ApiTokens } = await import('../ApiTokens');
    render(createElement(ApiTokens), { wrapper: createWrapper() });
    expect(await screen.findByText('Token Security')).toBeTruthy();
  });
});
