import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/TenantContext', () => ({
  useAuth: vi.fn(() => ({
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
    isAuthenticated: false,
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

describe('Auth', () => {
  it('renders without crashing', async () => {
    const { default: Auth } = await import('../Auth');
    const { container } = render(createElement(Auth), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it('shows the Vantage branding', async () => {
    const { default: Auth } = await import('../Auth');
    render(createElement(Auth), { wrapper: createWrapper() });
    expect(screen.getByText('Vantage')).toBeTruthy();
    expect(screen.getByText('Digital Banking Platform')).toBeTruthy();
  });

  it('shows the sign in form with email and password fields', async () => {
    const { default: Auth } = await import('../Auth');
    render(createElement(Auth), { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByText('Sign in with SSO')).toBeTruthy();
  });
});
