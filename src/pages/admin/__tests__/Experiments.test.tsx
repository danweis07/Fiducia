import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({}),
    experiments: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      start: vi.fn().mockResolvedValue({}),
      pause: vi.fn().mockResolvedValue({}),
      resume: vi.fn().mockResolvedValue({}),
      complete: vi.fn().mockResolvedValue({}),
      results: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

import Experiments from '../Experiments';

describe('Experiments', () => {
  it('renders without crashing', () => {
    render(createElement(Experiments), { wrapper: createWrapper() });
    expect(screen.getByText('Experiments')).toBeTruthy();
  });

  it('shows the description text', () => {
    render(createElement(Experiments), { wrapper: createWrapper() });
    expect(screen.getByText('Manage A/B tests for CMS content')).toBeTruthy();
  });

  it('renders the New Experiment button', () => {
    render(createElement(Experiments), { wrapper: createWrapper() });
    expect(screen.getByText('New Experiment')).toBeTruthy();
  });

  it('renders status filter buttons', () => {
    render(createElement(Experiments), { wrapper: createWrapper() });
    expect(screen.getByText('draft')).toBeTruthy();
    expect(screen.getByText('running')).toBeTruthy();
    expect(screen.getByText('paused')).toBeTruthy();
    expect(screen.getByText('completed')).toBeTruthy();
  });
});
