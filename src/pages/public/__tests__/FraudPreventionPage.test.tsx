import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/public/PublicShell', () => ({
  PublicShell: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'public-shell' }, children),
}));

vi.mock('@/components/public/SEOHead', () => ({
  SEOHead: () => null,
}));

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(MemoryRouter, null, children);
}

import FraudPreventionPage from '../FraudPreventionPage';

describe('FraudPreventionPage', () => {
  it('renders without crashing', () => {
    render(createElement(FraudPreventionPage), { wrapper: createWrapper() });
    expect(screen.getByText('Protect Yourself from Fraud')).toBeTruthy();
  });

  it('shows common scams section', () => {
    render(createElement(FraudPreventionPage), { wrapper: createWrapper() });
    expect(screen.getByText('Common Scams to Watch For')).toBeTruthy();
    expect(screen.getByText('Phishing Emails')).toBeTruthy();
  });

  it('shows security best practices section', () => {
    render(createElement(FraudPreventionPage), { wrapper: createWrapper() });
    expect(screen.getByText('Security Best Practices')).toBeTruthy();
    expect(screen.getByText('Use Strong Passwords')).toBeTruthy();
  });
});
