import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

const mockTenant = { id: 'tenant-1', name: 'Demo CU', slug: 'demo-cu', planType: 'pro', region: 'us', features: {} };
const mockRefreshTenant = vi.fn();

vi.mock('@/contexts/TenantContext', () => ({
  useAuth: () => ({
    tenant: mockTenant,
    refreshTenant: mockRefreshTenant,
    user: null,
    session: null,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  useTenant: () => ({ tenant: mockTenant }),
}));

vi.mock('@/lib/gateway', () => ({
  gateway: {
    passwordPolicy: {
      get: vi.fn().mockResolvedValue({
        policy: {
          password: {
            minLength: 8, maxLength: 128,
            requireUppercase: true, requireLowercase: true,
            requireDigit: true, requireSpecialChar: true,
            specialChars: '!@#$%^&*()', disallowUsername: true,
            expiryDays: 0, historyCount: 0,
          },
          username: { minLength: 6, maxLength: 32, allowEmail: false },
          lockout: { maxFailedAttempts: 5, lockoutDurationMinutes: 30 },
          updatedAt: '2025-01-01T00:00:00Z',
        },
      }),
      update: vi.fn().mockResolvedValue({ policy: {} }),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('TenantSettings', () => {
  it('renders without crashing', async () => {
    const { default: TenantSettings } = await import('../TenantSettings');
    const { container } = render(createElement(TenantSettings), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the page heading', async () => {
    const { default: TenantSettings } = await import('../TenantSettings');
    render(createElement(TenantSettings), { wrapper: createWrapper() });
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('shows institution profile section', async () => {
    const { default: TenantSettings } = await import('../TenantSettings');
    render(createElement(TenantSettings), { wrapper: createWrapper() });
    expect(screen.getByText('Institution Profile')).toBeTruthy();
  });

  it('shows feature toggles section', async () => {
    const { default: TenantSettings } = await import('../TenantSettings');
    render(createElement(TenantSettings), { wrapper: createWrapper() });
    expect(screen.getByText('Feature Toggles')).toBeTruthy();
  });
});
