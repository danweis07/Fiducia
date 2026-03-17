import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    offers: {
      list: vi.fn().mockResolvedValue({ offers: [] }),
      summary: vi.fn().mockResolvedValue(null),
      redemptions: vi.fn().mockResolvedValue(null),
      activate: vi.fn().mockResolvedValue({}),
      deactivate: vi.fn().mockResolvedValue({}),
    },
    cards: {
      list: vi.fn().mockResolvedValue({ cards: [] }),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('@/lib/common/currency', () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
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

describe('CardOffers', () => {
  it('renders without crashing', async () => {
    const { default: CardOffers } = await import('../CardOffers');
    const { container } = render(createElement(CardOffers), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: CardOffers } = await import('../CardOffers');
    render(createElement(CardOffers), { wrapper: createWrapper() });
    expect(await screen.findByText('Card-Linked Offers')).toBeTruthy();
  });

  it('shows the available tab', async () => {
    const { default: CardOffers } = await import('../CardOffers');
    render(createElement(CardOffers), { wrapper: createWrapper() });
    expect(await screen.findByText(/Available/)).toBeTruthy();
  });
});
