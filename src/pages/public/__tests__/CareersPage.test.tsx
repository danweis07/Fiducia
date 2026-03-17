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

import CareersPage from '../CareersPage';

describe('CareersPage', () => {
  it('renders without crashing', () => {
    render(createElement(CareersPage), { wrapper: createWrapper() });
    expect(screen.getByText('Build Your Career With Us')).toBeTruthy();
  });

  it('shows benefits section', () => {
    render(createElement(CareersPage), { wrapper: createWrapper() });
    expect(screen.getByText('Benefits & Perks')).toBeTruthy();
  });

  it('shows open positions section', () => {
    render(createElement(CareersPage), { wrapper: createWrapper() });
    expect(screen.getByText('Open Positions')).toBeTruthy();
    expect(screen.getByText('Senior Software Engineer (Digital Banking)')).toBeTruthy();
  });
});
