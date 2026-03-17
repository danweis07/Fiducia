import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/contexts/TenantContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u-1' }, isAuthenticated: true, isLoading: false, tenant: { tenantId: 't-1' } })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  useParams: vi.fn(() => ({})),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useLocations', () => ({
  useLocationSearch: vi.fn(() => ({
    data: {
      locations: [
        {
          id: 'loc-1',
          name: 'Main Branch',
          type: 'branch',
          latitude: 40.7128,
          longitude: -74.006,
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          phone: '555-0123',
          distanceMiles: 1.2,
          hours: null,
          services: ['Drive-through', 'Safe deposit'],
          isOpen: true,
          isDepositAccepting: true,
          network: null,
        },
      ],
    },
    isLoading: false,
  })),
}));

// Mock navigator.geolocation
const mockGetCurrentPosition = vi.fn();

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: mockGetCurrentPosition,
    },
    writable: true,
    configurable: true,
  });

  // Simulate a successful geolocation response
  mockGetCurrentPosition.mockImplementation((success) => {
    success({
      coords: { latitude: 40.7128, longitude: -74.006 },
    });
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FindUs page', () => {
  it('renders without crashing', async () => {
    const { default: FindUs } = await import('../FindUs');
    const { container } = render(createElement(FindUs));
    expect(container).toBeTruthy();
  });

  it('displays the page heading', async () => {
    const { default: FindUs } = await import('../FindUs');
    render(createElement(FindUs));
    expect(screen.getByText('Find ATM & Branch')).toBeTruthy();
  });

  it('shows filter buttons', async () => {
    const { default: FindUs } = await import('../FindUs');
    render(createElement(FindUs));
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('ATMs')).toBeTruthy();
    expect(screen.getByText('Branches')).toBeTruthy();
  });

  it('renders a location card', async () => {
    const { default: FindUs } = await import('../FindUs');
    render(createElement(FindUs));
    expect(screen.getByText('Main Branch')).toBeTruthy();
    expect(screen.getByText('123 Main St, New York, NY 10001')).toBeTruthy();
  });

  it('shows distance for location', async () => {
    const { default: FindUs } = await import('../FindUs');
    render(createElement(FindUs));
    expect(screen.getByText('1.2 mi')).toBeTruthy();
  });
});
