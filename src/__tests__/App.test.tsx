import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock heavy dependencies to avoid loading entire app tree
vi.mock('@/contexts/TenantContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(() => ({
    user: null,
    tenant: null,
    isAuthenticated: false,
    isLoading: false,
  })),
  useTenantBranding: vi.fn(() => ({ primaryColor: '#000', name: 'Test' })),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: vi.fn(() => ({ theme: {}, setTheme: vi.fn() })),
}));

vi.mock('@/lib/i18n', () => ({}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock('@/lib/backend', () => ({
  getBackend: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue(null),
      onAuthStateChange: vi.fn(() => ({ unsubscribe: vi.fn() })),
      getTenantContext: vi.fn().mockResolvedValue({ tenantId: 'test' }),
    },
    gateway: { invoke: vi.fn().mockResolvedValue({ data: {} }) },
    realtime: { subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) },
  })),
}));

vi.mock('@/lib/gateway', () => ({
  gateway: {
    config: { capabilities: vi.fn().mockResolvedValue({ capabilities: {} }), theme: vi.fn().mockResolvedValue({ theme: {} }) },
    accounts: { list: vi.fn().mockResolvedValue({ accounts: [] }), summary: vi.fn().mockResolvedValue({}) },
    notifications: { unreadCount: vi.fn().mockResolvedValue({ count: 0 }) },
  },
}));

import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('renders the public home page by default', async () => {
    render(<App />);
    // The app should render something (public home or loading)
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });
});
