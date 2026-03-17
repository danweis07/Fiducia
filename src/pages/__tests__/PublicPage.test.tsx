import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ slug: 'test-page' })),
}));

vi.mock('@/lib/gateway', () => ({
  gateway: {
    cms: {
      getPublicContent: vi.fn().mockResolvedValue({
        content: {
          title: 'Test Page Title',
          body: 'This is the page body content.',
          publishedAt: '2026-01-15T00:00:00Z',
          metadata: {},
        },
      }),
    },
  },
}));

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: vi.fn(() => ({
    variantId: null,
    trackClick: vi.fn(),
  })),
}));

vi.mock('@/components/public/PublicShell', () => ({
  PublicShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/public/SEOHead', () => ({
  SEOHead: () => null,
}));

vi.mock('@/components/common/Spinner', () => ({
  Spinner: () => <div>Loading...</div>,
}));

import PublicPage from '../PublicPage';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

describe('PublicPage', () => {
  it('renders page content after loading', async () => {
    render(<PublicPage />, { wrapper });
    // Initially shows loading
    expect(screen.getByText('Loading...')).toBeTruthy();
    // Wait for content
    const title = await screen.findByText('Test Page Title');
    expect(title).toBeTruthy();
  });
});
