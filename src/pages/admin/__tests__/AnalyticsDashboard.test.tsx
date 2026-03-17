import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    admin: {
      analytics: vi.fn().mockResolvedValue({
        data: {
          metrics: [],
          accountGrowth: [],
          transactionVolume: [],
          funnel: [],
        },
      }),
    },
  },
}));

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/common/LoadingSkeleton', () => ({
  PageSkeleton: () => <div>Loading...</div>,
}));

import AnalyticsDashboard from '../AnalyticsDashboard';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

describe('AnalyticsDashboard', () => {
  it('renders without crashing', () => {
    const { container } = render(<AnalyticsDashboard />, { wrapper });
    expect(container).toBeTruthy();
  });
});
