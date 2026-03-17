import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({ reviews: [], alerts: [], requests: [] }),
  },
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

import ComplianceCenter from '../ComplianceCenter';

describe('ComplianceCenter', () => {
  it('renders without crashing', async () => {
    render(createElement(ComplianceCenter), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Compliance Center')).toBeTruthy();
    });
  });

  it('shows the description text', async () => {
    render(createElement(ComplianceCenter), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('KYC reviews, AML monitoring, and data governance.')).toBeTruthy();
    });
  });

  it('renders tab triggers', async () => {
    render(createElement(ComplianceCenter), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('KYC Queue')).toBeTruthy();
      expect(screen.getByText('AML Alerts')).toBeTruthy();
      expect(screen.getByText('Data Governance')).toBeTruthy();
    });
  });
});
