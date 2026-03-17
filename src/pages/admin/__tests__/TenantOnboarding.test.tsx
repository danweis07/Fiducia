import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({}),
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

import TenantOnboarding from '../TenantOnboarding';

describe('TenantOnboarding', () => {
  it('renders without crashing', () => {
    render(createElement(TenantOnboarding), { wrapper: createWrapper() });
    expect(screen.getByText('Tenant Onboarding')).toBeTruthy();
  });

  it('shows the subtitle text', () => {
    render(createElement(TenantOnboarding), { wrapper: createWrapper() });
    expect(screen.getByText('Set up your institution in a few steps.')).toBeTruthy();
  });

  it('renders step labels', () => {
    render(createElement(TenantOnboarding), { wrapper: createWrapper() });
    expect(screen.getAllByText('Institution Profile').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Branding')).toBeTruthy();
    expect(screen.getByText('Integrations')).toBeTruthy();
    expect(screen.getByText('Compliance')).toBeTruthy();
  });

  it('renders navigation buttons', () => {
    render(createElement(TenantOnboarding), { wrapper: createWrapper() });
    expect(screen.getByText('Back')).toBeTruthy();
    expect(screen.getByText('Save & Continue')).toBeTruthy();
  });
});
