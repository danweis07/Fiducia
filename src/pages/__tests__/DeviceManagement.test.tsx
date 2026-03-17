import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useDevices', () => ({
  useDevices: vi.fn(() => ({
    data: {
      devices: [
        {
          id: 'd-1',
          name: 'My iPhone',
          deviceType: 'mobile',
          os: 'iOS 17',
          browser: 'Safari',
          isCurrent: true,
          isTrusted: false,
          lastActiveAt: new Date().toISOString(),
          lastLocation: 'New York, NY',
        },
      ],
    },
    isLoading: false,
    error: null,
  })),
  useRenameDevice: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRemoveDevice: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeviceActivity: vi.fn(() => ({ data: { activity: [] }, isLoading: false })),
  useTrustDevice: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUntrustDevice: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: vi.fn(() => ({ handleError: vi.fn() })),
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

describe('DeviceManagement', () => {
  it('renders without crashing', async () => {
    const { default: DeviceManagement } = await import('../DeviceManagement');
    const { container } = render(createElement(DeviceManagement), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: DeviceManagement } = await import('../DeviceManagement');
    render(createElement(DeviceManagement), { wrapper: createWrapper() });
    expect(screen.getByText('Devices')).toBeTruthy();
    expect(screen.getByText('Manage devices that have access to your account.')).toBeTruthy();
  });

  it('shows a device from the mock data', async () => {
    const { default: DeviceManagement } = await import('../DeviceManagement');
    render(createElement(DeviceManagement), { wrapper: createWrapper() });
    expect(screen.getByText('My iPhone')).toBeTruthy();
    expect(screen.getByText('Current')).toBeTruthy();
  });
});
